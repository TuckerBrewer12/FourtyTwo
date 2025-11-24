import random
from domino import Domino

DOMINO_SET = [(6,6), (6,5), (6,4), (6,3), (6,2), (6,1), (6, 0),
              (5,5), (5,4), (5,3), (5,2), (5,1), (5, 0),
              (4,4), (4,3), (4,2), (4,1), (4, 0),
              (3,3), (3,2), (3,1), (3, 0),
              (2,2), (2,1), (2, 0),
              (1,1), (1, 0),
              (0,0)]

class DominoesSet:
    def __init__(self) -> None:
        self._domino_set = []
        for domino in DOMINO_SET[::]:
            self._domino_set.append(Domino(domino))

    def get_set(self) -> list[Domino]:
        return self._domino_set

    def shuffle(self) -> None:
        random.shuffle(self._domino_set)

    def get_hands(self) -> tuple[list['Domino'], list['Domino'], list['Domino'], list['Domino']]:
        hand1 = self._domino_set[:7]
        hand2 = self._domino_set[7:14]
        hand3 = self._domino_set[14:21]
        hand4 = self._domino_set[21:]
        return (hand1, hand2, hand3, hand4)