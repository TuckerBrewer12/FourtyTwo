from __future__ import annotations
from functools import total_ordering
from typing import Union

# Trump value 7 means "Doubles are trump" — all seven doubles form the trump suit,
# ranked 6-6 (highest) down to 0-0 (lowest).  Any other integer 0-6 is a standard
# pip-value trump.

@total_ordering
class Domino:
    def __init__(self, domino: Union[tuple, list]) -> None:
        self._domino = (int(domino[0]), int(domino[1]))

    # ------------------------------------------------------------------
    # Suit helpers
    # ------------------------------------------------------------------

    def contains(self, num) -> bool:
        """Return True if this domino belongs to the given trump/suit.

        num == 7  =>  'doubles' trump; True only for double tiles.
        num 0-6   =>  standard pip suit; True if either end matches.
        num None  =>  always False.
        """
        if num is None:
            return False
        if num == 7:                          # doubles-as-trump
            return self._domino[0] == self._domino[1]
        return num == self._domino[0] or num == self._domino[1]

    def high_side(self, trump=None, lead_suit=None) -> int:
        """Return the dominant pip value of this domino.

        Used to determine lead-suit and trump membership.
        With doubles-as-trump (trump == 7): returns 7 for any double.
        """
        s1, s2 = self._domino
        if trump == 7 and s1 == s2:
            return 7                          # doubles are their own trump suit
        if trump is not None and trump != 7 and trump in self._domino:
            return trump
        if lead_suit is not None and lead_suit in self._domino:
            return lead_suit
        return max(s1, s2)

    def low_side(self, trump=None, lead_suit=None) -> int:
        """Return the secondary pip, used for ranking within a suit.

        Doubles return 7 (beats any regular pip 0-6) UNLESS trump == 7,
        in which case doubles are ranked by pip value (6-6 highest).
        """
        s1, s2 = self._domino
        if s1 == s2:                          # double
            if trump == 7:
                return s1                     # rank doubles by pip value 0-6
            return 7                          # beats all non-doubles of the suit
        if trump == 7:
            # Doubles trump, non-double: rank by non-lead-suit side
            if s1 == lead_suit:
                return s2
            if s2 == lead_suit:
                return s1
            return min(s1, s2)
        if s1 == trump:
            return s2
        if s2 == trump:
            return s1
        if s1 == lead_suit:
            return s2
        if s2 == lead_suit:
            return s1
        return min(s1, s2)

    # ------------------------------------------------------------------
    # Scoring
    # ------------------------------------------------------------------

    def value(self) -> int:
        """Count points: pip totals divisible by 5 are worth that total."""
        total = self._domino[0] + self._domino[1]
        if total > 0 and total % 5 == 0:
            return total
        return 0

    # ------------------------------------------------------------------
    # Accessors
    # ------------------------------------------------------------------

    def nums(self) -> tuple:
        return self._domino

    def to_list(self) -> list:
        return [self._domino[0], self._domino[1]]

    def _get_value(self, value: int) -> int:
        """Return the pip that is NOT the given value (assumes value is present)."""
        if value == self._domino[0]:
            return self._domino[1]
        return self._domino[0]

    # ------------------------------------------------------------------
    # Comparison / hashing
    # ------------------------------------------------------------------

    def __eq__(self, other):
        if isinstance(other, Domino):
            return frozenset(self._domino) == frozenset(other._domino)
        return False

    def __hash__(self):
        return hash(frozenset(self._domino))

    def __gt__(self, other):
        """Context-free comparison (prefer low_side for in-trick comparisons)."""
        high = self.high_side()
        if high == self.low_side():
            return True                       # double always wins context-free
        if isinstance(other, Domino):
            if not other.contains(high):
                return True
            return self.low_side() > other._get_value(high)
        return NotImplemented

    def __str__(self):
        return f"[{self._domino[0]}|{self._domino[1]}]"

    def __repr__(self):
        return f"Domino({self._domino})"
