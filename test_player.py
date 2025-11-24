import unittest
from player import *

class test_fourty_two_player(unittest.TestCase):
    def setUp(self):
        self._player = Player(1)

    def test_a_player_has_a_number(self):
        self.assertEqual(self._player.number(), 1)

    def test_a_player_hand_is_a_list(self):
        self.assertEqual(type(self._player.hand()), list)

    def test_a_players_hand_is_empty_at_the_start(self):
        self.assertEqual(self._player.hand(), [])

    def test_can_set_player_hand(self):
        self._player.set_hand([(6, 6), (6, 3), (6, 5), (6, 4)])
        self.assertEqual(self._player.hand(), [(6, 6), (6, 3), (6, 5), (6, 4)])

    def test_making_a_valid_move_removes_the_domino_from_a_players_hand(self):
        self._player.set_hand([(6, 6), (6, 3), (6, 5), (6, 4)])
        self._player.move((6, 6))
        self.assertEqual(self._player.hand(), [(6, 3), (6, 5), (6, 4)])

    def test_making_an_invalid_move_raises_an_invalid_move_exception(self):
        self._player.set_hand([(6, 6), (6, 3), (6, 5), (6, 4)])
        with self.assertRaises(InvalidMoveError):
            self._player.move((5, 6))

if __name__ == '__main__':
    unittest.main()
