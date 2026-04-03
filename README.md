# FourtyTwo

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live%20Demo-gold?logo=github)](https://tuckerbrewer12.github.io/FourtyTwo/)
[![MIT License](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue?logo=python)](https://python.org)

**Live Demo:** https://tuckerbrewer12.github.io/FourtyTwo/

A real-time multiplayer implementation of **42**, the classic Texas domino trick-and-trump game invented in 1885. Think Spades, but played with dominoes — four players, two teams, bidding, trump, and 42 points on the line every hand.

---

<!-- screenshot -->

---

## How It Works

### Scoring
- 7 tricks per hand, worth **1 point each**
- Dominoes whose pips sum to a multiple of 5 carry **bonus points** (e.g. `[5|0]` = 5pts, `[6|4]` = 10pts)
- **42 total points** per hand (7 trick-points + 35 pip-points)

### Bidding
- Players bid 30–42; highest bidder names trump for the hand
- Must make your bid or the other team scores those points
- Special bids (**"low"**, **"42"**) can be staked with marks to increase the reward

### Trick Play
- Must follow suit (lead domino's high side) if able
- Trump beats all; doubles are the highest domino of their suit
- First to 250 points or 7 marks wins the game

---

## Quick Start

```bash
pip install flask flask-socketio eventlet
python server/fourty_two_socketio_server.py
# → open http://localhost:5000
```

Create a room, share the code with three friends, and play.

---

## Project Structure

```
FourtyTwo/
├── fourty_two_game.py      # Game engine: bidding, tricks, scoring
├── domino.py               # Domino class: comparison, pip value, suit logic
├── domino_set.py           # Full 28-domino set: shuffle & deal
├── player.py               # Hand management, move validation
├── server/
│   ├── fourty_two_socketio_server.py  # Flask-SocketIO multiplayer server
│   └── templates/index.html           # Game frontend (vanilla JS SPA)
├── docs/                   # Static GitHub Pages landing page
└── test_*.py               # Unit + integration + stress tests
```

---

## Tests

```bash
python -m unittest discover -v
```

---

## Teams

- **Team 1 (N/S):** Players 1 & 3
- **Team 2 (E/W):** Players 2 & 4
