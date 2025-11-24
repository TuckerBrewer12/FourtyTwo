from fourty_two_game import *
from player import *
import unittest


class test_fourtytwo(unittest.TestCase):
    def setUp(self):
        self._game = FourtyTwo()
        self._game._deal_dominoes()
        
        self._d1 = Domino((6,6))
        self._d2 = Domino((6,5))
        self._d3 = Domino((6,4))
        self._d4 = Domino((6,3))

        self._trick1 = [self._d1, self._d2, self._d3, self._d4]

    def test_can_set_a_trick(self):
        self._game._set_trick(self._trick1)
        self.assertEqual(self._game._trick, self._trick1)

    def test_can_get_a_trick(self):
        self._game._set_trick(self._trick1)
        self.assertEqual(self._game.get_trick(), self._trick1)

    def test_can_get_the_score_of_a_trick(self):
        self._game._set_trick(self._trick1)
        self.assertEqual(self._game.trick_score(), 11)

    #-------------------------------------------------------------------
    #winner of trick can be determined
    def test_6_6_wins_when_played_first(self):
        self._game._set_trick(self._trick1)
        self.assertEqual(self._game.get_trick_winner(first_move=1), 1)

    def test_6_5_wins_when_5_is_trump_and_played_second(self):
        self._game.set_trump(5)
        self._game._set_trick(self._trick1)
        self.assertEqual(self._game.get_trick_winner(first_move=1), 2)

    def test_1_0_wins_as_a_walker(self):
        d1 = Domino((1,0))
        d2 = Domino((6,5))
        d3 = Domino((4,2))
        d4 = Domino((3,2))

        trick1 = [d1, d2, d3, d4]

        self._game._set_trick(trick1)
        self.assertEqual(self._game.get_trick_winner(first_move=1), 1)

    def test_6_1_is_highest_1_besides_double(self):
        d1 = Domino((1,0))
        d2 = Domino((3,1))
        d3 = Domino((2,1))
        d4 = Domino((6,1))

        trick1 = [d1, d2, d3, d4]

        self._game._set_trick(trick1)
        self.assertEqual(self._game.get_trick_winner(first_move=1), 4)
    
    def test_1_1_is_highest_1(self):
        d1 = Domino((1,0))
        d2 = Domino((3,1))
        d3 = Domino((1,1))
        d4 = Domino((6,1))

        trick1 = [d1, d2, d3, d4]

        self._game._set_trick(trick1)
        self.assertEqual(self._game.get_trick_winner(first_move=1), 3)

    def test_6_4_beats_4_4(self):
        d1 = Domino((6, 4))
        d2 = Domino((4, 4))
        d3 = Domino((1, 1))
        d4 = Domino((6, 1))

        trick = [d1, d2, d3, d4]

        self._game._set_trick(trick)
        self.assertEqual(self._game.get_trick_winner(first_move=1), 1)

    def test_0_0_is_highest_0(self):
        d1 = Domino((0,0))
        d2 = Domino((3,1))
        d3 = Domino((1,0))
        d4 = Domino((6,0))

        trick1 = [d1, d2, d3, d4]

        self._game._set_trick(trick1)
        self.assertEqual(self._game.get_trick_winner(first_move=1), 1)

#-------------------------------------------------------------------
#bidding

    #valid bids
    def test_can_bid(self):
        self._game.bid(1, 30, 1)
        self.assertEqual(self._game.get_high_bid(), (1, 30, 1))

    def test_can_bid_low(self):
        self._game.bid(1, 0, 1)
        self.assertEqual(self._game.get_high_bid(), (1, 0, 1))
    def test_can_bid_42(self):
        self._game.bid(1, 42, 1)
        self.assertEqual(self._game.get_high_bid(), (1, 42, 1))
    def test_can_bid_42_with_marks(self):
        self._game.bid(1, 42, 2)
        self.assertEqual(self._game.get_high_bid(), (1, 42, 2))
    def test_can_bid_0_with_marks_(self):
        self._game.bid(1, 0, 2)
        self.assertEqual(self._game.get_high_bid(), (1, 0, 2))
    def test_can_outbid_30(self):
        self._game.bid(1, 30, 1)
        self._game.bid(2, 31, 1)
        self.assertEqual(self._game.get_high_bid(), (2, 31, 1))
    def test_can_outbid_30_with_passes_between(self):
        self._game.bid(1, 30, 1)
        self._game.bid(2, -1, 1)
        self._game.bid(3, 31, 1)
        self.assertEqual(self._game.get_high_bid(), (3, 31, 1))
    def test_can_bid_30_with_passes_before_and_after(self):
        self._game.bid(1, -1, 1)
        self._game.bid(2, -1, 1)
        self._game.bid(3, 30, 1)
        self._game.bid(4, -1, 1)
        self.assertEqual(self._game.get_high_bid(), (3, 30, 1))
    
    def test_low_outbids_30(self):
        self._game.bid(1, 30, 1)
        self._game.bid(2, 0, 1)
        self.assertEqual(self._game.get_high_bid(), (2, 0, 1))

    def test_low_outbids_42_with_two_marks(self):
        self._game.bid(1, 42, 1)
        self._game.bid(2, 0, 2)
        self.assertEqual(self._game.get_high_bid(), (2, 0, 2))
    
    def test_can_bid_42_2_marks(self):
        self._game.bid(1, 42, 2)
        self._game.bid(2, -1, 1)
        self.assertEqual(self._game.get_high_bid(), (1, 42, 2))
    def test_can_bid_low_2_marks(self):
        self._game.bid(1, 0, 2)
        self._game.bid(2, -1, 1)
        self.assertEqual(self._game.get_high_bid(), (1, 0, 2))
    
    def test_42_3_marks_outbids_42_with_two_mark(self):
        self._game.bid(1, 42, 2)
        self._game.bid(2, -1, 1)
        self._game.bid(3, 42, 3)
        self.assertEqual(self._game.get_high_bid(), (3, 42, 3))
    
    def test_42_3_marks_outbids_42(self):
        self._game.bid(1, 42, 1)
        self._game.bid(2, -1, 1)
        self._game.bid(3, 42, 3)
        self.assertEqual(self._game.get_high_bid(), (3, 42, 3))


    def test_low_3_marks_outbids_42_with_one_mark(self):
        self._game.bid(1, 42, 1)
        self._game.bid(2, -1, 1)
        self._game.bid(3, 0, 3)
        self._game.bid(4, -1, 1)
        self.assertEqual(self._game.get_high_bid(), (3, 0, 3))
    
    def tes_can_bid_with_player_3_starting(self):
        self._game.bid(3, -1, 1)
        self._game.bid(4, -1, 1)
        self._game.bid(1, 30, 1)
        self._game.bid(2, -1, 1)
        self.assertEqual(self._game.get_high_bid(), (1, 30, 1))


    #invalid bids
    def test_cannot_bid_30_two_marks(self):
        with self.assertRaises(InvalidBidError):
            self._game.bid(1, 30, 2)
    
    def test_cannot_bid_30_after_31(self):
        self._game.bid(1, 31, 1)
        with self.assertRaises(InvalidBidError):
            self._game.bid(2, 30, 1)
    
    def test_cannot_bid_30_after_42(self):
        self._game.bid(1, 42, 1)
        with self.assertRaises(InvalidBidError):
            self._game.bid(2, 30, 1)
    
    def test_cannot_bid_30_after_42_with_two_marks(self):
        self._game.bid(1, 42, 2)
        with self.assertRaises(InvalidBidError):
            self._game.bid(2, 30, 2)
    
    def test_cannot_bid_30_after_low_with_one_mark(self):
        self._game.bid(1, 0, 1)
        with self.assertRaises(InvalidBidError):
            self._game.bid(2, 30, 1)
    
    def test_cannot_bid_42_1_mark_after_low(self):
        self._game.bid(1, 0, 1)
        with self.assertRaises(InvalidBidError):
            self._game.bid(2, 42, 1)
    
    def test_cannot_bid_42_2_marks_after_low_2_marks(self):
        self._game.bid(1, 0, 2)
        with self.assertRaises(InvalidBidError):
            self._game.bid(2, 42, 2)

    def test_cannot_bid_42_3_marks_to_start(self):
        with self.assertRaises(InvalidBidError):
            self._game.bid(3, 42, 3)
    def test_cannot_bid_42_3_marks_after_31(self):
        self._game.bid(1, 31, 1)
        with self.assertRaises(InvalidBidError):
            self._game.bid(2, 42, 3)
    def test_cannot_bid_42_4_marks_after_42(self):
        self._game.bid(1, 42, 1)
        with self.assertRaises(InvalidBidError):
            self._game.bid(2, 42, 4)
    def test_cannot_bid_pass_then_lower_bid(self):
        self._game.bid(1, -1, 1)
        self._game.bid(2, 30, 1)
        self._game.bid(3, -1, 1)
        with self.assertRaises(InvalidBidError):
            self._game.bid(4, 30, 1)
    
#-------------------------------------------------------------------
#playing
    def test_can_play_a_domino_in_hand(self):
        self._game.play(1, Domino((6,6)))
        self.assertEqual(self._game.get_trick(), [Domino((6,6))])
    
    def test_playing_a_domino_removes_it_from_the_hand(self):
        starting_hand = self._game.get_hand(1)[:]
        first_domino = starting_hand[0]
        self._game.play(1, first_domino)
        self.assertEqual(self._game.get_hand(1), starting_hand[1:])
    
    def test_playing_a_domino_that_is_not_in_the_hand_returns_false(self):
        self._game.play(1, Domino((6,6)))
        self.assertEqual(self._game.play(1, Domino((6,6))), False)


if __name__ == '__main__':
    unittest.main()
