
from flask import Flask, request, jsonify, render_template, current_app
from flask_socketio import SocketIO, join_room, leave_room, emit, disconnect, send, ConnectionRefusedError
from fourty_two_game import FourtyTwo, InvalidBidError
from domino import Domino

# __name__ references this file

socketio = SocketIO()



def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = 'secret!'
    socketio.init_app(app)

    @socketio.on('connect')
    def connect():
        if not self.authenticate(request.args):
            raise ConnectionRefusedError('unauthorized')


    @socketio.on('join')
    def on_join(data):
        username = data['username']
        room = data['room']
        join_room(room)
        send('message', f'{username} has joined the room {room}', to=room)
    
    #request.sid for name of session ID of room
    @socketio.on('leave')
    def on_leave(data):
        username = data['username']
        room = data['room']
        leave_room(room)
        send('message', f'{username} has left the room {room}', to=room)


    # @app.route('/start', methods=['POST'])
    @socketio.on('start')
    def start():
        current_app.game = FourtyTwo() 
        return message("Game started")

    # def bad_request(message):
    #     return jsonify({'ok': False, 'error': message}), 400

    # def message(message):
    #     return jsonify({'ok': True, 'message': message})
    
    # @app.route('/')
    # def index():
    #     return render_template('index.html')

    # @app.route('/hello')
    # def hello():
    #     return jsonify({'message': 'Hello from Python server!'})

    # @app.route('/health')
    # def health():
    #     return jsonify({"ok": True}), 200

    @app.route('/join', methods=['POST'])
    def join():
        data = request.get_json()
        player_num = current_app.game.join()
        name = data.get("name", f"Player{player_num}")

        # if next_id > MAX_PLAYERS:
        #     return jsonify({"ok": False, "error": "Game is full"}), 400

        return jsonify({
            "ok": True,
            "player_num": player_num,
            "name": name,
            "players": current_app.game.num_players()
        })


    @app.route('/bid', methods=['POST'])
    def bid():
        data = request.get_json()

        player_num = data.get("player_num")
        bid = data.get("bid")
        marks = data.get("marks")

        try:
            current_app.game.bid(player_num, bid, marks)
        except InvalidBidError:
            return bad_request(message="Invalid bid")
        
        if current_app.game.num_bids() == 4:
            player_num, high_bid, high_marks = current_app.game.get_high_bid()
            return jsonify({
                "ok": True,
                "bid": high_bid,
                "marks": high_marks,
                "player_num": player_num
            })
        return message("Bid request received")
    
    @app.route('/get_high_bid', methods=['GET'])
    def get_high_bid():
        player_num, high_bid, high_marks = current_app.game.get_high_bid()
        return jsonify({
            "ok": True,
            "bid": high_bid,
            "marks": high_marks,
            "player_num": player_num
        })

    @app.route('/shuffle', methods=['POST'])
    def shuffle():
        if current_app.game.num_players() != 4:
            return bad_request("Game is not full")

        current_app.game.shuffle()
        return message("Shuffle request received")

    @app.route('/test_shuffle', methods=['POST'])
    def test_shuffle():
        if current_app.game.num_players() != 4:
            return bad_request("Game is not full")
        current_app.game._deal_dominoes()
        return message("Shuffle request received")


    @app.route('/play', methods=['POST'])
    def play():
        data = request.get_json()

        player_num = data['player_num']
        move = Domino(data['move'])
        result = current_app.game.play(player_num, move)

        if result == True:
            return message("Play Valid")
        else:
            return bad_request("Invalid move")

    @app.route('/set_trump', methods=['POST'])
    def set_trump():
        data = request.get_json()
        trump = data['trump']
        current_app.game.set_trump(trump)
        return message("Trump set")

    #get hand 
    @app.route('/get_hand', methods=['POST'])
    def get_hand():
        data = request.get_json()
        player_num = data['player_num']
        hand = current_app.game.get_hand(player_num)
        return jsonify({'hand': domino_set_to_json(hand)})

    @app.route('/get_trick', methods=['POST'])
    def get_trick():
        data = request.get_json()
        trick = current_app.game.get_trick()
        return jsonify({'trick': domino_set_to_json(trick)})
    

    @app.route('/get_winner', methods=['POST'])
    def get_winner():
        if len(current_app.game.get_trick()) != 4:
            return bad_request("Trick is not complete")

        trick = current_app.game.get_trick()
        winner = current_app.game.get_trick_winner()
        current_app.game.set_winner(winner)

        return jsonify({'trick': domino_set_to_json(trick), 'winner': winner,
        'team1_score': current_app.game.get_team_scores()[0], 'team2_score': current_app.game.get_team_scores()[1]})

    return app

    
    #get score
    #get winner 
    #get team1 score
    #get team2 score 

def domino_set_to_json(hand):
    def domino_to_list(domino):
        return domino.to_list()
    return [domino_to_list(domino) for domino in hand]


if __name__ == '__main__':
    create_app().run(port = 5000, debug=True)
