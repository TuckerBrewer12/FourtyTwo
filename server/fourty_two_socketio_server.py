"""
FourtyTwo – Real-time multiplayer Socket.IO server.

Game flow per room
------------------
waiting → bidding → trump_selection → playing → hand_complete / game_complete

Teams: players 1 & 3 (team 1) vs players 2 & 4 (team 2).
Dealer rotates left (clockwise) after each hand.
Person LEFT of dealer bids first.

Scoring modes
-------------
"points_250"  – standard: first team to 250 cumulative points wins.
                If bid made:  both teams add their actual trick/count points.
                If bid fails: bid team adds 0; opponents add bid + their points.
"marks_7"     – variation: each hand awards 1 mark; first to 7 marks wins.
"""

import sys, os, uuid, logging

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask, render_template, request, redirect, url_for
from flask_socketio import SocketIO, join_room as sio_join_room, leave_room as sio_leave_room, emit
from fourty_two_game import FourtyTwo, InvalidBidError
from domino import Domino

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

_rooms: dict = {}          # room_id → GameRoom

POINTS_TO_WIN = 250
MARKS_TO_WIN  = 7
MAX_CHAT      = 60

# Short game phrases allowed in chat alongside emoji
CHAT_PHRASES = {
    "Nice Play!", "Good Bid!", "Oops!", "Let's Go!", "Lucky!", "GG!",
    "Well Done!", "So Close!", "Got'em!", "Wow!", "No way!", "Let's go!",
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _is_emoji_only(text: str) -> bool:
    """Return True if text contains only emoji characters (no letters, digits, or punctuation)."""
    text = text.strip()
    if not text:
        return False
    # Unicode ranges that are emoji or emoji-support characters
    _EMOJI_RANGES = [
        (0x00A9, 0x00A9),   # ©
        (0x00AE, 0x00AE),   # ®
        (0x203C, 0x2049),   # ‼ to ⁉
        (0x2122, 0x2122),   # ™
        (0x2139, 0x2139),   # ℹ
        (0x2194, 0x21AA),   # Arrows
        (0x231A, 0x231B),   # Watch/hourglass
        (0x2328, 0x2328),   # Keyboard
        (0x23CF, 0x23CF),
        (0x23E9, 0x23F3),
        (0x23F8, 0x23FA),
        (0x24C2, 0x24C2),
        (0x25AA, 0x25AB),
        (0x25B6, 0x25B6),
        (0x25C0, 0x25C0),
        (0x25FB, 0x25FE),
        (0x2600, 0x27BF),   # Misc symbols + dingbats
        (0x2934, 0x2935),
        (0x2B05, 0x2B07),
        (0x2B1B, 0x2B1C),
        (0x2B50, 0x2B55),
        (0x3030, 0x3030),
        (0x303D, 0x303D),
        (0x3297, 0x3297),
        (0x3299, 0x3299),
        (0x1F004, 0x1F004),
        (0x1F0CF, 0x1F0CF),
        (0x1F170, 0x1F171),
        (0x1F17E, 0x1F17F),
        (0x1F18E, 0x1F18E),
        (0x1F191, 0x1F19A),
        (0x1F1E0, 0x1F1FF),  # Regional indicators (flags)
        (0x1F201, 0x1F202),
        (0x1F21A, 0x1F21A),
        (0x1F22F, 0x1F22F),
        (0x1F232, 0x1F23A),
        (0x1F250, 0x1F251),
        (0x1F300, 0x1F9FF),  # Main emoji block
        (0x1FA00, 0x1FA6F),
        (0x1FA70, 0x1FAFF),
        (0xFE00, 0xFE0F),    # Variation selectors
        (0x200D, 0x200D),    # Zero-width joiner
        (0x20E3, 0x20E3),    # Combining enclosing keycap
    ]
    for ch in text:
        if ch == ' ':
            continue
        cp = ord(ch)
        if not any(lo <= cp <= hi for lo, hi in _EMOJI_RANGES):
            return False
    return True


def _unique_room_id() -> str:
    while True:
        rid = str(uuid.uuid4())[:6].upper()
        if rid not in _rooms:
            return rid


# ---------------------------------------------------------------------------
# GameRoom
# ---------------------------------------------------------------------------

class GameRoom:
    def __init__(self, room_id: str, game_mode: str = "points_250"):
        self.room_id   = room_id
        self.game_mode = game_mode   # "points_250" | "marks_7"
        self.game      = FourtyTwo()

        # Active players
        self.players:    dict = {}   # sid → {num, name}
        self.sid_by_num: dict = {}   # player_num(1-4) → sid
        self.names:      dict = {}   # player_num → display name

        # Spectators
        self.spectators: dict = {}   # sid → name

        self.phase       = "waiting"
        self.bid_turn    = 1
        self.play_turn   = 1
        self.first_move  = 1
        self.trick_count = 0
        self.hand_num    = 1
        self.dealer      = 1         # rotates left (clockwise) after each hand

        # Cumulative scores (250-point game)
        self.team1_total = 0
        self.team2_total = 0

        # Marks (7-mark variant)
        self.team1_marks = 0
        self.team2_marks = 0

        self.hand_history: list = []  # [{...}, ...]
        self.chat_history: list = []  # [{name, msg, ts}, ...]

        self.last_trick_winner:  int | None = None
        self.last_trick_dominos: list = []

    # ------------------------------------------------------------------
    # Player / spectator management
    # ------------------------------------------------------------------

    def add_player(self, sid: str, name: str):
        if len(self.players) >= 4:
            return None, "Room is full"
        used = {info["num"] for info in self.players.values()}
        player_num = next(n for n in range(1, 5) if n not in used)
        self.players[sid] = {"num": player_num, "name": name}
        self.sid_by_num[player_num] = sid
        self.names[player_num] = name
        self.game.join()
        return player_num, None

    def add_spectator(self, sid: str, name: str) -> int:
        self.spectators[sid] = name
        return len(self.spectators)

    def remove_player(self, sid: str):
        if sid not in self.players:
            return None
        pn = self.players[sid]["num"]
        del self.players[sid]
        self.sid_by_num.pop(pn, None)
        return pn

    def remove_spectator(self, sid: str):
        return self.spectators.pop(sid, None)

    def get_player_num(self, sid: str):
        info = self.players.get(sid)
        return info["num"] if info else None

    def is_spectator(self, sid: str) -> bool:
        return sid in self.spectators

    def all_players_present(self) -> bool:
        return len(self.players) == 4

    # ------------------------------------------------------------------
    # Hand lifecycle
    # ------------------------------------------------------------------

    def start_hand(self):
        self.game.reset_hand()
        for _ in range(4):
            self.game.join()
        self.game.shuffle()

        # Bidding starts with person left of dealer
        self.phase       = "bidding"
        self.bid_turn    = self.dealer % 4 + 1
        self.trick_count = 0
        self.last_trick_winner  = None
        self.last_trick_dominos = []

    # ------------------------------------------------------------------
    # State snapshot
    # ------------------------------------------------------------------

    def get_state(self, for_player: int | None = None, is_spectator: bool = False) -> dict:
        t1, t2       = self.game.get_team_scores()
        trick_objs   = self.game.get_trick()
        trick_info   = [
            {"domino": d.to_list(), "player": (self.first_move - 1 + i) % 4 + 1}
            for i, d in enumerate(trick_objs)
        ]

        state: dict = {
            "room_id":        self.room_id,
            "game_mode":      self.game_mode,
            "phase":          self.phase,
            "hand_num":       self.hand_num,
            "dealer":         self.dealer,
            "players":        self.names,
            "spectators":     list(self.spectators.values()),
            "num_players":    len(self.players),
            "num_spectators": len(self.spectators),
            "bid_turn":       self.bid_turn,
            "play_turn":      self.play_turn,
            "first_move":     self.first_move,
            "trick_count":    self.trick_count,
            "trick":          trick_info,
            "team1_score":    t1,         # this hand
            "team2_score":    t2,
            "team1_total":    self.team1_total,
            "team2_total":    self.team2_total,
            "team1_marks":    self.team1_marks,
            "team2_marks":    self.team2_marks,
            "high_bid":       self.game._high_bid,
            "high_bidder":    self.game._high_bidder,
            "high_marks":     self.game._high_marks,
            "trump":          self.game._trump,
            "last_trick_winner": self.last_trick_winner,
            "chat_history":   self.chat_history[-25:],
            "hand_history":   self.hand_history[-5:],
        }

        if for_player is not None:
            try:
                state["hand"] = [d.to_list() for d in self.game.get_hand(for_player)]
            except Exception:
                state["hand"] = []

        return state

    # ------------------------------------------------------------------
    # Finish hand – proper 250-point OR 7-mark scoring
    # ------------------------------------------------------------------

    def finish_hand(self, sio: SocketIO):
        t1, t2      = self.game.get_team_scores()
        high_bidder = self.game._high_bidder
        high_bid    = self.game._high_bid
        high_marks  = self.game._high_marks

        # If everyone passed → dealer is forced to bid 30
        if high_bidder is None:
            high_bidder = self.dealer % 4 + 1
            high_bid    = 30
            high_marks  = 1
            self.game.set_forced_bid(high_bidder, high_bid, high_marks)

        bid_team  = 1 if high_bidder in (1, 3) else 2
        opp_team  = 3 - bid_team
        bid_score = t1 if bid_team == 1 else t2
        opp_score = t2 if bid_team == 1 else t1

        # Was the bid made?
        if high_bid == 0:         # Low bid: win by taking ZERO count tiles
            made = bid_score <= 7
        elif high_bid == 42:      # Slam: must capture all 42 points
            made = bid_score == 42
        else:
            made = bid_score >= high_bid

        # Calculate points this hand
        if made:
            t1_gain = t1
            t2_gain = t2
        else:
            # Bidding team scores 0; opponents get bid + their actual points
            if bid_team == 1:
                t1_gain = 0
                t2_gain = high_bid + opp_score
            else:
                t2_gain = 0
                t1_gain = high_bid + opp_score

        # Update marks (both modes track marks)
        if made:
            if bid_team == 1:
                self.team1_marks += 1
            else:
                self.team2_marks += 1
        else:
            if opp_team == 1:
                self.team1_marks += 1
            else:
                self.team2_marks += 1

        # Update cumulative totals
        self.team1_total += t1_gain
        self.team2_total += t2_gain

        # Record in history
        self.hand_history.append({
            "hand_num":   self.hand_num,
            "bid_team":   bid_team,
            "high_bid":   high_bid,
            "made":       made,
            "t1_gained":  t1_gain,
            "t2_gained":  t2_gain,
            "t1_total":   self.team1_total,
            "t2_total":   self.team2_total,
        })

        # Check win condition
        if self.game_mode == "marks_7":
            game_over = (self.team1_marks >= MARKS_TO_WIN or
                         self.team2_marks >= MARKS_TO_WIN)
        else:
            game_over = (self.team1_total >= POINTS_TO_WIN or
                         self.team2_total >= POINTS_TO_WIN)

        # Rotate dealer
        self.dealer = self.dealer % 4 + 1

        self.phase = "game_complete" if game_over else "hand_complete"

        winner_team = None
        if game_over:
            if self.game_mode == "marks_7":
                winner_team = 1 if self.team1_marks >= MARKS_TO_WIN else 2
            else:
                # If both crossed 250 on the same hand → bidding team wins
                if self.team1_total >= POINTS_TO_WIN and self.team2_total >= POINTS_TO_WIN:
                    winner_team = bid_team if made else opp_team
                else:
                    winner_team = 1 if self.team1_total >= POINTS_TO_WIN else 2

        sio.emit("hand_complete", {
            "bid_team":     bid_team,
            "opp_team":     opp_team,
            "high_bid":     high_bid,
            "high_marks":   high_marks,
            "made":         made,
            "t1_this_hand": t1,
            "t2_this_hand": t2,
            "t1_gained":    t1_gain,
            "t2_gained":    t2_gain,
            "team1_total":  self.team1_total,
            "team2_total":  self.team2_total,
            "team1_marks":  self.team1_marks,
            "team2_marks":  self.team2_marks,
            "game_over":    game_over,
            "winner_team":  winner_team,
            "state":        self.get_state(),
        }, room=self.room_id)


# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------

def create_app(test_config=None):
    app = Flask(__name__, template_folder="templates")
    app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "fortytwo-secret-2025")
    if test_config:
        app.config.update(test_config)

    sio = SocketIO(app, cors_allowed_origins="*", async_mode="threading",
                   logger=False, engineio_logger=False)

    # ------------------------------------------------------------------ HTTP

    @app.route("/")
    def index():
        return render_template("index.html")

    @app.route("/join/<room_id>")
    def invite_join(room_id):
        """One-click invite URL – redirects to lobby with room pre-filled."""
        return redirect(f"/?room={room_id.upper()}")

    @app.route("/health")
    def health():
        return {"ok": True, "rooms": len(_rooms)}

    @app.route("/rooms")
    def list_rooms():
        return {
            "rooms": [
                {
                    "id":           rid,
                    "players":      r.names,
                    "num_players":  len(r.players),
                    "num_spectators": len(r.spectators),
                    "phase":        r.phase,
                    "game_mode":    r.game_mode,
                }
                for rid, r in _rooms.items()
            ]
        }

    # ------------------------------------------------------------------ Socket.IO

    @sio.on("connect")
    def on_connect():
        logger.info("connect  sid=%s", request.sid)
        emit("connected", {"sid": request.sid})

    @sio.on("disconnect")
    def on_disconnect():
        sid = request.sid
        for room_id, room in list(_rooms.items()):
            if sid in room.players:
                pnum = room.remove_player(sid)
                name = room.names.get(pnum, f"P{pnum}")
                sio.emit("player_left", {
                    "player_num": pnum, "name": name, "state": room.get_state()
                }, room=room_id)
                # If a player leaves during an active game, unfreeze remaining players
                if room.phase in ("bidding", "trump_selection", "playing"):
                    room.phase = "hand_complete"
                    sio.emit("game_abandoned", {
                        "player_num": pnum,
                        "name": name,
                        "message": f"{name} disconnected. Start a new hand when ready.",
                        "state": room.get_state(),
                    }, room=room_id)
                if not room.players and not room.spectators:
                    del _rooms[room_id]
                break
            elif sid in room.spectators:
                name = room.remove_spectator(sid)
                sio.emit("spectator_left", {"name": name, "state": room.get_state()}, room=room_id)
                break

    # ---------- lobby

    @sio.on("create_room")
    def on_create_room(data):
        name      = (data.get("name") or "Player").strip() or "Player"
        game_mode = data.get("game_mode", "points_250")
        if game_mode not in ("points_250", "marks_7"):
            game_mode = "points_250"

        room_id = _unique_room_id()
        room    = GameRoom(room_id, game_mode)
        _rooms[room_id] = room

        pnum, _ = room.add_player(request.sid, name)
        sio_join_room(room_id)
        logger.info("room %s created by %s (P%s) mode=%s", room_id, name, pnum, game_mode)

        emit("room_joined", {
            "room_id":    room_id,
            "player_num": pnum,
            "name":       name,
            "game_mode":  game_mode,
            "state":      room.get_state(pnum),
        })

    @sio.on("join_game")
    def on_join_game(data):
        name    = (data.get("name") or "Player").strip() or "Player"
        room_id = (data.get("room_id") or "").strip().upper()

        if room_id not in _rooms:
            emit("error", {"message": f"Room '{room_id}' not found. Check the code and try again."})
            return

        room = _rooms[room_id]

        if len(room.players) >= 4:
            emit("room_full", {
                "room_id":    room_id,
                "num_players": len(room.players),
                "num_spectators": len(room.spectators),
                "message":    "This room is full (4/4 players). Would you like to spectate?",
            })
            return

        pnum, err = room.add_player(request.sid, name)
        if err:
            emit("error", {"message": err})
            return

        sio_join_room(room_id)
        sio.emit("player_joined", {
            "player_num": pnum, "name": name, "state": room.get_state()
        }, room=room_id)

        emit("room_joined", {
            "room_id": room_id, "player_num": pnum, "name": name,
            "game_mode": room.game_mode, "state": room.get_state(pnum),
        })

        if room.all_players_present():
            room.start_hand()
            for p, s in room.sid_by_num.items():
                sio.emit("game_started", {"state": room.get_state(p)}, room=s)
            # notify spectators too
            for s in room.spectators:
                sio.emit("game_started", {"state": room.get_state()}, room=s)

    @sio.on("join_spectator")
    def on_join_spectator(data):
        name    = (data.get("name") or "Spectator").strip() or "Spectator"
        room_id = (data.get("room_id") or "").strip().upper()

        if room_id not in _rooms:
            emit("error", {"message": f"Room '{room_id}' not found"})
            return

        room = _rooms[room_id]
        room.add_spectator(request.sid, name)
        sio_join_room(room_id)

        sio.emit("spectator_joined", {"name": name, "state": room.get_state()}, room=room_id)
        emit("spectator_confirmed", {
            "room_id":  room_id, "name": name,
            "state":    room.get_state(is_spectator=True),
        })

    # ---------- bidding

    @sio.on("bid")
    def on_bid(data):
        room, pnum, err = _resolve(data)
        if err:
            emit("error", {"message": err}); return
        if room.phase != "bidding":
            emit("error", {"message": "Not in bidding phase"}); return
        if room.bid_turn != pnum:
            emit("error", {"message": f"Not your turn to bid (it is P{room.bid_turn})"}); return

        bid_val = data.get("bid")
        marks   = data.get("marks", 1) or 1

        try:
            room.game.bid(pnum, bid_val, marks)
        except InvalidBidError:
            emit("error", {"message": "Invalid bid – must beat the current high bid"}); return

        room.bid_turn = room.bid_turn % 4 + 1
        bids_placed   = len(room.game._bids)

        sio.emit("bid_placed", {
            "player_num":  pnum,
            "bid":         bid_val,
            "marks":       marks,
            "bid_turn":    room.bid_turn,
            "bids_placed": bids_placed,
            "high_bid":    room.game._high_bid,
            "high_bidder": room.game._high_bidder,
            "high_marks":  room.game._high_marks,
        }, room=room.room_id)

        if bids_placed == 4:
            hb, hbid, hm = room.game._high_bidder, room.game._high_bid, room.game._high_marks
            # Everyone passed → forced dealer bid 30
            if hb is None:
                hb   = room.dealer % 4 + 1
                hbid = 30
                hm   = 1
                room.game.set_forced_bid(hb, hbid, hm)

            room.phase      = "trump_selection"
            room.first_move = hb
            room.play_turn  = hb

            sio.emit("bidding_complete", {
                "high_bidder": hb, "high_bid": hbid, "high_marks": hm,
                "state": room.get_state(),
            }, room=room.room_id)

    # ---------- trump selection

    @sio.on("set_trump")
    def on_set_trump(data):
        room, pnum, err = _resolve(data)
        if err:
            emit("error", {"message": err}); return
        if room.phase != "trump_selection":
            emit("error", {"message": "Not in trump-selection phase"}); return
        if pnum != room.game._high_bidder:
            emit("error", {"message": "Only the high bidder sets trump"}); return

        trump = data.get("trump")
        if trump is not None and (not isinstance(trump, int) or not (0 <= trump <= 6)):
            emit("error", {"message": "Trump must be 0–6 or null"}); return

        room.game.set_trump(trump)
        room.phase      = "playing"
        room.trick_count = 0

        sio.emit("trump_set", {
            "trump": trump, "first_move": room.first_move, "state": room.get_state()
        }, room=room.room_id)
        _push_turn(room, sio)

    # ---------- playing

    @sio.on("play")
    def on_play(data):
        room, pnum, err = _resolve(data)
        if err:
            emit("error", {"message": err}); return
        if room.phase != "playing":
            emit("error", {"message": "Not in playing phase"}); return
        if room.play_turn != pnum:
            emit("error", {"message": f"Not your turn (it is P{room.play_turn})"}); return

        raw = data.get("domino")
        if not isinstance(raw, (list, tuple)) or len(raw) != 2:
            emit("error", {"message": "domino must be [a, b]"}); return

        domino = Domino(raw)

        # ---- Suit-following validation ----
        trick_objs = room.game.get_trick()
        if trick_objs:
            lead      = trick_objs[0]
            trump     = room.game._trump
            lead_suit = trump if (trump is not None and lead.contains(trump)) else lead.high_side(trump=trump)
            hand      = room.game.get_hand(pnum)

            if lead_suit == trump:
                # Trump was led — must follow with any trump domino
                has_suit = any(d.contains(trump) for d in hand)
                if has_suit and not domino.contains(trump):
                    emit("error", {"message": f"You must follow suit (trump: {lead_suit}s)"}); return
            else:
                # Non-trump led — only non-trump dominoes of the lead suit count
                has_suit = any(
                    d.contains(lead_suit) and (trump is None or not d.contains(trump))
                    for d in hand
                )
                played_follows = domino.contains(lead_suit) and (trump is None or not domino.contains(trump))
                if has_suit and not played_follows:
                    emit("error", {"message": f"You must follow suit ({lead_suit}s)"}); return

        success = room.game.play(pnum, domino)
        if not success:
            emit("error", {"message": "That domino is not in your hand"}); return

        trick_objs = room.game.get_trick()
        trick_snap = [
            {"domino": d.to_list(), "player": (room.first_move - 1 + i) % 4 + 1}
            for i, d in enumerate(trick_objs)
        ]

        sio.emit("domino_played", {
            "player_num": pnum, "domino": raw, "trick": trick_snap
        }, room=room.room_id)

        if len(trick_objs) == 4:
            winner      = room.game.get_trick_winner()
            trick_score = room.game.trick_score()
            room.game.set_winner(winner)

            room.last_trick_winner  = winner
            room.last_trick_dominos = [d.to_list() for d in trick_objs]
            room.trick_count       += 1
            room.first_move         = winner
            room.play_turn          = winner

            t1, t2 = room.game.get_team_scores()
            sio.emit("trick_complete", {
                "winner":        winner,
                "winner_name":   room.names.get(winner, f"P{winner}"),
                "team":          1 if winner % 2 == 1 else 2,
                "trick_score":   trick_score,
                "trick_dominos": room.last_trick_dominos,
                "team1_score":   t1,
                "team2_score":   t2,
                "team1_total":   room.team1_total,
                "team2_total":   room.team2_total,
                "trick_count":   room.trick_count,
            }, room=room.room_id)

            if room.trick_count == 7:
                room.finish_hand(sio)
            else:
                _push_turn(room, sio)
        else:
            room.play_turn = room.play_turn % 4 + 1
            _push_turn(room, sio)

    # ---------- chat (emoji only)

    @sio.on("send_chat")
    def on_send_chat(data):
        room_id = (data.get("room_id") or "").strip().upper()
        if room_id not in _rooms:
            return
        room = _rooms[room_id]
        sid  = request.sid

        # Identify sender
        is_spec   = room.is_spectator(sid)
        pnum      = room.get_player_num(sid)
        if pnum is None and not is_spec:
            return  # not in room

        msg = (data.get("message") or "").strip()
        if msg not in CHAT_PHRASES and not _is_emoji_only(msg):
            emit("error", {"message": "Chat supports emoji or quick phrases only 😊"}); return

        if pnum:
            sender = room.names.get(pnum, f"P{pnum}")
        else:
            sender = room.spectators.get(sid, "Spectator")

        entry = {"sender": sender, "msg": msg, "spectator": is_spec}
        room.chat_history.append(entry)
        if len(room.chat_history) > MAX_CHAT:
            room.chat_history = room.chat_history[-MAX_CHAT:]

        sio.emit("chat_message", entry, room=room_id)

    # ---------- utilities

    @sio.on("request_state")
    def on_request_state(data):
        room_id = (data.get("room_id") or "").upper()
        if room_id not in _rooms:
            emit("error", {"message": "Room not found"}); return
        room  = _rooms[room_id]
        pnum  = room.get_player_num(request.sid)
        is_sp = room.is_spectator(request.sid)
        emit("game_state", room.get_state(pnum, is_spectator=is_sp))

    @sio.on("new_hand")
    def on_new_hand(data):
        room_id = (data.get("room_id") or "").upper()
        if room_id not in _rooms:
            emit("error", {"message": "Room not found"}); return
        room = _rooms[room_id]
        if room.get_player_num(request.sid) is None:
            emit("error", {"message": "Only players can start a new hand"}); return
        if room.phase != "hand_complete":
            emit("error", {"message": "Hand is not yet complete"}); return

        room.hand_num += 1
        room.start_hand()

        for p, s in room.sid_by_num.items():
            sio.emit("game_started", {"state": room.get_state(p)}, room=s)
        for s in room.spectators:
            sio.emit("game_started", {"state": room.get_state()}, room=s)

    # ------------------------------------------------------------------ helpers

    def _resolve(data):
        room_id = (data.get("room_id") or "").strip().upper()
        if room_id not in _rooms:
            return None, None, f"Room '{room_id}' not found"
        room = _rooms[room_id]
        pnum = room.get_player_num(request.sid)
        if pnum is None:
            return None, None, "You are not a player in this room"
        return room, pnum, None

    def _push_turn(room: GameRoom, sio: SocketIO):
        for pnum, psid in room.sid_by_num.items():
            is_turn = pnum == room.play_turn
            try:
                hand = [d.to_list() for d in room.game.get_hand(pnum)]
            except Exception:
                hand = []
            sio.emit("your_turn" if is_turn else "waiting", {
                "hand": hand, "play_turn": room.play_turn,
                "action": "play" if is_turn else "wait",
            }, room=psid)

    return app, sio


if __name__ == "__main__":
    app, sio = create_app()
    port = int(os.environ.get("PORT", 5000))
    sio.run(app, host="0.0.0.0", port=port, debug=False, allow_unsafe_werkzeug=True)
