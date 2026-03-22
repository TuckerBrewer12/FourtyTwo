# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Multiplayer implementation of 42 (Texas dominoes trick-and-trump game). Python game engine + Flask-SocketIO server + vanilla JS SPA frontend.

## How to Run
```bash
# Install dependencies (use .venv in repo root)
source .venv/bin/activate
pip install -r requirements.txt

# Start server (from repo root)
python3 server/fourty_two_socketio_server.py
# → http://localhost:5000

# Run all tests
python3 -m unittest discover -v

# Run a single test file
python3 -m unittest test_fourty_two -v

# Run a single test method
python3 -m unittest test_fourty_two.test_fourtytwo.test_can_get_a_trick -v

# Console play (local, no server)
python3 console_game.py
```

## Architecture

```
Frontend (server/templates/index.html)
  ↕ Socket.IO events
Server (server/fourty_two_socketio_server.py)  ← GameRoom class manages rooms
  ↕ Python calls
Game Engine (fourty_two_game.py + domino.py + player.py + domino_set.py)
```

### Key Files
| File | Purpose |
|------|---------|
| `fourty_two_game.py` | Core game logic: bidding, tricks, scoring |
| `server/fourty_two_socketio_server.py` | Multiplayer server, GameRoom class, all Socket.IO event handlers |
| `server/templates/index.html` | Game SPA: HTML/CSS/JS, domino rendering via Canvas |
| `domino.py` | Domino class, pip value, suit/trump logic |
| `domino_set.py` | Creates & shuffles 28-domino set, deals to 4 players |
| `player.py` | Hand management, move validation |
| `console_game.py` | Local console UI |
| `docs/index.html` | GitHub Pages marketing landing page |

### Tests
Each engine module has a corresponding test file (`test_domino.py`, `test_player.py`, `test_domino_set.py`, `test_fourty_two.py`). `test_fourty_two_server.py` tests Socket.IO event handling via Flask-SocketIO's test client (no live server needed). `test_stress.py` runs concurrent game simulations.

### Socket.IO Event Flow
- **Lobby**: `create_room` → `join_game` / `join_spectator` → `game_started` (when 4 players)
- **Bidding**: `bid` → `bid_placed` → `bidding_complete`
- **Trump**: `set_trump` → `trump_set`
- **Playing**: `play` → `domino_played` → `trick_complete` → `hand_complete`
- **Chat**: `send_chat` (emoji-only validation) → `chat_message`
- **State**: `request_state` → `game_state`

## Game Rules Summary
- 4 players, 2 teams (N/S vs E/W), 7 tricks per hand
- 42 points per hand: 7 trick-points + 35 pip-points (dominoes divisible by 5)
- Bid 30–42; high bidder sets trump; must follow suit if able; doubles highest of their suit
- Two game modes: first to 250 cumulative points, or first to 7 marks
- If all pass, dealer forced to bid 30

## Dependencies
```
flask>=2.3.0
flask-socketio>=5.3.0
python-socketio>=5.10.0
eventlet>=0.33.3
```
Python 3.10+ required (uses `X | Y` union type syntax).

## Known Issues / Glaring Problems
See README for full context. Key issues:

1. **`app/` directory is dead code** — has subdirs (`game_engine/`, `schemas/`, `services/`, `ws/`) but only `__pycache__` inside; apparently an abandoned refactor attempt.
2. **`domino_new.py` is dead code** — a slightly different version of `domino.py` sitting in the repo root; not imported anywhere.
3. **No persistence** — all game state is in RAM; server crash loses all active games; no DB/Redis.
4. **Hardcoded secret key** — `"fortytwo-secret-2025"` is the default; fine for dev but should be set via env var in prod.
5. **Duplicate import** — `from domino import Domino` appears twice at top of `fourty_two_game.py`.
6. **Two server files** — `server/fourty_two_server.py` (old REST API, incomplete) coexists with the current `fourty_two_socketio_server.py`; the old one is dead code.
7. **No player name sanitization** — names are injected into HTML without sanitization (low risk given emoji-only chat, but worth noting).
8. **Global JS state** — frontend manages state in global variables (`gameState`, `myPNum`, `roomId`); fine for current scope but fragile at scale.
9. **`pages.yml` targets `main` branch** — repo's default/active branch is `master`; GitHub Pages auto-deploy will never trigger unless pushed to `main`.
