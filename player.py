class InvalidMoveError(Exception):
    pass

class Player:
    def __init__(self, num: int):
        self._num =  num
        self._hand = []

    def number(self) -> int:
        return self._num

    def hand(self) -> list:
        return self._hand

    def set_hand(self, hand: list) -> None:
        self._hand = hand

    def clear_hand(self) -> None:
        self._hand = []

    def move(self, move: tuple) -> None:
        try:
            self._hand.remove(move)
        except ValueError:
            raise InvalidMoveError
    def __str__(self):
        return f"Player {self._num}"
