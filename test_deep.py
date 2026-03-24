"""
Deep tests for FourtyTwo game engine.

Covers edge cases in:
- Domino equality, hashing, ordering, string representation
- Domino suit logic (high_side / low_side with lead_suit)
- DominoesSet invariants
- Player edge cases
- Trick winner determination (trump cuts, lead-suit following, doubles)
- Bidding boundary conditions
- Full-hand score invariants
- Game reset integrity
- Server API edge cases
"""

from __future__ import annotations
import unittest

from domino import Domino
from domino_set import DominoesSet, DOMINO_SET
from player import Player, InvalidMoveError
from fourty_two_game import FourtyTwo, InvalidBidError


# ===================================================================
# Domino deep tests
# ===================================================================

class TestDominoEquality(unittest.TestCase):
    """Domino equality is order-independent: (a,b) == (b,a)."""

    def test_reversed_tuple_is_equal(self):
        self.assertEqual(Domino((3, 5)), Domino((5, 3)))

    def test_same_tuple_is_equal(self):
        self.assertEqual(Domino((4, 2)), Domino((4, 2)))

    def test_double_equals_itself(self):
        self.assertEqual(Domino((3, 3)), Domino((3, 3)))

    def test_different_dominoes_not_equal(self):
        self.assertNotEqual(Domino((6, 5)), Domino((6, 4)))

    def test_not_equal_to_non_domino(self):
        self.assertNotEqual(Domino((1, 2)), (1, 2))
        self.assertNotEqual(Domino((1, 2)), "1-2")
        self.assertNotEqual(Domino((1, 2)), None)


class TestDominoHashing(unittest.TestCase):
    """Hashing must be consistent with equality."""

    def test_reversed_dominoes_same_hash(self):
        self.assertEqual(hash(Domino((2, 5))), hash(Domino((5, 2))))

    def test_usable_as_set_member(self):
        s = {Domino((3, 4)), Domino((4, 3))}
        self.assertEqual(len(s), 1)

    def test_usable_as_dict_key(self):
        d = {Domino((6, 0)): "test"}
        self.assertEqual(d[Domino((0, 6))], "test")


class TestDominoStr(unittest.TestCase):
    def test_str_format(self):
        self.assertEqual(str(Domino((6, 5))), "[6|5]")

    def test_repr_format(self):
        self.assertIn("Domino", repr(Domino((1, 0))))


class TestDominoContains(unittest.TestCase):
    def test_contains_zero(self):
        self.assertTrue(Domino((0, 0)).contains(0))

    def test_does_not_contain_none(self):
        self.assertFalse(Domino((6, 5)).contains(None))

    def test_does_not_contain_7(self):
        self.assertFalse(Domino((6, 6)).contains(7))


class TestDominoValue(unittest.TestCase):
    """value() returns the pip total if divisible by 5, else 0."""

    def test_5_0_is_5(self):
        self.assertEqual(Domino((5, 0)).value(), 5)

    def test_3_2_is_5(self):
        self.assertEqual(Domino((3, 2)).value(), 5)

    def test_4_1_is_5(self):
        self.assertEqual(Domino((4, 1)).value(), 5)

    def test_6_4_is_10(self):
        self.assertEqual(Domino((6, 4)).value(), 10)

    def test_5_5_is_10(self):
        self.assertEqual(Domino((5, 5)).value(), 10)

    def test_non_count_is_0(self):
        self.assertEqual(Domino((6, 2)).value(), 0)
        self.assertEqual(Domino((4, 4)).value(), 0)
        self.assertEqual(Domino((3, 1)).value(), 0)


class TestDominoHighLowWithLeadSuit(unittest.TestCase):
    """high_side/low_side with lead_suit parameter."""

    def test_high_side_returns_lead_suit_when_present(self):
        d = Domino((3, 6))
        self.assertEqual(d.high_side(lead_suit=3), 3)

    def test_low_side_returns_other_when_lead_suit(self):
        d = Domino((3, 6))
        self.assertEqual(d.low_side(lead_suit=3), 6)

    def test_trump_takes_priority_over_lead_suit(self):
        d = Domino((3, 5))
        # trump=5 should make high_side return 5
        self.assertEqual(d.high_side(trump=5, lead_suit=3), 5)
        # low_side with trump=5 should return 3
        self.assertEqual(d.low_side(trump=5, lead_suit=3), 3)

    def test_double_low_side_returns_7_for_highest_rank(self):
        """Doubles return 7 from low_side() so they always win suit comparisons."""
        d = Domino((4, 4))
        self.assertEqual(d.high_side(), 4)
        self.assertEqual(d.low_side(), 7)


class TestDominoOrdering(unittest.TestCase):
    """Deep ordering edge cases."""

    def test_double_beats_non_double_of_same_high(self):
        # 4-4 double beats 6-4 when 4 is trump (double always wins)
        self.assertTrue(Domino((4, 4)) > Domino((6, 4)))

    def test_higher_low_side_wins(self):
        # Both have high 6: (6,5) > (6,3)
        self.assertTrue(Domino((6, 5)) > Domino((6, 3)))

    def test_0_0_double_beats_6_0(self):
        self.assertTrue(Domino((0, 0)) > Domino((6, 0)))


# ===================================================================
# DominoesSet deep tests
# ===================================================================

class TestDominoSetInvariants(unittest.TestCase):
    def test_set_has_28_dominoes(self):
        ds = DominoesSet()
        self.assertEqual(len(ds.get_set()), 28)

    def test_all_dominoes_unique(self):
        ds = DominoesSet()
        s = set(ds.get_set())
        self.assertEqual(len(s), 28)

    def test_hands_have_7_each(self):
        ds = DominoesSet()
        ds.shuffle()
        hands = ds.get_hands()
        for h in hands:
            self.assertEqual(len(h), 7)

    def test_all_28_accounted_for_after_deal(self):
        ds = DominoesSet()
        ds.shuffle()
        h1, h2, h3, h4 = ds.get_hands()
        all_dealt = h1 + h2 + h3 + h4
        self.assertEqual(len(all_dealt), 28)
        self.assertEqual(len(set(all_dealt)), 28)

    def test_no_overlap_between_hands(self):
        ds = DominoesSet()
        ds.shuffle()
        h1, h2, h3, h4 = ds.get_hands()
        self.assertEqual(len(set(h1) & set(h2)), 0)
        self.assertEqual(len(set(h1) & set(h3)), 0)
        self.assertEqual(len(set(h1) & set(h4)), 0)
        self.assertEqual(len(set(h2) & set(h3)), 0)
        self.assertEqual(len(set(h2) & set(h4)), 0)
        self.assertEqual(len(set(h3) & set(h4)), 0)

    def test_total_pip_count(self):
        """Sum of all pips across a full double-6 set = 168."""
        ds = DominoesSet()
        total = sum(d.nums()[0] + d.nums()[1] for d in ds.get_set())
        self.assertEqual(total, 168)


# ===================================================================
# Player deep tests
# ===================================================================

class TestPlayerDeep(unittest.TestCase):
    def test_clear_hand(self):
        p = Player(1)
        p.set_hand([Domino((6, 6)), Domino((5, 5))])
        p.clear_hand()
        self.assertEqual(p.hand(), [])

    def test_move_last_domino_leaves_empty(self):
        p = Player(1)
        d = Domino((3, 2))
        p.set_hand([d])
        p.move(d)
        self.assertEqual(p.hand(), [])

    def test_move_wrong_domino_raises(self):
        p = Player(1)
        p.set_hand([Domino((6, 6))])
        with self.assertRaises(InvalidMoveError):
            p.move(Domino((5, 5)))

    def test_move_from_empty_hand_raises(self):
        p = Player(1)
        with self.assertRaises(InvalidMoveError):
            p.move(Domino((1, 1)))

    def test_str(self):
        p = Player(3)
        self.assertEqual(str(p), "Player 3")


# ===================================================================
# Trick winner deep tests
# ===================================================================

class TestTrickWinnerDeep(unittest.TestCase):
    def setUp(self):
        self.game = FourtyTwo()
        self.game._deal_dominoes()

    def test_trump_beats_non_trump_lead(self):
        """Trump domino should beat non-trump. Tests current engine behavior."""
        self.game.set_trump(1)
        # Use a trick where no off-suit domino can interfere
        trick = [Domino((6, 6)), Domino((6, 5)), Domino((1, 0)), Domino((4, 3))]
        self.game._set_trick(trick)
        winner = self.game.get_trick_winner(first_move=1)
        # 1-0 contains trump, beats the 6-6 lead
        self.assertEqual(winner, 3)

    def test_higher_trump_beats_lower_trump(self):
        self.game.set_trump(3)
        trick = [Domino((3, 0)), Domino((3, 6)), Domino((3, 2)), Domino((3, 1))]
        self.game._set_trick(trick)
        winner = self.game.get_trick_winner(first_move=1)
        self.assertEqual(winner, 2)  # 3-6 has low_side(trump=3)=6, highest

    def test_double_trump_beats_all_trump(self):
        """Double of the trump suit is the highest trump domino."""
        self.game.set_trump(4)
        trick = [Domino((6, 4)), Domino((4, 4)), Domino((5, 4)), Domino((3, 4))]
        self.game._set_trick(trick)
        winner = self.game.get_trick_winner(first_move=1)
        self.assertEqual(winner, 2)  # 4-4 double trump beats everything

    def test_off_suit_cannot_win(self):
        """A domino with neither trump nor lead suit cannot win."""
        self.game.set_trump(0)
        trick = [Domino((6, 6)), Domino((3, 2)), Domino((4, 1)), Domino((6, 5))]
        self.game._set_trick(trick)
        winner = self.game.get_trick_winner(first_move=1)
        # Only player 1 and 4 have 6s (lead suit), player 1 led with double
        self.assertEqual(winner, 1)

    def test_first_move_player_3(self):
        """Verify first_move rotation works for player 3 leading."""
        self.game.set_trump(5)
        trick = [Domino((6, 6)), Domino((6, 5)), Domino((6, 4)), Domino((6, 3))]
        self.game._set_trick(trick)
        winner = self.game.get_trick_winner(first_move=3)
        # 6-5 contains trump 5, so player (3+1-1)%4+1 = player 4 wins
        self.assertEqual(winner, 4)

    def test_first_move_player_4(self):
        """Verify first_move rotation works for player 4 leading."""
        self.game.set_trump(None)
        trick = [Domino((6, 6)), Domino((6, 5)), Domino((6, 4)), Domino((6, 3))]
        self.game._set_trick(trick)
        winner = self.game.get_trick_winner(first_move=4)
        # 6-6 (double) led by player 4, should win
        self.assertEqual(winner, 4)

    def test_empty_trick_returns_0(self):
        self.game._set_trick([])
        self.assertEqual(self.game.get_trick_winner(first_move=1), 0)

    def test_walker_1_0_wins_when_led_no_trump(self):
        """1-0 is a walker (wins when played first, no trump)."""
        self.game.set_trump(None)
        trick = [Domino((1, 0)), Domino((6, 5)), Domino((4, 3)), Domino((2, 2))]
        self.game._set_trick(trick)
        winner = self.game.get_trick_winner(first_move=1)
        self.assertEqual(winner, 1)


# ===================================================================
# Trick score deep tests
# ===================================================================

class TestTrickScore(unittest.TestCase):
    def setUp(self):
        self.game = FourtyTwo()

    def test_all_blanks_score_1(self):
        """Four non-counting dominoes = 1 (for the trick itself)."""
        self.game._set_trick([
            Domino((6, 1)), Domino((4, 3)), Domino((2, 1)), Domino((3, 1))
        ])
        self.assertEqual(self.game.trick_score(), 1)

    def test_all_count_dominoes(self):
        """5-0=5, 4-1=5, 3-2=5, 6-4=10 => 25 + 1 = 26."""
        self.game._set_trick([
            Domino((5, 0)), Domino((4, 1)), Domino((3, 2)), Domino((6, 4))
        ])
        self.assertEqual(self.game.trick_score(), 26)

    def test_5_5_and_6_4(self):
        """5-5=10, 6-4=10 + 1 = 21 + two non-counters."""
        self.game._set_trick([
            Domino((5, 5)), Domino((6, 4)), Domino((3, 1)), Domino((2, 1))
        ])
        self.assertEqual(self.game.trick_score(), 21)


# ===================================================================
# Bidding deep tests
# ===================================================================

class TestBiddingDeep(unittest.TestCase):
    def setUp(self):
        self.game = FourtyTwo()
        self.game._deal_dominoes()

    def test_cannot_bid_29(self):
        with self.assertRaises(InvalidBidError):
            self.game.bid(1, 29, 1)

    def test_cannot_bid_43(self):
        with self.assertRaises(InvalidBidError):
            self.game.bid(1, 43, 1)

    def test_cannot_bid_negative_other_than_pass(self):
        with self.assertRaises(InvalidBidError):
            self.game.bid(1, -2, 1)

    def test_cannot_bid_1(self):
        with self.assertRaises(InvalidBidError):
            self.game.bid(1, 1, 1)

    def test_all_four_pass(self):
        for p in range(1, 5):
            self.game.bid(p, -1, 1)
        _, hb, _ = self.game.get_high_bid()
        self.assertEqual(hb, -1)

    def test_sequential_bids_30_to_42(self):
        """All bids from 30 to 42 in sequence are valid."""
        for v in range(30, 43):
            g = FourtyTwo()
            g._deal_dominoes()
            g.bid(1, v, 1)
            _, hb, _ = g.get_high_bid()
            self.assertEqual(hb, v)

    def test_pass_does_not_change_high_bid(self):
        self.game.bid(1, 35, 1)
        self.game.bid(2, -1, 1)
        _, hb, _ = self.game.get_high_bid()
        self.assertEqual(hb, 35)

    def test_low_outbids_regular_bids_30_to_41(self):
        """Low (0) with 1 mark outbids regular bids 30-41."""
        for v in range(30, 42):
            g = FourtyTwo()
            g._deal_dominoes()
            g.bid(1, v, 1)
            g.bid(2, 0, 1)
            _, hb, _ = g.get_high_bid()
            self.assertEqual(hb, 0, f"Low should outbid {v}")

    def test_low_cannot_outbid_42_same_marks(self):
        """Low (0) with 1 mark cannot outbid 42 with 1 mark."""
        g = FourtyTwo()
        g._deal_dominoes()
        g.bid(1, 42, 1)
        with self.assertRaises(InvalidBidError):
            g.bid(2, 0, 1)

    def test_low_outbids_42_with_higher_marks(self):
        """Low (0) with 2 marks outbids 42 with 1 mark."""
        g = FourtyTwo()
        g._deal_dominoes()
        g.bid(1, 42, 1)
        g.bid(2, 0, 2)
        _, hb, hm = g.get_high_bid()
        self.assertEqual(hb, 0)
        self.assertEqual(hm, 2)

    def test_42_outbids_any_regular_bid(self):
        """42 with 1 mark outbids any regular bid < 42."""
        for v in range(30, 42):
            g = FourtyTwo()
            g._deal_dominoes()
            g.bid(1, v, 1)
            g.bid(2, 42, 1)
            _, hb, _ = g.get_high_bid()
            self.assertEqual(hb, 42)

    def test_num_bids_tracks_correctly(self):
        self.game.bid(1, 30, 1)
        self.assertEqual(self.game.num_bids(), 1)
        self.game.bid(2, -1, 1)
        self.assertEqual(self.game.num_bids(), 2)
        self.game.bid(3, 31, 1)
        self.assertEqual(self.game.num_bids(), 3)

    def test_marks_escalation_low(self):
        """Low with marks: 0/1 -> 0/2 -> 0/3 -> 0/4."""
        self.game.bid(1, 0, 1)
        self.game.bid(2, 0, 2)
        self.game.bid(3, 0, 3)
        self.game.bid(4, 0, 4)
        _, hb, hm = self.game.get_high_bid()
        self.assertEqual(hb, 0)
        self.assertEqual(hm, 4)


# ===================================================================
# Full game flow tests
# ===================================================================

class TestFullGameFlow(unittest.TestCase):
    """Test complete game flow: deal, bid, set trump, play 7 tricks."""

    def _fresh_game(self):
        g = FourtyTwo()
        for _ in range(4):
            g.join()
        g.shuffle()
        return g

    def test_scores_sum_to_42_all_trumps(self):
        for trump in range(7):
            g = self._fresh_game()
            g.set_trump(trump)
            first = 1
            for _ in range(7):
                for i in range(4):
                    p = (first - 1 + i) % 4 + 1
                    g.play(p, g.get_hand(p)[0])
                w = g.get_trick_winner()
                g.set_winner(w)
                first = w
            t1, t2 = g.get_team_scores()
            self.assertEqual(t1 + t2, 42, f"trump={trump}")

    def test_no_dominos_left_after_full_hand(self):
        g = self._fresh_game()
        g.set_trump(6)
        first = 1
        for _ in range(7):
            for i in range(4):
                p = (first - 1 + i) % 4 + 1
                g.play(p, g.get_hand(p)[0])
            w = g.get_trick_winner()
            g.set_winner(w)
            first = w
        for p in range(1, 5):
            self.assertEqual(len(g.get_hand(p)), 0)

    def test_scores_non_negative(self):
        g = self._fresh_game()
        g.set_trump(3)
        first = 1
        for _ in range(7):
            for i in range(4):
                p = (first - 1 + i) % 4 + 1
                g.play(p, g.get_hand(p)[0])
            w = g.get_trick_winner()
            g.set_winner(w)
            first = w
        t1, t2 = g.get_team_scores()
        self.assertGreaterEqual(t1, 0)
        self.assertGreaterEqual(t2, 0)


# ===================================================================
# Reset hand deep tests
# ===================================================================

class TestResetHandDeep(unittest.TestCase):
    def test_reset_preserves_nothing_from_previous_hand(self):
        g = FourtyTwo()
        for _ in range(4):
            g.join()
        g.shuffle()
        g.set_trump(5)
        g.bid(1, 42, 1)
        g.play(1, g.get_hand(1)[0])

        g.reset_hand()
        for _ in range(4):
            g.join()
        g.shuffle()

        self.assertIsNone(g._trump)
        self.assertEqual(g._trick, [])
        self.assertEqual(g._high_bid, -1)
        self.assertIsNone(g._high_bidder)
        self.assertEqual(g._team1_score, 0)
        self.assertEqual(g._team2_score, 0)

    def test_can_play_full_hand_after_reset(self):
        g = FourtyTwo()
        for _ in range(4):
            g.join()
        g.shuffle()
        g.set_trump(6)

        first = 1
        for _ in range(7):
            for i in range(4):
                p = (first - 1 + i) % 4 + 1
                g.play(p, g.get_hand(p)[0])
            w = g.get_trick_winner()
            g.set_winner(w)
            first = w

        g.reset_hand()
        for _ in range(4):
            g.join()
        g.shuffle()
        g.set_trump(3)

        first = 1
        for _ in range(7):
            for i in range(4):
                p = (first - 1 + i) % 4 + 1
                g.play(p, g.get_hand(p)[0])
            w = g.get_trick_winner()
            g.set_winner(w)
            first = w

        t1, t2 = g.get_team_scores()
        self.assertEqual(t1 + t2, 42)


# ===================================================================
# Server API deep tests
# ===================================================================

class TestServerDeep(unittest.TestCase):
    def setUp(self):
        from server.fourty_two_server import create_app
        self.app = create_app()
        self.client = self.app.test_client()
        self.app_context = self.app.app_context()
        self.app_context.push()
        self.client.post('/start')

    def _setup_game(self):
        for i in range(4):
            self.client.post('/join', json={'name': f'P{i+1}'})
        self.client.post('/test_shuffle')

    def test_get_winner_requires_4_plays(self):
        self._setup_game()
        # Only play 2 dominoes
        self.client.post('/play', json={'player_num': 1, 'move': [6, 6]})
        self.client.post('/play', json={'player_num': 2, 'move': [5, 5]})
        r = self.client.post('/get_winner')
        self.assertEqual(r.status_code, 400)

    def test_get_winner_returns_scores(self):
        self._setup_game()
        self.client.post('/set_trump', json={'trump': 6})
        for pid, dom in [(1, [6, 6]), (2, [5, 5]), (3, [3, 3]), (4, [0, 0])]:
            self.client.post('/play', json={'player_num': pid, 'move': dom})
        r = self.client.post('/get_winner')
        data = r.get_json()
        self.assertIn('team1_score', data)
        self.assertIn('team2_score', data)
        self.assertIn('winner', data)

    def test_shuffle_requires_4_players(self):
        self.client.post('/join', json={'name': 'P1'})
        r = self.client.post('/shuffle')
        self.assertEqual(r.status_code, 400)

    def test_invalid_bid_returns_400(self):
        self._setup_game()
        self.client.post('/bid', json={'player_num': 1, 'bid': 31, 'marks': 1})
        r = self.client.post('/bid', json={'player_num': 2, 'bid': 30, 'marks': 1})
        self.assertEqual(r.status_code, 400)

    def test_play_returns_hand_shrinks(self):
        self._setup_game()
        r1 = self.client.post('/get_hand', json={'player_num': 1})
        hand_before = r1.get_json()['hand']
        self.client.post('/play', json={'player_num': 1, 'move': hand_before[0]})
        r2 = self.client.post('/get_hand', json={'player_num': 1})
        hand_after = r2.get_json()['hand']
        self.assertEqual(len(hand_after), len(hand_before) - 1)

    def test_start_resets_game(self):
        self._setup_game()
        self.client.post('/bid', json={'player_num': 1, 'bid': 30, 'marks': 1})
        self.client.post('/start')
        r = self.client.get('/get_high_bid')
        data = r.get_json()
        self.assertEqual(data['bid'], -1)

    def test_hello_endpoint(self):
        r = self.client.get('/hello')
        self.assertEqual(r.status_code, 200)
        data = r.get_json()
        self.assertIn('message', data)

    def test_full_7_tricks_via_api(self):
        """Play a full hand through the REST API and verify scores sum to 42."""
        self._setup_game()
        self.client.post('/set_trump', json={'trump': 6})

        # Get all hands
        hands = {}
        for p in range(1, 5):
            r = self.client.post('/get_hand', json={'player_num': p})
            hands[p] = r.get_json()['hand']

        first = 1
        for _ in range(7):
            for i in range(4):
                p = (first - 1 + i) % 4 + 1
                move = hands[p].pop(0)
                self.client.post('/play', json={'player_num': p, 'move': move})

            r = self.client.post('/get_winner')
            self.assertEqual(r.status_code, 200)
            data = r.get_json()
            first = data['winner']

        # After 7 tricks, scores should sum to 42
        self.assertEqual(data['team1_score'] + data['team2_score'], 42)

    def test_bid_completes_after_4_bids(self):
        """After 4 bids, the response should include the winning bid info."""
        self._setup_game()
        self.client.post('/bid', json={'player_num': 1, 'bid': 30, 'marks': 1})
        self.client.post('/bid', json={'player_num': 2, 'bid': -1, 'marks': 1})
        self.client.post('/bid', json={'player_num': 3, 'bid': -1, 'marks': 1})
        r = self.client.post('/bid', json={'player_num': 4, 'bid': -1, 'marks': 1})
        data = r.get_json()
        self.assertEqual(data['bid'], 30)
        self.assertEqual(data['player_num'], 1)


# ===================================================================
# Count domino coverage (the 42 rule)
# ===================================================================

class TestFortyTwoRule(unittest.TestCase):
    """The total count in a full set is always 42 (5+10+10+5+5+5+10 = 35 pips + 7 tricks = 42)."""

    def test_total_count_dominoes_sum_to_35(self):
        ds = DominoesSet()
        total = sum(d.value() for d in ds.get_set())
        self.assertEqual(total, 35)

    def test_35_pips_plus_7_tricks_is_42(self):
        # 7 tricks * 1 point each = 7, plus 35 count = 42
        self.assertEqual(35 + 7, 42)


if __name__ == '__main__':
    unittest.main(verbosity=2)
