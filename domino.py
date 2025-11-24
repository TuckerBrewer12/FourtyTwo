from functools import total_ordering

@total_ordering
class Domino:
    def __init__(self, domino: tuple | list) -> None:
        self._domino = tuple(domino)

    def high_side(self, trump: int = None, lead_suit: int = None) -> int:
        if trump in self._domino:
            return trump

        if lead_suit in self._domino:
            return lead_suit

        return max(self._domino[0], self._domino[1])

    def low_side(self, trump: int = None, lead_suit: int = None) -> int:
        s1 = self._domino[0]
        s2 = self._domino[1]

        if s1 == trump:
            return s2
        elif s2 == trump:
            return s1
        elif s1 == lead_suit:
            return s2
        elif s2 == lead_suit:
            return s1
        else:
            return min(s1, s2)

    def value(self) -> int:
        total = self._domino[0] + self._domino[1]
        if total % 5 == 0:
            return total
        return 0

    def contains(self, num: int) -> bool:
        if num == self._domino[0] or num == self._domino[1]:
            return True
        return False

    def nums(self) -> tuple:
        return self._domino
    
    def to_list(self) -> list:
        return [self._domino[0], self._domino[1]]

    def _get_value(self, value: int) -> int:
        """
        Returns the value of the domino that is not the given value
        Assumes the value you provide is in the domino
        """
        if value == self._domino[0]:
            return self._domino[1]
        return self._domino[0]
    
    def __eq__(self, other):
        """Compare domino equality"""
        if isinstance(other, Domino):
            return self._domino == other._domino
        return False
    
    def __gt__(self, other):
        """Compare domino greater than"""
        high = self.high_side()

        #If first domino is a double, it always wins
        if (high == self.low_side()):
            return True

        if isinstance(other, Domino):
            if other.contains(high) == False:
                return True 
            return self.low_side() > other._get_value(high)

        return NotImplemented

    def __str__(self):
        """String representation of the domino"""
        return f"[{self._domino[0]}|{self._domino[1]}]"
    
    def __repr__(self):
        """Detailed string representation for debugging"""
        return f"Domino({self._domino})"