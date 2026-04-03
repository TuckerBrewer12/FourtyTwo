# FourtyTwo
**Live Demo:** https://tuckerbrewer12.github.io/FourtyTwo/

A multiplayer implementation of **42**, an East Texas domino game. Similar to Spades but with dominoes — four players, two teams, bidding, and trumps.

---

<img width="2850" height="1716" alt="image" src="https://github.com/user-attachments/assets/102a7a75-eeb1-4cca-94a0-59154d3023a3" />

---

## How It Works

### Scoring
- 7 tricks per hand, worth **1 point each**
- Dominoes whose numbers sum to a multiple of 5 carry **bonus points** (e.g. `[5|0]` = 5pts, `[6|4]` = 10pts)
- **42 total points** per hand (7 trick-points + 35 possible-points)

### Bidding
- Players bid 30–42; highest bidder names trump for the hand
- Must make your bid or the other team scores those points
- Special bids (**"low"**, **"42"**) can be staked with marks to increase the reward

### Trick Play
- Must follow suit (lead domino's high side) if able
- Trump beats all; doubles are the highest domino of their suit
- First 7 marks wins the game
  
---

## Teams
- **Team 1:** Players 1 & 3
- **Team 2:** Players 2 & 4
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
├── console_game.py         # Local CLI game runner
│
├── frontend/               # React/TypeScript SPA (source)
│   └── src/
│
├── server/
│   ├── fourty_two_socketio_server.py  # Flask-SocketIO multiplayer server
│   └── static/                        # Built frontend served by Flask
│
├── docs/                   # Static GitHub Pages landing page
├── Dockerfile              # Container build
├── Procfile / railway.json # Railway deploy config
│
└── test_*.py               # Unit + integration + stress tests
```
