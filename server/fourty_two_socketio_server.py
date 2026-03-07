"""
FourtyTwo – Real-time multiplayer Socket.IO server.

Rooms / game flow
-----------------
waiting → bidding → trump_selection → playing → hand_complete / game_complete

Teams: players 1 & 3 (team 1) vs players 2 & 4 (team 2).
First team to reach MARKS_TO_WIN marks wins the match.
"""

import sys
import os
import uuid
import logging

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask, render_template, request
from flask_socketio import SocketIO, join_room as sio_join_room, leave_room as sio_leave_room, emit
from fourty_two_game import FourtyTwo, InvalidBidError
from domino import Domino

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# Room registry  {room_id: GameRoom}
_rooms: dict = {}

MARKS_TO_WIN = 7


# ---------------------------------------------------------------------------
# GameRoom
# ---------------------------------------------------------------------------

class GameRoom:
    """Manages a single 4-player 42 game including lobby / phase tracking."""

    def __init__(self, room_id: str):
        self.room_id = room_id
        self.game = FourtyTwo()

        # sid → {num, name}
        self.players: dict = {}
        # player_num (1-4) → sid
        self.sid_by_num: dict = {}
        # player_num → display name
        self.names: dict = {}

        self.phase = "waiting"   # waiting | bidding | trump_selection | playing | hand_complete | game_complete
        self.bid_turn = 1        # whose turn it is to bid
        self.play_turn = 1       # whose turn it is to play
        self.first_move = 1      # who leads the current trick
        self.trick_count = 0     # tricks completed this hand
        self.team1_marks = 0
        self.team2_marks = 0
        self.hand_num = 1

        # Used for broadcasting last trick result
        self.last_trick_winner: int | None = None
        self.last_trick_dominos: list = []

    # ------------------------------------------------------------------
    # Player management
    # ------------------------------------------------------------------

    def add_player(self, sid: str, name: str):
        """Return (player_num, error_string). error_string is None on success."""
        if len(self.players) >= 4:
            return None, "Room is full"
        player_num = len(self.players) + 1
        self.players[sid] = {"num": player_num, "name": name}
        self.sid_by_num[player_num] = sid
        self.names[player_num] = name
        self.game.join()
        return player_num, None

    def remove_player(self, sid: str):
        """Remove player by sid; return player_num or None."""
        if sid not in self.players:
            return None
        player_num = self.players[sid]["num"]
        del self.players[sid]
        self.sid_by_num.pop(player_num, None)
        return player_num

    def get_player_num(self, sid: str):
        info = self.players.get(sid)
        return info["num"] if info else None

    def all_players_present(self) -> bool:
        return len(self.players) == 4

    # ------------------------------------------------------------------
    # Hand lifecycle
    # ------------------------------------------------------------------

    def start_hand(self):
        """Shuffle, deal, reset hand state, enter bidding phase."""
        # Re-initialise hand-level game state without creating a new FourtyTwo
        # (team marks live outside the FourtyTwo instance)
        self.game.reset_hand()
        # Re-register all players so get_hand() works
        for num in range(1, 5):
            self.game.join()
        self.game.shuffle()

        self.phase = "bidding"
        self.bid_turn = 1
        self.trick_count = 0
        self.last_trick_winner = None
        self.last_trick_dominos = []

    # ------------------------------------------------------------------
    # State snapshot
    # ------------------------------------------------------------------

    def get_state(self, for_player: int | None = None) -> dict:
        """Return a serialisable state dict, optionally including the
        hand for *for_player* (1-4)."""
        t1, t2 = self.game.get_team_scores()

        # Build trick info (domino + which player played it)
        trick_objs = self.game.get_trick()
        trick_info = []
        for i, d in enumerate(trick_objs):
            who = (self.first_move - 1 + i) % 4 + 1
            trick_info.append({"domino": d.to_list(), "player": who})

        state: dict = {
            "room_id":       self.room_id,
            "phase":         self.phase,
            "hand_num":      self.hand_num,
            "players":       self.names,
            "num_players":   len(self.players),
            "bid_turn":      self.bid_turn,
            "play_turn":     self.play_turn,
            "first_move":    self.first_move,
            "trick_count":   self.trick_count,
            "trick":         trick_info,
            "team1_score":   t1,
            "team2_score":   t2,
            "team1_marks":   self.team1_marks,
            "team2_marks":   self.team2_marks,
            "high_bid":      self.game._high_bid,
            "high_bidder":   self.game._high_bidder,
            "high_marks":    self.game._high_marks,
            "trump":         self.game._trump,
            "last_trick_winner": self.last_trick_winner,
        }

        if for_player is not None:
            try:
                state["hand"] = [d.to_list() for d in self.game.get_hand(for_player)]
            except Exception:
                state["hand"] = []

        return state

    # ------------------------------------------------------------------
    # Scoring helpers
    # ------------------------------------------------------------------

    def finish_hand(self, sio: SocketIO):
        """Called after all 7 tricks. Awards marks, emits hand_complete."""
        t1, t2 = self.game.get_team_scores()
        high_bidder = self.game._high_bidder
        high_bid    = self.game._high_bid
        high_marks  = self.game._high_marks

        # Fallback if everyone passed
        if high_bidder is None:
            high_bidder = 1
            high_bid    = 30
            high_marks  = 1

        bid_team = 1 if high_bidder in (1, 3) else 2
        opp_team = 3 - bid_team  # 1→2, 2→1

        bid_score = t1 if bid_team == 1 else t2

        if high_bid == 0:
            # Low bid: bidding team wins if they scored no pip points
            # trick_score counts 1 per trick + pip values; with 7 tricks total,
            # a team with score == 7 has 0 pip points (wins only tricks, no count)
            made = bid_score <= 7
        elif high_bid == 42:
            # Slam bid: bidding team must win all 42 points
            made = bid_score == 42
        else:
            made = bid_score >= high_bid

        if made:
            if bid_team == 1:
                self.team1_marks += high_marks
            else:
                self.team2_marks += high_marks
        else:
            if opp_team == 1:
                self.team1_marks += high_marks
            else:
                self.team2_marks += high_marks

        game_over = (self.team1_marks >= MARKS_TO_WIN or
                     self.team2_marks >= MARKS_TO_WIN)
        self.phase = "game_complete" if game_over else "hand_complete"

        winner_team = None
        if game_over:
            winner_team = 1 if self.team1_marks >= MARKS_TO_WIN else 2

        sio.emit("hand_complete", {
            "bid_team":      bid_team,
            "high_bid":      high_bid,
            "high_marks":    high_marks,
            "made":          made,
            "team1_score":   t1,
            "team2_score":   t2,
            "team1_marks":   self.team1_marks,
            "team2_marks":   self.team2_marks,
            "game_over":     game_over,
            "winner_team":   winner_team,
            "state":         self.get_state(),
        }, room=self.room_id)


# ---------------------------------------------------------------------------
# Flask / SocketIO app factory
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

    @app.route("/health")
    def health():
        return {"ok": True, "rooms": len(_rooms)}

    @app.route("/rooms")
    def list_rooms():
        return {
            "rooms": [
                {
                    "id":          rid,
                    "players":     r.names,
                    "num_players": len(r.players),
                    "phase":       r.phase,
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
        logger.info("disconnect sid=%s", sid)
        for room_id, room in list(_rooms.items()):
            if sid in room.players:
                player_num = room.remove_player(sid)
                name = room.names.get(player_num, f"P{player_num}")
                sio.emit("player_left", {
                    "player_num": player_num,
                    "name":       name,
                    "state":      room.get_state(),
                }, room=room_id)
                if len(room.players) == 0:
                    del _rooms[room_id]
                    logger.info("room %s cleaned up (empty)", room_id)
                break

    # ---------- lobby

    @sio.on("create_room")
    def on_create_room(data):
        name = (data.get("name") or "Player").strip() or "Player"
        room_id = _unique_room_id()
        room = GameRoom(room_id)
        _rooms[room_id] = room

        player_num, err = room.add_player(request.sid, name)
        sio_join_room(room_id)
        logger.info("room %s created by %s (P%s)", room_id, name, player_num)

        emit("room_joined", {
            "room_id":    room_id,
            "player_num": player_num,
            "name":       name,
            "state":      room.get_state(player_num),
        })

    @sio.on("join_game")
    def on_join_game(data):
        name    = (data.get("name") or "Player").strip() or "Player"
        room_id = (data.get("room_id") or "").strip().upper()

        if room_id not in _rooms:
            emit("error", {"message": f"Room '{room_id}' not found"})
            return

        room = _rooms[room_id]
        if len(room.players) >= 4:
            emit("error", {"message": "Room is full"})
            return

        player_num, err = room.add_player(request.sid, name)
        if err:
            emit("error", {"message": err})
            return

        sio_join_room(room_id)
        logger.info("%s joined room %s as P%s", name, room_id, player_num)

        # Tell everyone a new player joined
        sio.emit("player_joined", {
            "player_num": player_num,
            "name":       name,
            "state":      room.get_state(),
        }, room=room_id)

        # Tell the joiner their personal state (includes hand once started)
        emit("room_joined", {
            "room_id":    room_id,
            "player_num": player_num,
            "name":       name,
            "state":      room.get_state(player_num),
        })

        # Auto-start when all 4 players are in
        if room.all_players_present():
            logger.info("room %s full – starting hand 1", room_id)
            room.start_hand()
            for pnum, psid in room.sid_by_num.items():
                sio.emit("game_started", {
                    "state": room.get_state(pnum),
                }, room=psid)

    # ---------- bidding

    @sio.on("bid")
    def on_bid(data):
        room, player_num, err = _resolve(data)
        if err:
            emit("error", {"message": err})
            return

        if room.phase != "bidding":
            emit("error", {"message": "Not in bidding phase"})
            return

        if room.bid_turn != player_num:
            emit("error", {"message": f"Not your turn to bid (it is P{room.bid_turn})"})
            return

        bid_val = data.get("bid")
        marks   = data.get("marks", 1)
        if marks is None:
            marks = 1

        try:
            room.game.bid(player_num, bid_val, marks)
        except InvalidBidError:
            emit("error", {"message": "Invalid bid"})
            return

        room.bid_turn = room.bid_turn % 4 + 1
        bids_placed   = len(room.game._bids)

        sio.emit("bid_placed", {
            "player_num":  player_num,
            "bid":         bid_val,
            "marks":       marks,
            "bid_turn":    room.bid_turn,
            "bids_placed": bids_placed,
        }, room=room.room_id)

        if bids_placed == 4:
            high_bidder = room.game._high_bidder
            high_bid    = room.game._high_bid
            high_marks  = room.game._high_marks

            # Everyone passed → dealer (P1) forced to bid 30
            if high_bidder is None:
                high_bidder = 1
                high_bid    = 30
                high_marks  = 1
                room.game._high_bidder = high_bidder
                room.game._high_bid    = high_bid
                room.game._high_marks  = high_marks

            room.phase      = "trump_selection"
            room.first_move = high_bidder
            room.play_turn  = high_bidder

            sio.emit("bidding_complete", {
                "high_bidder": high_bidder,
                "high_bid":    high_bid,
                "high_marks":  high_marks,
                "state":       room.get_state(),
            }, room=room.room_id)

    # ---------- trump selection

    @sio.on("set_trump")
    def on_set_trump(data):
        room, player_num, err = _resolve(data)
        if err:
            emit("error", {"message": err})
            return

        if room.phase != "trump_selection":
            emit("error", {"message": "Not in trump-selection phase"})
            return

        if player_num != room.game._high_bidder:
            emit("error", {"message": "Only the high bidder sets trump"})
            return

        trump = data.get("trump")
        if trump is not None and not isinstance(trump, int):
            emit("error", {"message": "Trump must be an integer 0-6 or null"})
            return
        if trump is not None and not (0 <= trump <= 6):
            emit("error", {"message": "Trump must be 0-6 or null"})
            return

        room.game.set_trump(trump)
        room.phase      = "playing"
        room.trick_count = 0

        logger.info("room %s trump=%s", room.room_id, trump)

        sio.emit("trump_set", {
            "trump":      trump,
            "first_move": room.first_move,
            "state":      room.get_state(),
        }, room=room.room_id)

        # Push personalised hand + turn info to every player
        _push_turn(room, sio)

    # ---------- playing

    @sio.on("play")
    def on_play(data):
        room, player_num, err = _resolve(data)
        if err:
            emit("error", {"message": err})
            return

        if room.phase != "playing":
            emit("error", {"message": "Not in playing phase"})
            return

        if room.play_turn != player_num:
            emit("error", {"message": f"Not your turn (it is P{room.play_turn})"})
            return

        raw = data.get("domino")
        if not isinstance(raw, (list, tuple)) or len(raw) != 2:
            emit("error", {"message": "domino must be [a, b]"})
            return

        domino  = Domino(raw)
        success = room.game.play(player_num, domino)
        if not success:
            emit("error", {"message": "That domino is not in your hand"})
            return

        # Build trick snapshot after the play
        trick_objs = room.game.get_trick()
        trick_snap = [
            {"domino": d.to_list(), "player": (room.first_move - 1 + i) % 4 + 1}
            for i, d in enumerate(trick_objs)
        ]

        sio.emit("domino_played", {
            "player_num": player_num,
            "domino":     raw,
            "trick":      trick_snap,
        }, room=room.room_id)

        if len(trick_objs) == 4:
            # ---- trick complete ----
            winner      = room.game.get_trick_winner()
            trick_score = room.game.trick_score()
            room.game.set_winner(winner)   # updates scores + clears trick

            room.last_trick_winner  = winner
            room.last_trick_dominos = [d.to_list() for d in trick_objs]
            room.trick_count       += 1
            room.first_move         = winner
            room.play_turn          = winner

            t1, t2 = room.game.get_team_scores()

            sio.emit("trick_complete", {
                "winner":       winner,
                "winner_name":  room.names.get(winner, f"P{winner}"),
                "team":         1 if winner % 2 == 1 else 2,
                "trick_score":  trick_score,
                "trick_dominos": room.last_trick_dominos,
                "team1_score":  t1,
                "team2_score":  t2,
                "team1_marks":  room.team1_marks,
                "team2_marks":  room.team2_marks,
                "trick_count":  room.trick_count,
            }, room=room.room_id)

            if room.trick_count == 7:
                room.finish_hand(sio)
            else:
                _push_turn(room, sio)
        else:
            # ---- advance within trick ----
            room.play_turn = room.play_turn % 4 + 1
            _push_turn(room, sio)

    # ---------- utilities

    @sio.on("request_state")
    def on_request_state(data):
        room_id = (data.get("room_id") or "").upper()
        if room_id not in _rooms:
            emit("error", {"message": "Room not found"})
            return
        room       = _rooms[room_id]
        player_num = room.get_player_num(request.sid)
        emit("game_state", room.get_state(player_num))

    @sio.on("new_hand")
    def on_new_hand(data):
        room_id = (data.get("room_id") or "").upper()
        if room_id not in _rooms:
            emit("error", {"message": "Room not found"})
            return
        room = _rooms[room_id]
        if room.phase not in ("hand_complete", "game_complete"):
            emit("error", {"message": "Hand is not yet complete"})
            return

        room.hand_num += 1
        room.start_hand()

        for pnum, psid in room.sid_by_num.items():
            sio.emit("game_started", {
                "state": room.get_state(pnum),
            }, room=psid)

    # ------------------------------------------------------------------ helpers

    def _resolve(data):
        """Return (room, player_num, error) tuple."""
        room_id = (data.get("room_id") or "").strip().upper()
        if room_id not in _rooms:
            return None, None, f"Room '{room_id}' not found"
        room       = _rooms[room_id]
        player_num = room.get_player_num(request.sid)
        if player_num is None:
            return None, None, "You are not in this room"
        return room, player_num, None

    def _push_turn(room: GameRoom, sio: SocketIO):
        """Emit your_turn / waiting to every player with their hand."""
        for pnum, psid in room.sid_by_num.items():
            is_your_turn = pnum == room.play_turn
            try:
                hand = [d.to_list() for d in room.game.get_hand(pnum)]
            except Exception:
                hand = []
            sio.emit("your_turn" if is_your_turn else "waiting", {
                "hand":       hand,
                "play_turn":  room.play_turn,
                "action":     "play" if is_your_turn else "wait",
            }, room=psid)

    return app, sio


def _unique_room_id() -> str:
    while True:
        rid = str(uuid.uuid4())[:6].upper()
        if rid not in _rooms:
            return rid


if __name__ == "__main__":
    app, sio = create_app()
    sio.run(app, host="0.0.0.0", port=5000, debug=True, allow_unsafe_werkzeug=True)
