"""
Stress tests for the FourtyTwo game engine and multiplayer server.

Tests:
- Play N complete hands (7 tricks each) in a single game
- Run N concurrent game instances simultaneously
- Bid-edge cases (all pass, max marks)
- Rapid sequential plays
- Score accumulation over multiple hands
- Server REST-layer (via server/fourty_two_server.py) under repeated use
"""

import sys
import os
import time
import unittest
import threading

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from domino import Domino
from domino_set import DominoesSet, DOMINO_SET
from fourty_two_game import FourtyTwo, InvalidBidError


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

FULL_SET = [Domino(t) for t in DOMINO_SET]


def make_game_with_hands():
    """Return a FourtyTwo with dominoes dealt (no shuffle for determinism)."""
    g = FourtyTwo()
    for _ in range(4):
        g.join()
    g._deal_dominoes()
    return g


def play_full_hand(game: FourtyTwo, trump: int = 6) -> dict:
    """
    Play all 7 tricks of a hand programmatically.
    Each player plays dominoes in hand order (no suit-following logic needed
    for stress testing the engine, only the engine state machine).
    Returns {'team1_score': int, 'team2_score': int, 'tricks': int}.
    """
    game.set_trump(trump)
    first_move = 1

    for trick_num in range(7):
        for i in range(4):
            player = (first_move - 1 + i) % 4 + 1
            hand = game.get_hand(player)
            assert hand, f"P{player} has no tiles at trick {trick_num+1}"
            ok = game.play(player, hand[0])
            assert ok, f"play() rejected a valid domino at trick {trick_num+1}"

        winner = game.get_trick_winner()
        assert 1 <= winner <= 4, f"winner {winner} out of range"
        game.set_winner(winner)
        first_move = winner

    t1, t2 = game.get_team_scores()
    assert t1 + t2 == 42, f"Scores should sum to 42, got {t1}+{t2}={t1+t2}"
    return {"team1_score": t1, "team2_score": t2, "tricks": 7}


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestEngineCompleteness(unittest.TestCase):
    """Verify game engine handles full hands correctly."""

    def _fresh_game(self):
        g = FourtyTwo()
        for _ in range(4):
            g.join()
        g.shuffle()
        return g

    def test_scores_sum_to_42_per_hand(self):
        """Regardless of trump or play order, total points == 42."""
        for trump in range(7):
            g = self._fresh_game()
            result = play_full_hand(g, trump=trump)
            self.assertEqual(result["team1_score"] + result["team2_score"], 42,
                             f"trump={trump}: scores don't sum to 42")

    def test_all_tiles_played_after_7_tricks(self):
        """Every player's hand should be empty after 7 tricks."""
        g = self._fresh_game()
        play_full_hand(g)
        for p in range(1, 5):
            self.assertEqual(len(g.get_hand(p)), 0,
                             f"P{p} still has tiles after 7 tricks")

    def test_trick_winner_always_in_range(self):
        """get_trick_winner always returns 1–4."""
        g = self._fresh_game()
        g.set_trump(5)
        first = 1
        for _ in range(7):
            for i in range(4):
                p = (first - 1 + i) % 4 + 1
                g.play(p, g.get_hand(p)[0])
            w = g.get_trick_winner()
            self.assertIn(w, [1, 2, 3, 4])
            g.set_winner(w)
            first = w

    def test_set_winner_clears_trick(self):
        """set_winner must clear the trick."""
        g = self._fresh_game()
        g.set_trump(6)
        for p in range(1, 5):
            g.play(p, g.get_hand(p)[0])
        w = g.get_trick_winner()
        g.set_winner(w)
        self.assertEqual(g.get_trick(), [])

    def test_trick_score_includes_pip_count(self):
        """trick_score() == 1 + sum of counting domino values."""
        g = self._fresh_game()
        # Force a known trick with count dominoes
        g._set_trick([Domino((5, 0)), Domino((4, 1)), Domino((0, 1)), Domino((2, 1))])
        # [5|0]=5, [4|1]=5, others=0, plus 1 for the trick itself
        self.assertEqual(g.trick_score(), 11)

    def test_play_invalid_domino_returns_false(self):
        """play() must return False for a domino not in the player's hand."""
        g = FourtyTwo()
        for _ in range(4):
            g.join()
        g._deal_dominoes()   # deterministic order: P1 gets the first 7 (incl. [6|6])
        ok = g.play(1, Domino((6, 6)))  # play it once (valid)
        self.assertTrue(ok)
        ok2 = g.play(1, Domino((6, 6)))  # second time should fail
        self.assertFalse(ok2)


class TestEngineStressMultipleHands(unittest.TestCase):
    """Play many hands back-to-back to stress the reset_hand() path."""

    HANDS = 50

    def test_play_many_hands_scores_accumulate_correctly(self):
        """Marks accumulate correctly over many hands (simplified: no bid logic)."""
        g = FourtyTwo()
        for _ in range(4):
            g.join()

        total_t1 = total_t2 = 0

        for _ in range(self.HANDS):
            g.reset_hand()
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

            t1, t2 = g.get_team_scores()
            self.assertEqual(t1 + t2, 42,
                             f"Hand scores should sum to 42, got {t1}+{t2}")
            total_t1 += t1
            total_t2 += t2

        # Sanity: both teams should have some points across 50 hands
        self.assertGreater(total_t1, 0)
        self.assertGreater(total_t2, 0)

    def test_reset_hand_clears_all_state(self):
        """After reset_hand, scores/trump/trick are all zero/None."""
        g = FourtyTwo()
        for _ in range(4):
            g.join()
        g.shuffle()
        g.set_trump(3)
        g._trick = [Domino((1, 2))]
        g._team1_score = 15
        g._team2_score = 27

        g.reset_hand()
        for _ in range(4):
            g.join()
        g.shuffle()

        self.assertIsNone(g._trump)
        self.assertEqual(g._trick, [])
        self.assertEqual(g._team1_score, 0)
        self.assertEqual(g._team2_score, 0)
        # All players should have 7 tiles
        for p in range(1, 5):
            self.assertEqual(len(g.get_hand(p)), 7, f"P{p} doesn't have 7 tiles after reset")


class TestEngineConcurrentGames(unittest.TestCase):
    """Run multiple FourtyTwo games simultaneously in separate threads."""

    GAMES   = 20
    THREADS = 4

    def _run_game(self, results, idx):
        try:
            g = FourtyTwo()
            for _ in range(4):
                g.join()
            g.shuffle()
            result = play_full_hand(g)
            results[idx] = result
        except Exception as e:
            results[idx] = {"error": str(e)}

    def test_concurrent_independent_games(self):
        """Games in separate threads do not interfere with each other."""
        results = [None] * self.GAMES
        threads = []

        for i in range(self.GAMES):
            t = threading.Thread(target=self._run_game, args=(results, i))
            threads.append(t)

        # Launch in batches of THREADS
        for i in range(0, self.GAMES, self.THREADS):
            batch = threads[i:i + self.THREADS]
            for t in batch:
                t.start()
            for t in batch:
                t.join(timeout=10)

        for i, r in enumerate(results):
            self.assertIsNotNone(r, f"Game {i} did not finish")
            self.assertNotIn("error", r, f"Game {i} errored: {r.get('error')}")
            self.assertEqual(r.get("team1_score", 0) + r.get("team2_score", 0), 42,
                             f"Game {i} scores don't sum to 42")


class TestBiddingEdgeCases(unittest.TestCase):
    """Edge cases in the bid validation logic."""

    def setUp(self):
        self.game = FourtyTwo()

    def test_all_pass_high_bid_is_minus_one(self):
        """If everyone passes, high_bid stays -1."""
        for p in range(1, 5):
            self.game.bid(p, -1)
        _, hb, _ = self.game.get_high_bid()
        self.assertEqual(hb, -1)

    def test_bid_30_first_succeeds(self):
        self.game.bid(1, 30)
        _, hb, _ = self.game.get_high_bid()
        self.assertEqual(hb, 30)

    def test_cannot_bid_same_value_twice(self):
        self.game.bid(1, 30)
        with self.assertRaises(InvalidBidError):
            self.game.bid(2, 30)

    def test_max_regular_bid_is_42(self):
        for v in range(30, 43):
            g = FourtyTwo()
            g.bid(1, v)
            _, hb, _ = g.get_high_bid()
            self.assertEqual(hb, v)

    def test_low_bid_with_5_marks(self):
        self.game.bid(1, 0, 1)
        self.game.bid(2, 0, 2)
        self.game.bid(3, 0, 3)
        self.game.bid(4, 0, 4)
        # bid 0 with 5 marks
        self.game.bid(1, 0, 5)
        _, hb, hm = self.game.get_high_bid()
        self.assertEqual(hb, 0)
        self.assertEqual(hm, 5)

    def test_get_bid_returns_high_bid(self):
        self.game.bid(1, 35)
        self.assertEqual(self.game.get_bid(), 35)

    def test_deal_dominoes_alias(self):
        """deal_dominoes() should deal correctly (alias for shuffle)."""
        g = FourtyTwo()
        for _ in range(4):
            g.join()
        g.deal_dominoes()
        for p in range(1, 5):
            self.assertEqual(len(g.get_hand(p)), 7)


class TestRapidPlay(unittest.TestCase):
    """Time a rapid run of full hands to ensure no performance regression."""

    def test_rapid_100_hands_completes_in_time(self):
        """100 complete hands should finish in under 5 seconds."""
        start = time.time()
        for _ in range(100):
            g = FourtyTwo()
            for _ in range(4):
                g.join()
            g.shuffle()
            play_full_hand(g)
        elapsed = time.time() - start
        self.assertLess(elapsed, 5.0,
                        f"100 hands took {elapsed:.2f}s (> 5s threshold)")


class TestServerLayer(unittest.TestCase):
    """Basic smoke tests for the Flask REST API server."""

    @classmethod
    def setUpClass(cls):
        try:
            from server.fourty_two_server import create_app
            cls.app = create_app()
            cls.client = cls.app.test_client()
            cls.ctx    = cls.app.app_context()
            cls.ctx.push()
            cls.client.post('/start')
            cls._available = True
        except Exception:
            cls._available = False

    def _skip_if_unavailable(self):
        if not self._available:
            self.skipTest("Flask server unavailable")

    def test_health(self):
        self._skip_if_unavailable()
        r = self.client.get('/health')
        self.assertEqual(r.status_code, 200)

    def test_start_and_join(self):
        self._skip_if_unavailable()
        self.client.post('/start')
        for i in range(4):
            r = self.client.post('/join', json={'name': f'P{i+1}'})
            self.assertEqual(r.status_code, 200)

    def test_play_full_trick_via_api(self):
        self._skip_if_unavailable()
        self.client.post('/start')
        for i in range(4):
            self.client.post('/join', json={'name': f'P{i+1}'})
        self.client.post('/test_shuffle')

        # Play 4 dominoes
        for pid, dom in [(1,(6,6)), (2,(5,5)), (3,(3,3)), (4,(0,0))]:
            r = self.client.post('/play', json={'player_num': pid, 'move': list(dom)})
            self.assertEqual(r.status_code, 200)

        r = self.client.post('/get_winner')
        self.assertEqual(r.status_code, 200)
        data = r.get_json()
        self.assertIn('winner', data)
        self.assertIn(data['winner'], [1, 2, 3, 4])

    def test_rapid_api_bids(self):
        """Ensure bid endpoint handles rapid sequential calls."""
        self._skip_if_unavailable()
        self.client.post('/start')
        for i in range(4):
            self.client.post('/join', json={'name': f'P{i+1}'})

        bids = [(1,30,1),(2,31,1),(3,-1,1),(4,32,1)]
        for pid, bid, marks in bids:
            r = self.client.post('/bid', json={'player_num': pid, 'bid': bid, 'marks': marks})
            self.assertEqual(r.status_code, 200, f"Bid {bid} by P{pid} failed")


if __name__ == '__main__':
    unittest.main(verbosity=2)
