from domino import Domino
from domino_set import DominoesSet
from player import Player, InvalidMoveError
import random


class InvalidBidError(Exception):
    pass


class FourtyTwo:
    """Core game engine for one hand of 42 (Texas Dominoes).

    Supports trump values 0-6 (pip suit) and 7 (Doubles-as-trump).
    """

    def __init__(self):
        self._trump = None
        self._trick: list[Domino] = []
        self._first_move = 1
        self._winner = 1

        self._join_calls = 0

        self.domino_set = DominoesSet()
        self.player_hands: list[list[Domino]] = [[], [], [], []]

        self._bids: dict[int, tuple[int, int]] = {}   # player -> (bid, marks)
        self._high_bid = -1
        self._high_bidder = None
        self._high_marks = 1

        self._players = [Player(1), Player(2), Player(3), Player(4)]

        self._team1_score = 0
        self._team2_score = 0

    # ------------------------------------------------------------------
    # Setup
    # ------------------------------------------------------------------

    def shuffle(self) -> None:
        self.domino_set.shuffle()
        self._deal_dominoes()

    def _deal_dominoes(self) -> None:
        self.player_hands = self.domino_set.get_hands()
        for i, p in enumerate(self._players):
            p.set_hand(self.player_hands[i])

    # ------------------------------------------------------------------
    # Joining
    # ------------------------------------------------------------------

    def join(self) -> int:
        self._join_calls += 1
        return self._join_calls

    def num_players(self) -> int:
        return self._join_calls

    # ------------------------------------------------------------------
    # Bidding
    # ------------------------------------------------------------------

    def num_bids(self) -> int:
        return len(self._bids)

    def bid(self, player: int, bid: int, marks: int = 1) -> None:
        """Place a bid; raises InvalidBidError if the bid is illegal."""
        if not self.check_bid(player, bid, marks):
            raise InvalidBidError(f"Invalid bid {bid} by P{player} (high={self._high_bid})")
        self._bids[player] = (bid, marks)

    def check_bid(self, player: int, bid: int, marks: int) -> bool:
        """Return True iff this bid is legal given the current high bid.

        bid == -1  → pass (always legal once per player)
        bid 30-41  → standard bid; must exceed current high bid (marks must be 1)
        bid == 42  → slam; same point-value as 42 but declared distinctly
        bid == 0   → "Low" / Nello; must win zero tricks; marks can be >= 1
        bid == 7   → (reserved — same as Low but with 7 marks; handled via marks arg)

        For Low (0) and Slam (42) bids, the player can optionally raise the marks.
        To beat a previous Low/Slam bid, the marks must be strictly higher.
        """
        # Pass is always valid (turn enforcement is in the server)
        if bid == -1:
            return True

        hb = self._high_bid
        hm = self._high_marks

        if bid in (0, 42):
            # Low or Slam bid
            if marks < 1:
                return False
            if hb in (0, 42):
                # Previous high is also Low/Slam — must raise marks
                if marks <= hm:
                    return False
                if marks > hm + 1:
                    return False   # can only raise by 1 mark at a time
                self.set_high_bid(player, bid, marks)
                return True
            else:
                # Previous high is a normal bid (or no bid) — Low/Slam always beats it
                # unless marks jump is too large
                if marks > hm + 1:
                    return False
                self.set_high_bid(player, bid, marks)
                return True

        else:
            # Normal bid (30-41)
            if marks != 1:
                return False
            if bid < 30 or bid > 41:
                return False
            if hb in (0, 42):
                # Can't beat a Low/Slam with a normal bid
                return False
            if bid <= hb:
                return False
            self.set_high_bid(player, bid, marks)
            return True

    def set_high_bid(self, player: int, bid: int, marks: int) -> None:
        self._high_bidder = player
        self._high_bid = bid
        self._high_marks = marks

    def get_high_bid(self) -> tuple:
        return (self._high_bidder, self._high_bid, self._high_marks)

    def set_forced_bid(self, player: int, bid: int, marks: int = 1) -> None:
        """Set the winning bid directly (dealer forced bid when all pass)."""
        self._high_bidder = player
        self._high_bid = bid
        self._high_marks = marks

    # ------------------------------------------------------------------
    # Trump
    # ------------------------------------------------------------------

    def set_trump(self, trump) -> None:
        """Set trump. 0-6 = pip suit; 7 = doubles; None = no trump (Low bid)."""
        self._trump = trump

    # ------------------------------------------------------------------
    # Playing
    # ------------------------------------------------------------------

    def get_hand(self, player: int) -> list:
        return self._players[player - 1].hand()

    def play(self, player: int, domino: Domino) -> bool:
        if len(self._trick) == 0:
            self._first_move = player
        try:
            self._players[player - 1].move(domino)
        except InvalidMoveError:
            return False
        self._trick.append(domino)
        return True

    def get_trick(self) -> list:
        return self._trick

    def _set_trick(self, trick: list, first_move: int = None) -> None:
        self._trick = trick
        if first_move is not None:
            self._first_move = first_move

    def set_first_move(self, first_move: int) -> None:
        self._first_move = first_move

    # ------------------------------------------------------------------
    # Scoring
    # ------------------------------------------------------------------

    def trick_score(self) -> int:
        """1 trick point + count-tile pip values."""
        score = 1
        for domino in self._trick:
            score += domino.value()
        return score

    def get_trick_winner(self, trick: list = None, first_move: int = None) -> int:
        """Return the player number (1-4) who wins the current trick.

        Rules (standard Texas 42):
        - Trump wins over everything. Within trump, doubles > highest non-trump pip.
        - If no trump played, lead-suit wins. Within lead suit, doubles > highest secondary pip.
        - Off-suit dominoes cannot win.
        """
        if trick is not None:
            self._trick = trick
        if first_move is not None:
            self._first_move = first_move

        if not self._trick:
            return 0

        # Determine lead suit
        lead = self._trick[0]
        trump = self._trump
        if lead.contains(trump):
            lead_suit = trump           # could be 7 (doubles) or 0-6
        else:
            lead_suit = lead.high_side(trump=trump)

        winning_domino = lead
        winner_offset = 0              # offset from first_move (0-indexed)

        for offset, domino in enumerate(self._trick[1:], start=1):
            if domino.contains(trump):
                # Challenger is trump
                if winning_domino.contains(trump):
                    # Both trump — compare rank within trump suit
                    if domino.low_side(trump=trump) > winning_domino.low_side(trump=trump):
                        winning_domino = domino
                        winner_offset = offset
                else:
                    # Challenger trump beats non-trump leader
                    winning_domino = domino
                    winner_offset = offset

            elif lead_suit != trump and domino.contains(lead_suit):
                # Challenger follows non-trump lead suit
                if not winning_domino.contains(trump):
                    # Compare within lead suit (doubles have rank 7 > any pip)
                    if domino.low_side(lead_suit=lead_suit) > winning_domino.low_side(lead_suit=lead_suit):
                        winning_domino = domino
                        winner_offset = offset
                # else: trump is already winning, non-trump can't beat it

            # else: off-suit — cannot win

        return (self._first_move - 1 + winner_offset) % 4 + 1

    def set_winner(self, winner: int) -> None:
        """Credit winning team with trick score and clear the trick."""
        if winner % 2 == 1:
            self._team1_score += self.trick_score()
        else:
            self._team2_score += self.trick_score()
        self._trick = []

    def clear_trick(self) -> None:
        self._trick = []

    def get_team_scores(self) -> tuple:
        return (self._team1_score, self._team2_score)

    def get_bid(self) -> int:
        return self._high_bid

    # ------------------------------------------------------------------
    # Hand reset
    # ------------------------------------------------------------------

    def reset_hand(self) -> None:
        """Reset all hand-level state (preserves nothing — caller tracks totals)."""
        self._trump = None
        self._trick = []
        self._first_move = 1
        self._winner = 1
        self._join_calls = 0
        self.domino_set = DominoesSet()
        self.player_hands = [[], [], [], []]
        self._bids = {}
        self._high_bid = -1
        self._high_bidder = None
        self._high_marks = 1
        self._players = [Player(1), Player(2), Player(3), Player(4)]
        self._team1_score = 0
        self._team2_score = 0

    # Backward-compat alias
    def deal_dominoes(self) -> None:
        self.shuffle()
