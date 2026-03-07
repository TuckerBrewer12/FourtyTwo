# FourtyTwo

A Python implementation of **42**, the classic Texas domino trick-taking game.

## About the Game

42 is a domino game for four players divided into two teams (players 1 & 3 vs. players 2 & 4). It is played with a standard double-six domino set (28 dominoes). Each hand consists of a bidding phase and a trick-taking phase, similar to the card game Spades.

### Scoring

- Each hand contains **7 tricks**, worth **1 point** each.
- Dominoes whose pips sum to a multiple of 5 carry **bonus points** equal to their pip total:
  - `[5|0]` = 5 points, `[5|5]` = 10 points, `[6|4]` = 10 points, `[5|4]` = 0 (not divisible by 5)
- There are **42 total points** per hand (7 tricks + 35 pip-points).

### Bidding

- Players bid the number of points (30–42) their team will take, or bid **"low"** (0) to win by taking no pip-scoring dominoes.
- The highest bidder sets **trump** for the hand.
- Special bids (**"42"** or **"low"**) can be bid with **marks** (1–5) to increase the stake.

### Trick Play

- The highest bidder leads the first trick.
- Players must **follow suit** (match the lead domino's high side) if they can.
- **Trump beats all other suits.** Within trump, the higher low-side wins.
- **Doubles** are always the highest domino of their suit.

---

## Project Structure

```
FourtyTwo/
├── domino.py               # Domino class: comparison, value, suit logic
├── domino_set.py           # DominoesSet: full 28-domino set, shuffle & deal
├── player.py               # Player class: hand management, move validation
├── fourty_two_game.py      # FourtyTwo game engine: bidding, trick play, scoring
├── console_game.py         # Interactive CLI game runner
│
├── server/
│   ├── fourty_two_server.py          # Flask REST API server
│   └── fourty_two_socketio_server.py # Flask-SocketIO real-time server (WIP)
│
├── test_domino.py          # Unit tests for Domino
├── test_domino_set.py      # Unit tests for DominoesSet
├── test_player.py          # Unit tests for Player
├── test_fourty_two.py      # Unit tests for FourtyTwo game logic
└── test_fourty_two_server.py  # Integration tests for Flask API
```

---

## Setup

### Prerequisites

- Python 3.10+

### Install dependencies

```bash
pip install flask flask-socketio
```

---

## Running the Game

### Console (local play)

```bash
python console_game.py
```

### REST API Server

```bash
cd server
python fourty_two_server.py
```

The server starts on `http://localhost:5000`.

---

## REST API Reference

All endpoints accept and return JSON.

| Method | Endpoint        | Description                                      |
|--------|-----------------|--------------------------------------------------|
| POST   | `/start`        | Start a new game                                 |
| POST   | `/join`         | Join the game (returns your player number 1–4)  |
| POST   | `/shuffle`      | Deal dominoes (requires all 4 players joined)   |
| POST   | `/bid`          | Submit a bid `{player_num, bid, marks}`          |
| GET    | `/get_high_bid` | Get the current highest bid                      |
| POST   | `/set_trump`    | Set trump suit `{trump: 0–6}`                   |
| POST   | `/play`         | Play a domino `{player_num, move: [a, b]}`       |
| POST   | `/get_hand`     | Get a player's hand `{player_num}`               |
| POST   | `/get_trick`    | Get the dominoes in the current trick            |
| POST   | `/get_winner`   | Evaluate the completed trick and update scores   |
| GET    | `/health`       | Health check                                     |

### Example: start a game and join

```bash
curl -X POST http://localhost:5000/start
curl -X POST http://localhost:5000/join -H "Content-Type: application/json" -d '{"name": "Alice"}'
# Returns: {"ok": true, "player_num": 1, "name": "Alice", "players": 1}
```

---

## Running Tests

```bash
python -m unittest discover -v
```

Tests are written with Python's built-in `unittest` framework.

---

## Key Classes

### `Domino`

```python
from domino import Domino

d = Domino([5, 3])
d.value()          # 0 (8 is not divisible by 5)
d.contains(5)      # True
d.high_side()      # 5
d.low_side()       # 3
str(d)             # "[5|3]"
```

### `FourtyTwo`

```python
from fourty_two_game import FourtyTwo

game = FourtyTwo()
game.join()                  # Player 1 joins
game.shuffle()               # Deal dominoes
game.bid(1, 32)              # Player 1 bids 32
game.set_trump(5)            # Trump is 5s
game.play(1, Domino([5,3]))  # Player 1 plays [5|3]
winner = game.get_trick_winner()
game.set_winner(winner)
```

---

## Teams

- **Team 1**: Players 1 and 3
- **Team 2**: Players 2 and 4
