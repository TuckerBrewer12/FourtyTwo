import unittest
from domino_set import *


# Tests domino set. A set has 28 dominos and can be seperated into 4 unique hands.
class test_dominoset(unittest.TestCase):
    def setUp(self):
        self._dominoes = DominoesSet()

    def test_dominos_creates_a_domino_set_with_28_dominos(self):
        self.assertEqual(len(self._dominoes.get_set()), 28)

    def test_can_shuffle_a_domino_set(self):
        self._dominoes.shuffle()
        self.assertNotEqual(DOMINO_SET, self._dominoes.get_set())

    def test_get_hands_returns_4_hands_of_dominos_with_the_same_length(self):
        self._dominoes.shuffle()
        h1, h2, h3, h4 = self._dominoes.get_hands()
        self.assertEqual(len(h1) == len(h2) == len(h3) == len(h4), True)

    def test_get_hands_return_4_hands_of_completely_unique_domines(self):
        self._dominoes.shuffle()
        h1, h2, h3, h4 = self._dominoes.get_hands()
        common_dominoes = set(h1) & set(h2) & set(h3) & set(h4)
        self.assertEqual(len(common_dominoes), 0)


if __name__ == '__main__':
    unittest.main()
