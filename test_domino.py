import unittest
from domino import *

class test_domino(unittest.TestCase):
    def setUp(self):
        self._domino = Domino((6,5))
        self._d64 = Domino((6,4))
        self._d00 = Domino((0,0))
        self._d55 = Domino((5,5))
        self._d10 = Domino((1,0))
        self._d00 = Domino((0,0))
        self._d61 = Domino((6,1))

#Dominos know what their highest number is, including when there is a trump
    def test_a_5_6_domino_with_a_6_trump_returns_5_for_low_side(self):
        self.assertEqual(self._domino.low_side(6), 5)

    def test_a_5_6_domino_with_a_5_trump_returns_6_for_low_side(self):
        self.assertEqual(self._domino.low_side(5), 6)

    def test_a_5_6_domino_with_no_trumps_returns_5_for_low_side(self):
        self.assertEqual(self._domino.low_side(None), 5)

    def test_a_5_6_domino_with_a_4_trump_returns_6_for_high_side(self):
        self.assertEqual(self._domino.high_side(4), 6)

    def test_a_5_6_domino_with_a_5_trump_returns_5_for_high_side(self):
        self.assertEqual(self._domino.high_side(5), 5)

    def test_a_5_6_domino_with_no_trumps_returns_6_for_high_side(self):
        self.assertEqual(self._domino.high_side(None), 6)

#Values of dominos are correct -------------------------------------------
    def test_value_5_6_is_0(self):
        self.assertEqual(self._domino.value(), 0)

    def test_value_0_0_is_0(self):
        self.assertEqual(self._d00.value(), 0)

    def test_value_5_5_is_10(self):
        self.assertEqual(self._d55.value(), 10)

#Dominoes know which values they contain

    def test_6_5_contains_a_5(self):
        self.assertEqual(self._domino.contains(5), True)

    def test_6_5_contains_a_6(self):
        self.assertEqual(self._domino.contains(6), True)

    def test_6_5_does_not_contain_a_4(self):
        self.assertEqual(self._domino.contains(4), False)

#Dominoes can be compared 
    def test_6_5_is_not_equal_to_6_4(self):
        self.assertFalse(self._domino == self._d64)
    
    def test_6_4_is_equal_to_6_4(self):
        self.assertTrue(self._domino == self._domino)

    def test_6_5_is_greater_than_6_4(self):
        self.assertTrue(self._domino > self._d64)

    def test_5_5_is_greater_than_6_5(self):
        self.assertTrue(self._d55 > self._domino)
    
    def test_1_0_is_greater_than_0_0(self):
        self.assertTrue(self._d10 > self._d00)

    def test_6_1_is_not_greater_than_6_5(self):
        self.assertFalse(self._d61 > self._domino)

    def test_1_0_is_greater_than_5_5_when_played_first(self):
        self.assertTrue(self._d10 > self._d55)

if __name__ == '__main__':
    unittest.main()
