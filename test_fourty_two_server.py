import json
import unittest
from server.fourty_two_server import create_app



class TestGameServer(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.client = self.app.test_client()
        self.app_context = self.app.app_context()
        self.app_context.push()
        self.client.post('/start')

    def setup_game(self):
        for i in range(4):
            self.client.post('/join', json={'name': f'Player{i+1}'})
        self.client.post('/test_shuffle')
    
    def setup_trick(self):
        self.setup_game()
        self.client.post('/play', json={'player_num': 1, 'move': (6, 6)})
        self.client.post('/play', json={'player_num': 2, 'move': (5, 5)})
        self.client.post('/play', json={'player_num': 3, 'move': (3, 3)})
        self.client.post('/play', json={'player_num': 4, 'move': (0, 0)})


    # def tearDown(self):
    #     self.app_context.pop()

    def test_health_endpoint(self):
        response = self.client.get('/health')
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data['ok'], True)

    def test_can_join_game(self):
        response = self.client.post('/join', json={'name': 'Test Player'})
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data['player_num'], 1)

#-------------------------------------------------------------------
#bidding 
    def test_can_bid(self):
        response = self.client.post('/bid', json={'player_num': 1, 'bid': 30, 'marks': 1})
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data['ok'], True)
    
    def test_can_get_high_bid(self):
        self.setup_game()
        self.client.post('/bid', json={'player_num': 1, 'bid': 30, 'marks': 1})

        response = self.client.get('/get_high_bid')
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data['bid'], 30)
        self.assertEqual(data['marks'], 1)
        self.assertEqual(data['player_num'], 1)
    
    def test_can_bid_multiple_times(self):
        self.setup_game()
        self.client.post('/bid', json={'player_num': 1, 'bid': 30, 'marks': 1})
        self.client.post('/bid', json={'player_num': 2, 'bid': 31, 'marks': 1})
        self.client.post('/bid', json={'player_num': 3, 'bid': 42, 'marks': 2})
        self.client.post('/bid', json={'player_num': 4, 'bid': -1, 'marks': 1})
        response = self.client.get('/get_high_bid')
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data['bid'], 42)
        self.assertEqual(data['marks'], 2)
        self.assertEqual(data['player_num'], 3)
    
    def test_high_bid_is_pass_at_start(self):
        response = self.client.get('/get_high_bid')
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data['bid'], -1)
        self.assertEqual(data['marks'], 1)
        self.assertEqual(data['player_num'], None)
    

#-------------------------------------------------------------------
#shuffle
    def test_can_shuffle(self):
        for i in range(4):
            self.client.post('/join', json={'name': f'Player{i+1}'})
        response = self.client.post('/shuffle')
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data['ok'], True)

#-------------------------------------------------------------------
#playing
    def test_can_play_a_domino(self):
        self.setup_game()
        response = self.client.post('/play', json={'player_num': 1, 'move': (6, 6)})
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data['ok'], True)
    
    def test_cannot_play_a_domino_that_is_not_in_the_hand(self):
        self.setup_game()
        response = self.client.post('/play', json={'player_num': 1, 'move': (5, 5)})
        self.assertEqual(response.status_code, 400)
        data = response.get_json()
        self.assertEqual(data['ok'], False)

#-------------------------------------------------------------------
#trumps
    def test_can_set_trump(self):
        self.setup_game()
        response = self.client.post('/set_trump', json={'trump': 6})
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data['ok'], True)

#-------------------------------------------------------------------
#get hand
    def test_can_get_hand(self):
        self.setup_game()
        response = self.client.post('/get_hand', json={'player_num': 1})
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data['hand'], [[6, 6], [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0]])

#-------------------------------------------------------------------
#get trick
    def test_can_get_empty_trick(self):
        self.setup_game()
        response = self.client.post('/get_trick', json={'player_num': 1})
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data['trick'], [])
    
    def test_can_get_trick(self):
        self.setup_trick()
        response = self.client.post('/get_trick', json={'player_num': 1})
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data['trick'], [[6, 6], [5, 5], [3, 3], [0, 0]])

    



    
    

if __name__ == '__main__':
    unittest.main()