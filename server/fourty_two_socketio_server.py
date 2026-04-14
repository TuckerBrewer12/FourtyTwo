from __future__ import annotations
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
                Made bid: both teams add their actual trick/count points.
                Set bid:  bidding team scores 0; opponents score bid + their points.
"marks_7"     – each hand awards marks equal to the marks bid; first to 7 marks wins.

Trump
-----
0-6  = standard pip suit (e.g. trump=5 means all dominoes containing a 5 are trump)
7    = Doubles are trump (all 7 doubles form the trump suit, ranked 6-6 down to 0-0)
None = no trump (Low / Nello bid)
"""

import sys
import os
import uuid
import logging
import threading
import time
import random

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask, send_from_directory, request, make_response
from flask_socketio import SocketIO, join_room as sio_join_room, leave_room as sio_leave_room, emit
from fourty_two_game import FourtyTwo, InvalidBidError
from domino import Domino

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

_rooms: dict = {}          # room_id → GameRoom

POINTS_TO_WIN = 250
MARKS_TO_WIN  = 7
MAX_CHAT      = 80
BOT_DELAY     = 1.0        # seconds between bot moves (feels natural)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _unique_room_id() -> str:
    while True:
        rid = str(uuid.uuid4())[:6].upper()
        if rid not in _rooms:
            return rid


SUIT_NAMES = ['Blanks', 'Aces', 'Deuces', 'Threes', 'Fours', 'Fives', 'Sixes', 'Doubles']


def _compute_valid_plays(room, pnum: int) -> list:
    """Return list of [a,b] dominoes the player may legally play."""
    try:
        hand = room.game.get_hand(pnum)
    except Exception:
        return []
    trick_objs = room.game.get_trick()
    trump = room.game._trump

    if not trick_objs:        # leading — everything valid
        return [d.to_list() for d in hand]

    lead = trick_objs[0]
    # Determine lead suit
    if trump is not None and lead.contains(trump):
        lead_suit = trump
    else:
        lead_suit = lead.high_side(trump=trump)

    if lead_suit == trump:
        # Trump was led — must follow with any trump domino
        has_suit = any(d.contains(trump) for d in hand)
        if has_suit:
            return [d.to_list() for d in hand if d.contains(trump)]
    else:
        # Non-trump led — only non-trump dominoes of the lead suit count
        has_suit = any(
            d.contains(lead_suit) and (trump is None or not d.contains(trump))
            for d in hand
        )
        if has_suit:
            return [d.to_list() for d in hand
                    if d.contains(lead_suit) and (trump is None or not d.contains(trump))]

    return [d.to_list() for d in hand]


def _compute_seat_map(my_pnum: int) -> dict:
    """Return {player_num: seat} with my_pnum always sitting South."""
    seats = ['south', 'west', 'north', 'east']
    return {((my_pnum - 1 + offset) % 4) + 1: seats[offset] for offset in range(4)}


_SPECTATOR_SEAT_MAP = {1: 'north', 2: 'east', 3: 'south', 4: 'west'}


def _safe_hand_len(game, pnum: int) -> int:
    try:
        return len(game.get_hand(pnum))
    except Exception:
        return 7


def _hand_decided(room) -> bool:
    """Return True if the hand outcome is already determined before all 7 tricks are played."""
    g = room.game
    if g._high_bidder is None:
        return False
    t1, t2    = g.get_team_scores()
    high_bid  = g._high_bid
    bid_team  = 1 if g._high_bidder in (1, 3) else 2
    bid_score = t1 if bid_team == 1 else t2
    opp_score = t2 if bid_team == 1 else t1
    remaining = 42 - t1 - t2

    if high_bid == 0:    # Low: fail as soon as bid team scores a count domino (> 7 trick pts)
        return bid_score > 7
    if high_bid == 42:   # Slam: impossible the moment opponent scores any points
        return opp_score > 0
    # Normal bid (30–41): secured once bid_score reaches target, or impossible if math says so
    return bid_score >= high_bid or (bid_score + remaining) < high_bid


def _compute_available_bids(room) -> list[int]:
    """Returns the list of legally biddable values for the current bidder."""
    if not room.game or room.phase != "bidding":
        return []
    hb = room.game._high_bid
    base = hb if (hb is not None and hb > 0) else 29
    return list(range(max(30, base + 1), 43))   # 30-42 inclusive


# ---------------------------------------------------------------------------
# Bot AI
# ---------------------------------------------------------------------------

def _bot_hand_strength(hand: list, possible_trump: int) -> float:
    """Estimate how many tricks this hand will win with possible_trump as trump."""
    strength = 0.0
    for d in hand:
        if d.contains(possible_trump):
            strength += 1.0              # each trump is worth ~1 trick
            if d.nums()[0] == d.nums()[1]:
                strength += 0.3          # double trump is even stronger
        else:
            a, b = d.nums()
            if a == b:
                strength += 0.7          # non-trump double wins its suit
            elif max(a, b) >= 5:
                strength += 0.3          # high pips have a shot
    return strength


def _bot_choose_bid(room, pnum: int) -> tuple:
    """Return (bid, marks). Returns (-1, 1) to pass."""
    hand = room.game.get_hand(pnum)
    hb   = room.game._high_bid
    hm   = room.game._high_marks

    # Evaluate each trump option 0-7
    best_trump   = 0
    best_strength = 0.0
    for t in range(8):
        s = _bot_hand_strength(hand, t)
        if s > best_strength:
            best_strength = s
            best_trump = t

    # Count tiles in hand that are count tiles (pip total divisible by 5)
    count_bonus = sum(d.value() > 0 for d in hand) * 1.5

    # Add random noise so bots don't all bid identically
    estimated_pts = best_strength * 5.5 + count_bonus
    estimated_pts += random.uniform(-3, 3)

    # Only bid if best_strength >= 3.0 (need at least 3 likely tricks)
    if best_strength < 3.0:
        return (-1, 1)   # pass

    raw_bid = int(estimated_pts)

    # If best_strength >= 5.5 and hand has 4+ trumps in best suit, consider bidding 42
    trump_count = sum(1 for d in hand if d.contains(best_trump))
    if best_strength >= 5.5 and trump_count >= 4:
        return (42, 1)

    # Round to legal bid range 30-41
    bid_val = max(30, min(41, raw_bid))

    # Dealer (pnum == room.dealer) must bid minimum 30 if all pass
    if pnum == room.dealer and hb <= 0:
        return (30, 1)

    # Must beat current high bid
    if hb in (0, 42):
        return (-1, 1)   # can't beat Low/Slam with a normal bid
    if hb >= bid_val:
        return (-1, 1)   # pass

    # When partner has already bid, be more conservative (pass unless very strong)
    if hb > 0:
        partner_pnum = ((pnum - 1) ^ 2) + 1
        partner_bid_placed = any(entry["player"] == partner_pnum for entry in room.bid_log)
        if partner_bid_placed and best_strength < 4.5:
            return (-1, 1)   # pass if partner bid but we're weak

    return (bid_val, 1)


def _bot_choose_trump(room, pnum: int) -> int:
    """Choose the best trump suit for the hand (0-7)."""
    hand = room.game.get_hand(pnum)

    # Evaluate strength for each trump option
    trump_strengths = {}
    for t in range(8):
        strength = _bot_hand_strength(hand, t)
        # Give bonus for doubles trump if hand has 3+ doubles
        if t == 7:
            double_count = sum(1 for d in hand if d.nums()[0] == d.nums()[1])
            if double_count >= 3:
                strength += 1.5
        trump_strengths[t] = strength

    best_t = max(range(8), key=lambda t: trump_strengths[t])
    return best_t


def _bot_choose_play(room, pnum: int) -> list:
    """Choose the best domino for a bot to play."""
    valid = _compute_valid_plays(room, pnum)
    if not valid:
        hand = room.game.get_hand(pnum)
        return hand[0].to_list() if hand else [0, 0]

    trump = room.game._trump
    trick = room.game.get_trick()

    if not trick:
        # Leading the trick
        trump_plays = [d for d in valid if trump is not None and Domino(d).contains(trump)]
        count_plays = [d for d in valid if Domino(d).value() > 0]

        # Check if bot is the bidder
        is_bidder = (pnum == room.game._high_bidder)

        if is_bidder and trump_plays:
            # If bot IS the bidder and has trump, lead trump to pull opponents' trump out first
            return max(trump_plays, key=lambda d: Domino(d).low_side(trump=trump))

        # If NOT the bidder, avoid leading trump; prefer leading suits with doubles (guaranteed winners)
        if not is_bidder:
            double_plays = [d for d in valid if d[0] == d[1]]
            if double_plays:
                return double_plays[0]
            if count_plays:
                return max(count_plays, key=lambda d: Domino(d).value())
            return max(valid, key=lambda d: max(d[0], d[1]))

        # Bidder but no trump — prefer leading count tiles
        if count_plays:
            return max(count_plays, key=lambda d: Domino(d).value())
        # Lead highest non-trump
        return max(valid, key=lambda d: max(d[0], d[1]))

    # Following a lead — determine if partner is currently winning
    lead = trick[0]
    if trump is not None and lead.contains(trump):
        lead_suit = trump
    else:
        lead_suit = lead.high_side(trump=trump)

    # Walk through trick to find current winner offset
    # trick contains Domino objects already — do NOT re-wrap with Domino()
    winning_d = trick[0]
    win_off = 0
    for off, td in enumerate(trick[1:], 1):
        challenger = td
        if challenger.contains(trump):
            if not winning_d.contains(trump):
                winning_d = challenger; win_off = off
            elif challenger.low_side(trump=trump) > winning_d.low_side(trump=trump):
                winning_d = challenger; win_off = off
        elif lead_suit != trump and challenger.contains(lead_suit):
            if not winning_d.contains(trump):
                if challenger.low_side(lead_suit=lead_suit) > winning_d.low_side(lead_suit=lead_suit):
                    winning_d = challenger; win_off = off

    winner_pnum  = (room.first_move - 1 + win_off) % 4 + 1
    partner_pnum = ((pnum - 1) ^ 2) + 1       # 1↔3, 2↔4
    partner_winning = (winner_pnum == partner_pnum)

    if partner_winning:
        # If the trick has count (pip value > 0), dump count dominos to feed partner points
        if winning_d.value() > 0:
            count_plays = [d for d in valid if Domino(d).value() > 0]
            if count_plays:
                return min(count_plays, key=lambda d: Domino(d).value())
        # Otherwise dump the weakest domino
        return min(valid, key=lambda d: max(d[0], d[1]))
    else:
        # Trying to win — don't play the HIGHEST trump, play the LOWEST trump that still beats
        trump_plays = [d for d in valid if trump is not None and Domino(d).contains(trump)]
        if trump_plays:
            # Find the current winning trump value
            if winning_d.contains(trump):
                winning_trump_val = winning_d.low_side(trump=trump)
            else:
                winning_trump_val = -1

            # Among trump plays, find the cheapest that still wins
            winning_trumps = [d for d in trump_plays
                              if Domino(d).low_side(trump=trump) > winning_trump_val]
            if winning_trumps:
                return min(winning_trumps, key=lambda d: Domino(d).low_side(trump=trump))
            # Can't beat with trump — try to win with lead suit instead
            lead_plays  = [d for d in valid if Domino(d).contains(lead_suit)
                           and (trump is None or not Domino(d).contains(trump))]
            if lead_plays:
                return max(lead_plays, key=lambda d: Domino(d).low_side(lead_suit=lead_suit))

        # Try lead suit
        lead_plays  = [d for d in valid if Domino(d).contains(lead_suit)
                       and (trump is None or not Domino(d).contains(trump))]
        if lead_plays:
            return max(lead_plays, key=lambda d: Domino(d).low_side(lead_suit=lead_suit))

        # Can't win — dump lowest-value domino
        non_count = [d for d in valid if Domino(d).value() == 0]
        if non_count:
            return min(non_count, key=lambda d: max(d[0], d[1]))
        return min(valid, key=lambda d: Domino(d).value())


# ---------------------------------------------------------------------------
# GameRoom
# ---------------------------------------------------------------------------

class GameRoom:
    def __init__(self, room_id: str, game_mode: str = "marks_7",
                 bid_timer: int = 0, chat_mode: str = "emoji",
                 allow_spectators: bool = True, marks_target: int = 7,
                 nelo: bool = False, plunge: bool = False):
        self.room_id   = room_id
        self.game_mode = game_mode   # "points_250" | "marks_7"
        self.bid_timer = bid_timer          # 0 = no timer, 5-60 seconds
        self.chat_mode = chat_mode          # "emoji" | "text" | "off"
        self.allow_spectators = allow_spectators
        self.marks_target = marks_target    # custom marks to win (default 7)
        self.nelo = nelo                    # double marks on set
        self.plunge = plunge                # extra marks for overbidding and getting set
        self.game      = FourtyTwo()

        # Active players
        self.players:    dict = {}   # sid → {num, name}
        self.sid_by_num: dict = {}   # player_num(1-4) → sid
        self.names:      dict = {}   # player_num → display name

        # Team selection (waiting phase) — player_num → 1 or 2
        self.team_selections: dict = {}

        # Bots
        self.bots: set  = set()      # player nums that are bots

        # Spectators
        self.spectators: dict = {}   # sid → name

        self.phase       = "waiting"
        self.bid_turn    = 1
        self.play_turn   = 1
        self.first_move  = 1
        self.trick_count = 0
        self.hand_num    = 1
        self.dealer      = 1

        # Cumulative scores
        self.team1_total = 0
        self.team2_total = 0
        self.team1_marks = 0
        self.team2_marks = 0

        # Bid log for current hand [{player, bid, marks}, ...]
        self.bid_log: list = []

        self.hand_history: list = []
        self.chat_history: list = []

        self.last_trick_winner:  int | None = None
        self.last_trick_dominos: list = []

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

    def add_bot(self, bot_sid: str, name: str):
        pnum, err = self.add_player(bot_sid, name)
        if pnum:
            self.bots.add(pnum)
        return pnum, err

    def add_spectator(self, sid: str, name: str) -> int:
        self.spectators[sid] = name
        return len(self.spectators)

    def remove_player(self, sid: str):
        if sid not in self.players:
            return None
        pn = self.players[sid]["num"]
        del self.players[sid]
        self.sid_by_num.pop(pn, None)
        self.bots.discard(pn)
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

    def teams_ready(self) -> bool:
        """All 4 players present and each team has exactly 2 players."""
        if len(self.players) < 4:
            return False
        t1 = sum(1 for t in self.team_selections.values() if t == 1)
        t2 = sum(1 for t in self.team_selections.values() if t == 2)
        return t1 == 2 and t2 == 2

    # ------------------------------------------------------------------
    def start_hand(self):
        self.game.reset_hand()
        for _ in range(4):
            self.game.join()
        self.game.shuffle()

        self.phase       = "bidding"
        self.bid_turn    = self.dealer % 4 + 1
        self.trick_count = 0
        self.bid_log     = []
        self.last_trick_winner  = None
        self.last_trick_dominos = []

    # ------------------------------------------------------------------
    def get_state(self, for_player: int | None = None, is_spectator: bool = False) -> dict:
        t1, t2     = self.game.get_team_scores()
        trick_objs = self.game.get_trick()
        trick_info = [
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
            "bots":           list(self.bots),
            "spectators":     list(self.spectators.values()),
            "num_players":    len(self.players),
            "num_spectators": len(self.spectators),
            "bid_turn":       self.bid_turn,
            "play_turn":      self.play_turn,
            "first_move":     self.first_move,
            "trick_count":    self.trick_count,
            "trick":          trick_info,
            "team1_score":    t1,
            "team2_score":    t2,
            "team1_total":    self.team1_total,
            "team2_total":    self.team2_total,
            "team1_marks":    self.team1_marks,
            "team2_marks":    self.team2_marks,
            "high_bid":       self.game._high_bid,
            "high_bidder":    self.game._high_bidder,
            "high_marks":     self.game._high_marks,
            "trump":          self.game._trump,
            "bid_log":        self.bid_log,
            "last_trick_winner": self.last_trick_winner,
            "chat_history":   self.chat_history[-30:],
            "hand_history":   self.hand_history[-5:],
            "team_map":       {1: 1, 2: 2, 3: 1, 4: 2},
            "team_selections": self.team_selections,
            "tile_counts":    {p: _safe_hand_len(self.game, p) for p in range(1, 5)},
            "available_bids": _compute_available_bids(self),
            "total_tricks":   7,
            "win_target":     250 if self.game_mode == "points_250" else self.marks_target,
            "max_bid":        42,
            "settings": {
                "bid_timer": self.bid_timer,
                "chat_mode": self.chat_mode,
                "allow_spectators": self.allow_spectators,
                "marks_target": self.marks_target,
                "nelo": self.nelo,
                "plunge": self.plunge,
            },
        }

        if for_player is not None:
            try:
                state["hand"] = [d.to_list() for d in self.game.get_hand(for_player)]
            except Exception:
                state["hand"] = []

        return state

    # ------------------------------------------------------------------
    def _is_hand_decided(self):
        """Check if hand outcome is already determined — end hand early."""
        high_bid = self.game._high_bid
        high_bidder = self.game._high_bidder
        if high_bidder is None or high_bid is None or high_bid < 0:
            return False
        t1, t2 = self.game.get_team_scores()
        bid_team = 1 if high_bidder in (1, 3) else 2
        bid_score = t1 if bid_team == 1 else t2
        opp_score = t2 if bid_team == 1 else t1
        # Nello: set if bidder won any points
        if high_bid == 0:
            return bid_score > 0
        # Slam: set if opponents won any points
        if high_bid == 42:
            return opp_score > 0
        # Regular bid: set if opponents got more than (42 - bid)
        if opp_score > 42 - high_bid:
            return True
        # In marks mode, also end early if bidder already made their bid
        if self.game_mode == "marks_7" and bid_score >= high_bid:
            return True
        return False

    # ------------------------------------------------------------------
    def finish_hand(self, sio: SocketIO):
        t1, t2      = self.game.get_team_scores()
        high_bidder = self.game._high_bidder
        high_bid    = self.game._high_bid
        high_marks  = self.game._high_marks

        if high_bidder is None:    # forced dealer bid when all passed
            high_bidder = self.dealer % 4 + 1
            high_bid    = 30
            high_marks  = 1
            self.game.set_forced_bid(high_bidder, high_bid, high_marks)

        bid_team  = 1 if high_bidder in (1, 3) else 2
        opp_team  = 3 - bid_team
        bid_score = t1 if bid_team == 1 else t2
        opp_score = t2 if bid_team == 1 else t1

        # --- Was the bid made? ---
        if high_bid == 0:          # Low/Nello: must win ZERO tricks (score == 0)
            made = bid_score == 0
        elif high_bid == 42:       # Slam: must capture all 42 points
            made = bid_score == 42
        else:
            made = bid_score >= high_bid

        # --- Points gained this hand ---
        if made:
            t1_gain = t1
            t2_gain = t2
        else:
            # Set: bidding team gets 0; opponents get the bid value
            if bid_team == 1:
                t1_gain = 0
                t2_gain = high_bid
            else:
                t2_gain = 0
                t1_gain = high_bid

        # --- Marks update (both modes) ---
        # BUG FIX: award high_marks marks, not just 1
        marks_awarded = max(1, high_marks)
        # Nelo: double marks on set
        if not made and self.nelo:
            marks_awarded *= 2
        # Plunge: if bid > 30 and set, extra mark
        if not made and self.plunge and high_bid > 30:
            marks_awarded += 1
        if made:
            if bid_team == 1:
                self.team1_marks += marks_awarded
            else:
                self.team2_marks += marks_awarded
        else:
            if opp_team == 1:
                self.team1_marks += marks_awarded
            else:
                self.team2_marks += marks_awarded

        # --- Cumulative totals ---
        self.team1_total += t1_gain
        self.team2_total += t2_gain

        # --- History ---
        self.hand_history.append({
            "hand_num":  self.hand_num,
            "bid_team":  bid_team,
            "high_bid":  high_bid,
            "high_marks": high_marks,
            "made":      made,
            "t1_gained": t1_gain,
            "t2_gained": t2_gain,
            "t1_total":  self.team1_total,
            "t2_total":  self.team2_total,
        })

        # --- Win check ---
        if self.game_mode == "marks_7":
            game_over = (self.team1_marks >= self.marks_target or
                         self.team2_marks >= self.marks_target)
        else:
            game_over = (self.team1_total >= POINTS_TO_WIN or
                         self.team2_total >= POINTS_TO_WIN)

        self.dealer = self.dealer % 4 + 1
        winner_team = bid_team if made else opp_team
        self.phase  = "game_complete" if game_over else "hand_complete"

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
    app = Flask(
        __name__,
        static_folder="static",
        static_url_path="",
    )
    app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "fortytwo-secret-2025")
    app.config["TEMPLATES_AUTO_RELOAD"] = True
    if test_config:
        app.config.update(test_config)

    sio = SocketIO(app, cors_allowed_origins="*", async_mode="threading",
                   logger=False, engineio_logger=False)

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

    def _push_turn(room: GameRoom):
        for pnum, psid in room.sid_by_num.items():
            is_turn = pnum == room.play_turn
            try:
                hand = [d.to_list() for d in room.game.get_hand(pnum)]
            except Exception:
                hand = []
            payload = {
                "hand":        hand,
                "play_turn":   room.play_turn,
                "action":      "play" if is_turn else "wait",
                "seat_map":    _compute_seat_map(pnum),
                "valid_plays": _compute_valid_plays(room, pnum) if is_turn else [],
            }
            sio.emit("your_turn" if is_turn else "waiting", payload, room=psid)

    # ---- Bot orchestration -----------------------------------------------

    def _schedule_bot(room_id: str, delay: float = BOT_DELAY):
        """Schedule _run_bot_action after delay seconds."""
        t = threading.Timer(delay, _run_bot_action, args=[room_id])
        t.daemon = True
        t.start()

    def _run_bot_action(room_id: str):
        try:
            _run_bot_action_inner(room_id)
        except Exception as exc:
            logger.exception("Bot action crashed in room %s: %s", room_id, exc)
            # Attempt recovery: reschedule if it's still a bot's turn
            if room_id in _rooms:
                room = _rooms[room_id]
                if room.phase == "playing" and room.play_turn in room.bots:
                    _schedule_bot(room_id, delay=2.0)
                elif room.phase == "bidding" and room.bid_turn in room.bots:
                    _schedule_bot(room_id, delay=2.0)
                elif room.phase == "trump_selection" and room.game._high_bidder in room.bots:
                    _schedule_bot(room_id, delay=2.0)

    def _run_bot_action_inner(room_id: str):
        if room_id not in _rooms:
            return
        room = _rooms[room_id]

        if room.phase == "bidding":
            pnum = room.bid_turn
            if pnum not in room.bots:
                return
            bid_val, marks = _bot_choose_bid(room, pnum)
            try:
                room.game.bid(pnum, bid_val, marks)
            except InvalidBidError:
                bid_val, marks = -1, 1
                room.game.bid(pnum, -1, 1)

            bid_str = "passed" if bid_val == -1 else f"bid {bid_val}"
            room.bid_log.append({"player": pnum, "name": room.names.get(pnum, f"P{pnum}"),
                                  "bid": bid_val, "marks": marks})
            room.bid_turn = room.bid_turn % 4 + 1
            bids_placed = len(room.game._bids)

            sio.emit("bid_placed", {
                "player_num": pnum, "bid": bid_val, "marks": marks,
                "bid_turn": room.bid_turn, "bids_placed": bids_placed,
                "high_bid": room.game._high_bid,
                "high_bidder": room.game._high_bidder,
                "high_marks": room.game._high_marks,
                "available_bids": _compute_available_bids(room),
                "bid_log": room.bid_log,
            }, room=room_id)

            if bids_placed == 4:
                _complete_bidding(room)
            elif room.bid_turn in room.bots:
                _schedule_bot(room_id)

        elif room.phase == "trump_selection":
            pnum = room.game._high_bidder
            if pnum not in room.bots:
                return
            trump = _bot_choose_trump(room, pnum)
            room.game.set_trump(trump)
            room.phase = "playing"
            room.trick_count = 0
            sio.emit("trump_set", {
                "trump": trump, "first_move": room.first_move,
                "state": room.get_state(),
            }, room=room_id)
            _push_turn(room)
            if room.play_turn in room.bots:
                _schedule_bot(room_id)

        elif room.phase == "playing":
            pnum = room.play_turn
            if pnum not in room.bots:
                return
            raw = _bot_choose_play(room, pnum)
            domino = Domino(raw)
            success = room.game.play(pnum, domino)
            if not success:
                return

            trick_objs = room.game.get_trick()
            trick_snap = [
                {"domino": d.to_list(), "player": (room.first_move - 1 + i) % 4 + 1}
                for i, d in enumerate(trick_objs)
            ]
            sio.emit("domino_played", {
                "player_num": pnum, "domino": raw, "trick": trick_snap,
            }, room=room_id)

            if len(trick_objs) == 4:
                winner      = room.game.get_trick_winner()
                trick_score = room.game.trick_score()
                room.game.set_winner(winner)
                room.last_trick_winner  = winner
                room.last_trick_dominos = [d.to_list() for d in trick_objs]
                room.trick_count += 1
                room.first_move  = winner
                room.play_turn   = winner
                t1, t2 = room.game.get_team_scores()
                sio.emit("trick_complete", {
                    "winner": winner,
                    "winner_name": room.names.get(winner, f"P{winner}"),
                    "team": 1 if winner % 2 == 1 else 2,
                    "trick_score": trick_score,
                    "trick_dominos": room.last_trick_dominos,
                    "team1_score": t1, "team2_score": t2,
                    "team1_total": room.team1_total,
                    "team2_total": room.team2_total,
                    "trick_count": room.trick_count,
                }, room=room_id)
                if room.trick_count == 7 or room._is_hand_decided():
                    room.finish_hand(sio)
                else:
                    _push_turn(room)
                    if room.play_turn in room.bots:
                        _schedule_bot(room_id, delay=1.2)
            else:
                room.play_turn = room.play_turn % 4 + 1
                _push_turn(room)
                if room.play_turn in room.bots:
                    _schedule_bot(room_id)

    def _complete_bidding(room: GameRoom):
        hb  = room.game._high_bidder
        hbid = room.game._high_bid
        hm  = room.game._high_marks

        if hb is None:          # all passed → reshuffle and redeal
            room.hand_num += 1
            room.start_hand()
            sio.emit("reshuffle", {
                "message": "Everyone passed — reshuffling!",
                "state": room.get_state(),
            }, room=room.room_id)
            for p, s in room.sid_by_num.items():
                if s.startswith("bot-"):
                    continue
                sio.emit("game_started", {
                    "state": room.get_state(p),
                    "seat_map": _compute_seat_map(p),
                }, room=s)
            for s in room.spectators:
                sio.emit("game_started", {
                    "state": room.get_state(),
                    "seat_map": _SPECTATOR_SEAT_MAP,
                }, room=s)
            if room.bid_turn in room.bots:
                _schedule_bot(room.room_id)
            return

        room.first_move = hb
        room.play_turn  = hb

        if hbid == 0:           # Low bid — no trump
            room.phase = "playing"
            room.trick_count = 0
            room.game.set_trump(None)
            sio.emit("bidding_complete", {
                "high_bidder": hb, "high_bid": hbid, "high_marks": hm,
                "state": room.get_state(),
            }, room=room.room_id)
            sio.emit("trump_set", {
                "trump": None, "first_move": room.first_move,
                "state": room.get_state(),
            }, room=room.room_id)
            _push_turn(room)
            if room.play_turn in room.bots:
                _schedule_bot(room.room_id)
        else:
            room.phase = "trump_selection"
            sio.emit("bidding_complete", {
                "high_bidder": hb, "high_bid": hbid, "high_marks": hm,
                "state": room.get_state(),
            }, room=room.room_id)
            if hb in room.bots:
                _schedule_bot(room.room_id)

    # Helper: rearrange player numbers by team choice, then start the hand
    def _finalize_and_start(room_id: str, room: GameRoom, _sio):
        """Reassign player numbers so team1→{1,3}, team2→{2,4}, then start."""
        t1 = [pnum for pnum, t in room.team_selections.items() if t == 1]
        t2 = [pnum for pnum, t in room.team_selections.items() if t == 2]
        new_assignment = {t1[0]: 1, t2[0]: 2, t1[1]: 3, t2[1]: 4}

        old_sid_by_num = dict(room.sid_by_num)
        old_names      = dict(room.names)
        old_bots       = set(room.bots)

        room.players        = {}
        room.sid_by_num     = {}
        room.names          = {}
        room.bots           = set()
        room.team_selections = {}

        for old_pnum, new_pnum in new_assignment.items():
            sid  = old_sid_by_num[old_pnum]
            name = old_names[old_pnum]
            room.players[sid]       = {"num": new_pnum, "name": name}
            room.sid_by_num[new_pnum] = sid
            room.names[new_pnum]    = name
            if old_pnum in old_bots:
                room.bots.add(new_pnum)

        room.start_hand()
        for p, s in room.sid_by_num.items():
            if s.startswith("bot-"):
                continue
            _sio.emit("game_started", {
                "player_num": p,
                "state": room.get_state(p),
                "seat_map": _compute_seat_map(p),
            }, room=s)
        for s in room.spectators:
            _sio.emit("game_started", {
                "state": room.get_state(),
                "seat_map": _SPECTATOR_SEAT_MAP,
            }, room=s)
        if room.bid_turn in room.bots:
            _schedule_bot(room_id)

    # Helper to fill bots and start game
    def _fill_bots_for_room(room_id: str, room: GameRoom):
        """Fill empty seats with bots, auto-assign all to teams, then start."""
        bot_names = ["Bot-Alpha", "Bot-Beta", "Bot-Gamma"]
        added = []
        bi = 0
        while len(room.players) < 4 and bi < len(bot_names):
            bot_sid = f"bot-{room_id}-{bi}"
            pnum, err = room.add_bot(bot_sid, bot_names[bi])
            if err:
                break
            added.append({"num": pnum, "name": bot_names[bi]})
            sio.emit("player_joined", {
                "player_num": pnum, "name": bot_names[bi],
                "state": room.get_state(),
            }, room=room_id)
            bi += 1

        if room.all_players_present():
            # Auto-assign all unselected players (bots + any humans without a pick)
            all_pnums = sorted(room.sid_by_num.keys())
            for pnum in all_pnums:
                if pnum not in room.team_selections:
                    t1 = sum(1 for t in room.team_selections.values() if t == 1)
                    t2 = sum(1 for t in room.team_selections.values() if t == 2)
                    room.team_selections[pnum] = 1 if t1 <= t2 else 2
            _finalize_and_start(room_id, room, sio)

        return added

    # ------------------------------------------------------------------ HTTP

    @app.route("/")
    @app.route("/join/<room_id>")
    def index(**_):
        resp = make_response(send_from_directory(app.static_folder, "index.html"))
        resp.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        resp.headers["Pragma"] = "no-cache"
        resp.headers["Expires"] = "0"
        return resp

    @app.route("/api/fill-bots/<room_id>")
    def fill_bots(room_id):
        """Fill empty seats with bots and start the game."""
        room_id = room_id.strip().upper()
        if room_id not in _rooms:
            return {"ok": False, "error": "Room not found"}, 404
        room = _rooms[room_id]
        if room.phase != "waiting":
            return {"ok": False, "error": "Game already started"}, 400

        added = _fill_bots_for_room(room_id, room)
        return {"ok": True, "added": added, "total": len(room.players)}

    @app.route("/health")
    def health():
        return {"ok": True, "rooms": len(_rooms)}

    @app.route("/rooms")
    def list_rooms():
        return {
            "rooms": [
                {
                    "id": rid, "players": r.names,
                    "num_players": len(r.players),
                    "num_spectators": len(r.spectators),
                    "phase": r.phase, "game_mode": r.game_mode,
                    "bots": list(r.bots),
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
                if room.phase in ("bidding", "trump_selection", "playing"):
                    room.phase = "hand_complete"
                    sio.emit("game_abandoned", {
                        "player_num": pnum, "name": name,
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
        game_mode = data.get("game_mode", "marks_7")
        if game_mode not in ("points_250", "marks_7"):
            game_mode = "marks_7"

        bid_timer = data.get("bid_timer", 0)
        if not isinstance(bid_timer, int) or bid_timer < 0 or bid_timer > 60:
            bid_timer = 0
        if bid_timer > 0 and bid_timer < 5:
            bid_timer = 5

        chat_mode = data.get("chat_mode", "emoji")
        if chat_mode not in ("emoji", "text", "off"):
            chat_mode = "emoji"

        allow_spectators = bool(data.get("allow_spectators", True))
        marks_target = data.get("marks_target", 7)
        if not isinstance(marks_target, int) or marks_target < 1 or marks_target > 21:
            marks_target = 7

        nelo = bool(data.get("nelo", False))
        plunge = bool(data.get("plunge", False))

        room_id = _unique_room_id()
        room    = GameRoom(room_id, game_mode, bid_timer=bid_timer, chat_mode=chat_mode,
                           allow_spectators=allow_spectators, marks_target=marks_target,
                           nelo=nelo, plunge=plunge)
        _rooms[room_id] = room

        pnum, _ = room.add_player(request.sid, name)
        sio_join_room(room_id)
        logger.info("room %s created by %s (P%s) mode=%s", room_id, name, pnum, game_mode)

        emit("room_joined", {
            "room_id": room_id, "player_num": pnum, "name": name,
            "game_mode": game_mode, "state": room.get_state(pnum),
            "settings": {
                "bid_timer": bid_timer,
                "chat_mode": chat_mode,
                "allow_spectators": allow_spectators,
                "marks_target": marks_target,
                "nelo": nelo,
                "plunge": plunge,
            },
        })

    @sio.on("quick_play")
    def on_quick_play(data):
        """Create a room and immediately fill it with 3 bots."""
        name = (data.get("name") or "Player").strip() or "Player"
        game_mode = data.get("game_mode", "marks_7")
        if game_mode not in ("points_250", "marks_7"):
            game_mode = "marks_7"

        room_id = _unique_room_id()
        room = GameRoom(room_id, game_mode)
        _rooms[room_id] = room

        pnum, _ = room.add_player(request.sid, name)
        sio_join_room(room_id)
        logger.info("quick_play room %s created by %s (P%s) mode=%s", room_id, name, pnum, game_mode)

        emit("room_joined", {
            "room_id": room_id, "player_num": pnum, "name": name,
            "game_mode": game_mode, "state": room.get_state(pnum),
            "settings": {
                "bid_timer": 0, "chat_mode": "emoji",
                "allow_spectators": True, "marks_target": 7,
                "nelo": False, "plunge": False,
            },
        })

        # Auto-fill with bots
        _fill_bots_for_room(room_id, room)

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
                "room_id": room_id, "num_players": len(room.players),
                "num_spectators": len(room.spectators),
                "message": "This room is full (4/4 players). Would you like to spectate?",
            })
            return

        pnum, err = room.add_player(request.sid, name)
        if err:
            emit("error", {"message": err}); return

        sio_join_room(room_id)
        sio.emit("player_joined", {
            "player_num": pnum, "name": name, "state": room.get_state()
        }, room=room_id)

        emit("room_joined", {
            "room_id": room_id, "player_num": pnum, "name": name,
            "game_mode": room.game_mode, "state": room.get_state(pnum),
        })

        # Game starts only once all 4 players have chosen teams (handled by choose_team event)

    @sio.on("choose_team")
    def on_choose_team(data):
        room_id = (data.get("room_id") or "").strip().upper()
        team    = data.get("team")

        if room_id not in _rooms:
            emit("error", {"message": "Room not found"}); return
        room = _rooms[room_id]

        pnum = room.get_player_num(request.sid)
        if pnum is None:
            emit("error", {"message": "Not in this room"}); return
        if team not in (1, 2):
            emit("error", {"message": "Invalid team"}); return

        # Toggle: clicking your current team removes you from it
        if room.team_selections.get(pnum) == team:
            del room.team_selections[pnum]
        else:
            # Check capacity
            count = sum(1 for t in room.team_selections.values() if t == team)
            if count >= 2:
                emit("error", {"message": f"Team {team} is full"}); return
            room.team_selections[pnum] = team

        sio.emit("team_updated", {
            "team_selections": room.team_selections,
            "state": room.get_state(),
        }, room=room_id)

        if room.teams_ready():
            _finalize_and_start(room_id, room, sio)

    @sio.on("join_spectator")
    def on_join_spectator(data):
        name    = (data.get("name") or "Spectator").strip() or "Spectator"
        room_id = (data.get("room_id") or "").strip().upper()

        if room_id not in _rooms:
            emit("error", {"message": f"Room '{room_id}' not found"}); return

        room = _rooms[room_id]
        if not room.allow_spectators:
            emit("error", {"message": "Spectators not allowed in this room"})
            return

        room.add_spectator(request.sid, name)
        sio_join_room(room_id)

        sio.emit("spectator_joined", {"name": name, "state": room.get_state()}, room=room_id)
        emit("spectator_confirmed", {
            "room_id": room_id, "name": name,
            "state": room.get_state(is_spectator=True),
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
        marks   = int(data.get("marks", 1) or 1)

        try:
            room.game.bid(pnum, bid_val, marks)
        except InvalidBidError:
            emit("error", {"message": "Invalid bid — must beat the current high bid"}); return

        room.bid_log.append({
            "player": pnum, "name": room.names.get(pnum, f"P{pnum}"),
            "bid": bid_val, "marks": marks,
        })
        room.bid_turn = room.bid_turn % 4 + 1
        bids_placed   = len(room.game._bids)

        sio.emit("bid_placed", {
            "player_num": pnum, "bid": bid_val, "marks": marks,
            "bid_turn": room.bid_turn, "bids_placed": bids_placed,
            "high_bid": room.game._high_bid,
            "high_bidder": room.game._high_bidder,
            "high_marks": room.game._high_marks,
            "available_bids": _compute_available_bids(room),
            "bid_log": room.bid_log,
        }, room=room.room_id)

        if bids_placed == 4:
            _complete_bidding(room)
        elif room.bid_turn in room.bots:
            _schedule_bot(room.room_id)
        else:
            # Open bid modal for next human player
            next_sid = room.sid_by_num.get(room.bid_turn)
            if next_sid:
                sio.emit("your_bid_turn", {
                    "bid_turn": room.bid_turn,
                    "available_bids": _compute_available_bids(room),
                    "high_bid": room.game._high_bid,
                    "high_marks": room.game._high_marks,
                }, room=next_sid)

    # ---------- trump

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
        # Accept 0-7 (7 = doubles trump) or None (low bid, but that's handled in bidding)
        if trump is not None and (not isinstance(trump, int) or not (0 <= trump <= 7)):
            emit("error", {"message": "Trump must be 0–7 (7=Doubles) or null"}); return

        room.game.set_trump(trump)
        room.phase       = "playing"
        room.trick_count = 0

        sio.emit("trump_set", {
            "trump": trump, "first_move": room.first_move,
            "state": room.get_state(),
        }, room=room.room_id)
        _push_turn(room)
        if room.play_turn in room.bots:
            _schedule_bot(room.room_id)

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

        # Suit-following validation
        trick_objs = room.game.get_trick()
        if trick_objs:
            lead  = trick_objs[0]
            trump = room.game._trump
            if trump is not None and lead.contains(trump):
                lead_suit = trump
            else:
                lead_suit = lead.high_side(trump=trump)
            hand = room.game.get_hand(pnum)

            if lead_suit == trump:
                has_suit = any(d.contains(trump) for d in hand)
                if has_suit and not domino.contains(trump):
                    suit_name = SUIT_NAMES[trump] if 0 <= trump <= 7 else str(trump)
                    emit("error", {"message": f"Must follow trump ({suit_name})"}); return
            else:
                has_suit = any(
                    d.contains(lead_suit) and (trump is None or not d.contains(trump))
                    for d in hand
                )
                played_follows = (domino.contains(lead_suit) and
                                  (trump is None or not domino.contains(trump)))
                if has_suit and not played_follows:
                    emit("error", {"message": f"Must follow suit ({lead_suit}s)"}); return

        success = room.game.play(pnum, domino)
        if not success:
            emit("error", {"message": "That domino is not in your hand"}); return

        trick_objs = room.game.get_trick()
        trick_snap = [
            {"domino": d.to_list(), "player": (room.first_move - 1 + i) % 4 + 1}
            for i, d in enumerate(trick_objs)
        ]

        sio.emit("domino_played", {
            "player_num": pnum, "domino": raw, "trick": trick_snap,
        }, room=room.room_id)

        if len(trick_objs) == 4:
            winner      = room.game.get_trick_winner()
            trick_score = room.game.trick_score()
            room.game.set_winner(winner)
            room.last_trick_winner  = winner
            room.last_trick_dominos = [d.to_list() for d in trick_objs]
            room.trick_count += 1
            room.first_move  = winner
            room.play_turn   = winner
            t1, t2 = room.game.get_team_scores()
            sio.emit("trick_complete", {
                "winner": winner,
                "winner_name": room.names.get(winner, f"P{winner}"),
                "team": 1 if winner % 2 == 1 else 2,
                "trick_score": trick_score,
                "trick_dominos": room.last_trick_dominos,
                "team1_score": t1, "team2_score": t2,
                "team1_total": room.team1_total,
                "team2_total": room.team2_total,
                "trick_count": room.trick_count,
            }, room=room.room_id)

            if room.trick_count == 7 or _hand_decided(room):
                room.finish_hand(sio)
            else:
                _push_turn(room)
                if room.play_turn in room.bots:
                    _schedule_bot(room.room_id, delay=1.2)
        else:
            room.play_turn = room.play_turn % 4 + 1
            _push_turn(room)
            if room.play_turn in room.bots:
                _schedule_bot(room.room_id)

    # ---------- chat (open text, max 200 chars)

    @sio.on("send_chat")
    def on_send_chat(data):
        room_id = (data.get("room_id") or "").strip().upper()
        if room_id not in _rooms:
            return
        room = _rooms[room_id]

        # Chat mode check
        if room.chat_mode == "off":
            return

        sid  = request.sid
        is_spec = room.is_spectator(sid)
        pnum    = room.get_player_num(sid)
        if pnum is None and not is_spec:
            return

        msg = (data.get("message") or "").strip()[:200]
        if not msg:
            return

        # Emoji mode: reject if message is too long (emoji-only should be short)
        if room.chat_mode == "emoji" and len(msg) > 20:
            return

        sender = room.names.get(pnum, f"P{pnum}") if pnum else room.spectators.get(sid, "Spectator")
        entry  = {"sender": sender, "msg": msg, "spectator": is_spec, "player_num": pnum}
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
        if room.phase not in ("hand_complete", "game_complete"):
            emit("error", {"message": "Hand is not yet complete"}); return

        if room.phase == "game_complete":
            room.team1_total = 0
            room.team2_total = 0
            room.team1_marks = 0
            room.team2_marks = 0
            room.hand_num    = 0
            room.hand_history = []

        room.hand_num += 1
        room.start_hand()

        for p, s in room.sid_by_num.items():
            sio.emit("game_started", {
                "state": room.get_state(p),
                "seat_map": _compute_seat_map(p),
            }, room=s)
        for s in room.spectators:
            sio.emit("game_started", {
                "state": room.get_state(),
                "seat_map": _SPECTATOR_SEAT_MAP,
            }, room=s)
        if room.bid_turn in room.bots:
            _schedule_bot(room_id)

    return app, sio


if __name__ == "__main__":
    app, sio = create_app()
    port = int(os.environ.get("PORT", 8000))
    sio.run(app, host="0.0.0.0", port=port, debug=False, allow_unsafe_werkzeug=True)
