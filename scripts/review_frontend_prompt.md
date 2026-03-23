# Frontend Calculation Review Prompt

Paste this prompt into an LLM, followed by the contents of the `.tsx` file you want reviewed.

---

You are reviewing a React/TypeScript frontend component for a multiplayer Texas 42 (dominoes) game. The backend is a Flask-SocketIO server that is the **single source of truth** for all game logic.

**The rule:** The frontend should only display state received from the server. Any value that requires game knowledge to compute belongs on the server and should be sent in a Socket.IO event payload or `gameState`. The frontend is allowed to do purely presentational work (formatting strings, CSS math, deciding which direction a player appears on screen).

Review the file below and report every place the frontend is doing work that belongs on the backend. For each finding:
- Quote the exact line(s)
- Name the violation (e.g. "tile count calculation", "team assignment", "bid validation")
- Explain why it belongs on the server
- Suggest what the server should send instead so the frontend can just read it

**What counts as a violation:**

1. **Game logic duplication** — any calculation that mirrors a rule of Texas 42:
   - Suit-following / valid play detection
   - Trick winner determination
   - Score or pip-value computation
   - Bid range construction (`Math.max(30, highBid + 1)`)
   - Team assignment via `pnum % 2`
   - Tile count via `7 - trickCount`

2. **Derived game state** — computing something the server already knows:
   - Whether it is a player's turn
   - How many tiles an opponent holds
   - Whether a bid was made or failed

3. **Business rules encoded in UI** — magic numbers or constants from the game rules:
   - `7` (tricks per hand), `42` (max bid), `30` (min bid), `250` (points to win), `5` (count-domino divisor)
   - These should arrive as config from the server, not be hardcoded in components

**What is NOT a violation:**

- Formatting a number for display (`toFixed`, `toLocaleString`, string templates)
- CSS/layout math (progress bar percentages, pixel offsets)
- Purely visual seat rotation (which compass direction a player appears — this does not affect game outcome)
- Reading a value from `gameState` or an event payload and rendering it directly
- Local UI state (`isOpen`, `selectedTab`, hover state)

**Output format:**

For each finding, use this structure:

```
[SEVERITY] RULE-NAME
Line X: `<quoted code>`
Problem: <why this is a violation>
Fix: <what the server should send / what the frontend should do instead>
```

Severity levels:
- **ERROR** — genuine game logic on the client; must move to server
- **WARN** — likely a violation, needs discussion
- **INFO** — acceptable but worth noting (e.g. presentational-only use of a game constant)

End with a one-paragraph summary of the overall finding.

---

**File to review:**

```tsx
[PASTE FILE CONTENTS HERE]
```
