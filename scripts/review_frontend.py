#!/usr/bin/env python3
"""
Frontend calculation review script.

Checks .tsx files for game logic / calculations that should live on the
backend (Flask/Socket.IO) instead of the frontend.

Usage:
    python3 scripts/review_frontend.py frontend/src/components/game/HandArea.tsx
    python3 scripts/review_frontend.py frontend/src/         # scan whole dir
    python3 scripts/review_frontend.py --all                 # scan all frontend/src/**/*.tsx
"""

import re
import sys
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Iterator

# ---------------------------------------------------------------------------
# Rule definitions
# ---------------------------------------------------------------------------

@dataclass
class Finding:
    file: str
    line: int
    col: int
    severity: str   # ERROR | WARN | INFO
    rule: str
    text: str
    note: str


# Each rule is (name, severity, pattern, note)
# Pattern is matched against each source line (after stripping comments).
RULES: list[tuple[str, str, re.Pattern, str]] = []

def rule(name: str, severity: str, pattern: str, note: str):
    RULES.append((name, severity, re.compile(pattern), note))


# --- Explicit game-logic duplication ---

rule(
    "VALID-PLAYS-CLIENT",
    "ERROR",
    r'\bgetValidPlays\b',
    "Suit-following logic lives in useValidPlays.ts — this mirrors the server. "
    "The server already enforces it; the frontend should only use the result for "
    "visual hints, not as the source of truth.",
)

rule(
    "TEAM-ASSIGNMENT",
    "ERROR",
    r'pnum\s*%\s*2|player_num\s*%\s*2|p\s*%\s*2',
    "Team assignment via '% 2' duplicates server logic. "
    "The server should send team membership; read it from gameState.",
)

rule(
    "TILE-COUNT-CALC",
    "ERROR",
    r'7\s*-\s*(played|trick_count|inTrick|trickCount)',
    "Tile count computed as '7 - tricks played'. "
    "The server tracks each player's hand size; it should be sent in gameState.",
)

rule(
    "SCORE-ARITHMETIC",
    "ERROR",
    r'(team[12]_score|team[12]_total|t[12]_this_hand|t[12]_gained)\s*[+\-\*\/]',
    "Arithmetic on score fields. Scores are computed server-side; "
    "the frontend should only display values sent by the server.",
)

rule(
    "BID-VALIDATION",
    "ERROR",
    r'bid\s*[<>]=?\s*\d{2}|high_bid\s*[+\-]\s*1|Math\.(max|min)\s*\(\s*30',
    "Bid range validation / incrementing belongs on the server.",
)

rule(
    "TRICK-WINNER",
    "ERROR",
    r'trump.*contains|lead_suit|high_side|trick.*winner|winner.*trick',
    "Trick winner determination mirrors server logic. "
    "Read the winner from the 'trick_complete' event payload.",
)

rule(
    "DOMINO-SCORE-VALUE",
    "WARN",
    r'(a\s*\+\s*b|pip.*sum|sum.*pip).*%\s*5',
    "Pip-count scoring (sum % 5) duplicates Domino.pip_value on the server. "
    "Send 'is_count' or 'pip_value' from the server instead.",
)

# --- Math / arithmetic on game-state variables ---

rule(
    "MATH-ON-GAMESTATE",
    "WARN",
    r'gameState\??\.[a-z_]+\s*[\+\-\*\/]\s*\d',
    "Arithmetic on a gameState field. Prefer receiving the derived value "
    "from the server rather than recomputing it on the client.",
)

rule(
    "MATH-BUILTIN",
    "WARN",
    r'\bMath\.(floor|ceil|round|trunc|abs|pow|sqrt)\b',
    "Math built-in detected. Verify this is for display/layout only, "
    "not for game logic.",
)

rule(
    "REDUCE-ON-HAND",
    "WARN",
    r'(myHand|hand|trick)\s*(\?\.)?\.(reduce|filter.*length)',
    "Aggregation over hand/trick data. If this derives a game value "
    "(count, score, validity), move it to the backend.",
)

rule(
    "MODULO-GENERAL",
    "WARN",
    r'(pnum|player|seat|turn)\w*\s*%\s*\d',
    "Modulo on a player/turn variable — often used for team or seating "
    "calculations that belong on the server.",
)

# --- Positional / seating calculations that are OK but should be audited ---

rule(
    "SEAT-OFFSET",
    "INFO",
    r'offsets?\s*\[|pnumAt\s*\(',
    "Seat-rotation helper. This is purely presentational (which direction a "
    "player appears on screen) — acceptable if it doesn't affect game rules.",
)

rule(
    "INLINE-TERNARY-LOGIC",
    "INFO",
    r'phase\s*===.*&&.*phase\s*===|bid_turn\s*===.*myPNum|play_turn\s*===.*myPNum',
    "Conditional checking whose turn it is. This is fine for UI hints but "
    "must not gate actual game actions — let server events drive those.",
)


# ---------------------------------------------------------------------------
# Comment-stripping (crude but good enough for TSX)
# ---------------------------------------------------------------------------

def strip_line_comment(line: str) -> str:
    """Remove // ... comments (respects strings minimally)."""
    in_str: str | None = None
    i = 0
    while i < len(line):
        ch = line[i]
        if in_str:
            if ch == in_str and (i == 0 or line[i-1] != '\\'):
                in_str = None
        else:
            if ch in ('"', "'", '`'):
                in_str = ch
            elif ch == '/' and i + 1 < len(line) and line[i+1] == '/':
                return line[:i]
        i += 1
    return line


# ---------------------------------------------------------------------------
# Scanner
# ---------------------------------------------------------------------------

def scan_file(path: str) -> list[Finding]:
    findings: list[Finding] = []
    try:
        src = Path(path).read_text(encoding='utf-8')
    except OSError as e:
        print(f"Cannot read {path}: {e}", file=sys.stderr)
        return findings

    lines = src.splitlines()
    for lineno, raw_line in enumerate(lines, start=1):
        line = strip_line_comment(raw_line)
        for name, severity, pattern, note in RULES:
            m = pattern.search(line)
            if m:
                findings.append(Finding(
                    file=path,
                    line=lineno,
                    col=m.start() + 1,
                    severity=severity,
                    rule=name,
                    text=raw_line.strip(),
                    note=note,
                ))
    return findings


def scan_paths(paths: list[str]) -> list[Finding]:
    all_findings: list[Finding] = []
    for p in paths:
        target = Path(p)
        if target.is_dir():
            for tsx in sorted(target.rglob('*.tsx')):
                all_findings.extend(scan_file(str(tsx)))
        elif target.exists():
            all_findings.extend(scan_file(str(target)))
        else:
            print(f"Path not found: {p}", file=sys.stderr)
    return all_findings


# ---------------------------------------------------------------------------
# Reporter
# ---------------------------------------------------------------------------

SEVERITY_ORDER = {"ERROR": 0, "WARN": 1, "INFO": 2}
SEVERITY_COLOR = {
    "ERROR": "\033[91m",  # red
    "WARN":  "\033[93m",  # yellow
    "INFO":  "\033[96m",  # cyan
}
RESET = "\033[0m"
BOLD  = "\033[1m"
DIM   = "\033[2m"

def use_color() -> bool:
    return sys.stdout.isatty()

def colorize(text: str, color: str) -> str:
    return f"{color}{text}{RESET}" if use_color() else text

def report(findings: list[Finding]) -> int:
    """Print findings and return exit code (1 if any ERROR, else 0)."""
    if not findings:
        print(colorize("✓ No issues found.", "\033[92m"))
        return 0

    findings.sort(key=lambda f: (f.file, f.line, SEVERITY_ORDER.get(f.severity, 99)))

    counts = {"ERROR": 0, "WARN": 0, "INFO": 0}
    current_file = None

    for f in findings:
        counts[f.severity] = counts.get(f.severity, 0) + 1

        if f.file != current_file:
            current_file = f.file
            print(f"\n{BOLD}{f.file}{RESET}" if use_color() else f"\n{f.file}")

        sev_str = colorize(f"[{f.severity}]", SEVERITY_COLOR.get(f.severity, ""))
        loc = f"  {f.line}:{f.col}"
        rule = colorize(f.rule, DIM) if use_color() else f.rule
        print(f"{loc}  {sev_str}  {rule}")
        print(f"       {DIM}{f.text[:120]}{RESET}" if use_color() else f"       {f.text[:120]}")
        print(f"       → {f.note}")
        print()

    # Summary
    total = sum(counts.values())
    e, w, i = counts["ERROR"], counts["WARN"], counts["INFO"]
    summary = f"\n{total} issue(s): {e} error(s), {w} warning(s), {i} info"
    if e > 0:
        print(colorize(summary, "\033[91m"))
    elif w > 0:
        print(colorize(summary, "\033[93m"))
    else:
        print(colorize(summary, "\033[96m"))

    return 1 if e > 0 else 0


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> int:
    args = sys.argv[1:]
    if not args or "--help" in args or "-h" in args:
        print(__doc__)
        return 0

    if "--all" in args:
        args = ["frontend/src"]

    findings = scan_paths(args)
    return report(findings)


if __name__ == "__main__":
    sys.exit(main())
