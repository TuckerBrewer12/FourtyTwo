import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import DominoTile from '../domino/Domino'
import type { Domino as DominoT } from '../../types/game'

/* ═══════════════════════════════════════════════
   INLINE MINI DOMINO
   ═══════════════════════════════════════════════ */
function Mini({ a, b }: { a: number; b: number }) {
  return <DominoTile a={a} b={b} size="xs" />
}
function D({ a, b, children }: { a: number; b: number; children?: React.ReactNode }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, verticalAlign: 'middle' }}>
      <Mini a={a} b={b} />
      {children && <span>{children}</span>}
    </span>
  )
}

/* ═══════════════════════════════════════════════
   PRESET HANDS
   ═══════════════════════════════════════════════ */
const STARTING_HANDS: Record<number, DominoT[]> = {
  1: [[5,5],[5,0],[5,3],[5,1],[6,4],[3,1],[2,0]],
  2: [[4,4],[3,3],[2,2],[1,0],[6,2],[0,0],[4,0]],
  3: [[6,6],[6,3],[5,4],[5,2],[4,1],[2,1],[3,0]],
  4: [[6,5],[6,1],[6,0],[4,3],[4,2],[3,2],[1,1]],
}
const NAMES: Record<number, string> = { 1: 'You', 2: 'Bot East', 3: 'Partner', 4: 'Bot West' }
const SUIT_NAMES = ['Blanks','Aces','Deuces','Threes','Fours','Fives','Sixes']

/* ═══════════════════════════════════════════════
   STEP TYPE
   ═══════════════════════════════════════════════ */
type TutScreen = 'lobby' | 'game'
// Where to place the coach bubble relative to the highlighted element
type BubbleAnchor = 'below' | 'above' | 'right' | 'center'

interface TutStep {
  screen: TutScreen
  title: string
  body: React.ReactNode
  // What to spotlight-highlight (data-tut="xxx" attribute)
  target?: string
  anchor?: BubbleAnchor
  // Game state
  phase?: 'deal' | 'bidding' | 'trump' | 'playing' | 'done'
  hands?: Record<number, DominoT[]>
  trick?: { player: number; domino: DominoT }[]
  trump?: number | null
  score?: number
  tricksWon?: number
  feltText?: string
  highlight?: number[]
  lobbyTab?: 'create' | 'join'
}

function removeFromHand(hands: Record<number, DominoT[]>, player: number, domino: DominoT): Record<number, DominoT[]> {
  const copy: Record<number, DominoT[]> = {}
  for (const k of Object.keys(hands)) { const p = Number(k); copy[p] = [...hands[p]] }
  copy[player] = copy[player].filter(([a, b]) => !(a === domino[0] && b === domino[1]))
  return copy
}
function removeManyFromHands(hands: Record<number, DominoT[]>, removals: [number, DominoT][]): Record<number, DominoT[]> {
  let h = hands; for (const [p, d] of removals) h = removeFromHand(h, p, d); return h
}

/* ═══════════════════════════════════════════════
   BUILD ALL STEPS
   ═══════════════════════════════════════════════ */
function buildSteps(): TutStep[] {
  const h0 = JSON.parse(JSON.stringify(STARTING_HANDS)) as Record<number, DominoT[]>
  const steps: TutStep[] = []

  /* ─── LOBBY ─── */
  steps.push({
    screen: 'lobby', lobbyTab: 'create', anchor: 'center',
    title: 'Welcome!',
    body: <>42 is a classic Texas trick-taking domino game. 4 players, 2 teams, and a whole lot of fun. Let's walk through how it all works!</>,
  })
  steps.push({
    screen: 'lobby', lobbyTab: 'create', target: 'tut-create-tab', anchor: 'below',
    title: 'Create a Game',
    body: <>To start playing, one person hits "Create Game". You'll enter your name, pick a game mode, and get a 6-letter room code to share with your friends.</>,
  })
  steps.push({
    screen: 'lobby', lobbyTab: 'create', target: 'tut-name-field', anchor: 'right',
    title: 'Enter Your Name',
    body: <>Type your name here so everyone at the table knows who you are.</>,
  })
  steps.push({
    screen: 'lobby', lobbyTab: 'create', target: 'tut-mode-picker', anchor: 'below',
    title: 'Pick a Game Mode',
    body: <>250 Points — teams add up points across hands. First to 250 wins.{'\n\n'}7 Marks — win a hand to earn a mark. First to 7 marks wins the match.</>,
  })
  steps.push({
    screen: 'lobby', lobbyTab: 'create', target: 'tut-create-btn', anchor: 'above',
    title: 'Create the Room',
    body: <>Hit this button and you'll get a waiting room with a room code. Send that code to 3 friends so they can join!</>,
  })
  steps.push({
    screen: 'lobby', lobbyTab: 'join', target: 'tut-join-tab', anchor: 'below',
    title: 'Joining a Game',
    body: <>If a friend already made a room, switch to "Join Game" instead.</>,
  })
  steps.push({
    screen: 'lobby', lobbyTab: 'join', target: 'tut-room-code', anchor: 'below',
    title: 'Enter the Room Code',
    body: <>Type the 6-letter code your friend gave you and hit Join. Once 4 players are in, the game starts automatically!</>,
  })

  /* ─── GAME: DEAL ─── */
  steps.push({
    screen: 'game', anchor: 'center',
    phase: 'deal', hands: h0, trick: [], trump: null, score: 0, tricksWon: 0,
    title: 'Your Hand is Dealt',
    body: <>Each player gets 7 dominoes from a double-six set (28 tiles total). You're at the bottom — your partner sits across from you at the top. You two are a team!</>,
  })
  steps.push({
    screen: 'game', target: 'tut-hand', anchor: 'above',
    phase: 'deal', hands: h0, trick: [], trump: null, score: 0, tricksWon: 0,
    highlight: [0, 1],
    title: 'Your Hand Looks Great!',
    body: <span>Look — you've got four tiles with 5s on them! Plus two count dominoes: <D a={5} b={5}>= 10 pts</D> and <D a={5} b={0}>= 5 pts</D>. Those are worth points when you win tricks.</span>,
  })
  steps.push({
    screen: 'game', anchor: 'center',
    phase: 'deal', hands: h0, trick: [], trump: null, score: 0, tricksWon: 0,
    title: 'What Are Count Dominoes?',
    body: <span>
      Five special tiles are worth points:
      <span style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Mini a={5} b={5} /> = 10 pts</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Mini a={6} b={4} /> = 10 pts</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Mini a={5} b={0} /> = 5 pts</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Mini a={4} b={1} /> = 5 pts</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Mini a={3} b={2} /> = 5 pts</span>
      </span>
      <span style={{ display: 'block', marginTop: 8 }}>That's 35 pts from counts + 1 pt per trick (7 tricks) = 42 points each hand.</span>
    </span>,
  })

  /* ─── BIDDING ─── */
  steps.push({
    screen: 'game', target: 'tut-felt', anchor: 'above',
    phase: 'bidding', hands: h0, trick: [], trump: null, score: 0, tricksWon: 0,
    feltText: 'Bidding begins...',
    title: 'Time to Bid',
    body: <>Before playing, everyone bids on how many points their team will capture. Minimum bid is 30. You can pass if your hand isn't strong enough. The winner gets to pick the trump suit!</>,
  })
  steps.push({
    screen: 'game', target: 'tut-felt', anchor: 'above',
    phase: 'bidding', hands: h0, trick: [], trump: null, score: 0, tricksWon: 0,
    feltText: 'You bid 30!',
    title: 'You Bid 30',
    body: <span>With four 5s in your hand, you can safely bid 30. You're betting your team will score at least 30 of the 42 points.</span>,
  })
  steps.push({
    screen: 'game', target: 'tut-felt', anchor: 'above',
    phase: 'bidding', hands: h0, trick: [], trump: null, score: 0, tricksWon: 0,
    feltText: 'All pass — You won the bid!',
    title: 'Everyone Passes',
    body: <>Bot East passes. Your partner passes. Bot West passes. Nobody could beat your bid — you won it! If everyone had passed (including you), the dealer would be forced to bid 30.</>,
  })

  /* ─── TRUMP ─── */
  steps.push({
    screen: 'game', target: 'tut-trump', anchor: 'right',
    phase: 'trump', hands: h0, trick: [], trump: 5, score: 0, tricksWon: 0,
    title: 'You Pick Trump: Fives',
    body: <span>Since you won the bid, you choose the trump suit. You have four 5s, so you pick <strong>Fives</strong>. Any domino with a 5 on it is now a trump — it beats every non-trump tile!</span>,
  })
  steps.push({
    screen: 'game', target: 'tut-hand', anchor: 'above',
    phase: 'trump', hands: h0, trick: [], trump: 5, score: 0, tricksWon: 0,
    highlight: [0, 1, 2, 3],
    title: 'How Trump Works',
    body: <span>
      Your highlighted tiles are all trump now:
      <span style={{ display: 'block', marginTop: 6 }}>
        • <D a={5} b={5} /> is the HIGHEST domino in the entire game (double trump)
      </span>
      <span style={{ display: 'block' }}>
        • Among trumps, the non-5 side decides rank
      </span>
      <span style={{ display: 'block', marginTop: 6 }}>
        That's why you lead with your best trump first!
      </span>
    </span>,
  })

  /* ─── TRICK 1 ─── */
  const h1a = removeFromHand(h0, 1, [5,5])
  steps.push({
    screen: 'game', target: 'tut-felt', anchor: 'above',
    phase: 'playing', hands: h1a, trick: [{ player: 1, domino: [5,5] }], trump: 5, score: 0, tricksWon: 0,
    title: 'Trick 1 — You Lead',
    body: <span>You lead with <D a={5} b={5} /> — the double-five! It's the highest trump in the game. Nobody can beat it, AND it's worth 10 points.</span>,
  })

  const t1_full = [
    { player: 1, domino: [5,5] as DominoT },
    { player: 2, domino: [4,0] as DominoT },
    { player: 3, domino: [5,4] as DominoT },
    { player: 4, domino: [6,5] as DominoT },
  ]
  const h1b = removeManyFromHands(h1a, [[2,[4,0]], [3,[5,4]], [4,[6,5]]])

  steps.push({
    screen: 'game', target: 'tut-felt', anchor: 'above',
    phase: 'playing', hands: h1b, trick: t1_full, trump: 5, score: 0, tricksWon: 0,
    title: 'Trick 1 — Everyone Plays',
    body: <span>
      Bot East has no 5s — throws away <D a={4} b={0} />.{'\n'}
      Your partner plays <D a={5} b={4} /> — trump (rank 4).{'\n'}
      Bot West plays <D a={6} b={5} /> — trump (rank 6).{'\n\n'}
      The highest trump wins! Doubles are always the top of their suit, so <D a={5} b={5} /> beats them all.
    </span>,
  })

  steps.push({
    screen: 'game', target: 'tut-score', anchor: 'below',
    phase: 'playing', hands: h1b, trick: [], trump: 5, score: 11, tricksWon: 1,
    feltText: 'Trick 1: You win! +11 pts',
    title: 'You Won the Trick!',
    body: <span>+11 points: 10 from the <D a={5} b={5} /> count domino + 1 for winning the trick. You lead again!</span>,
  })

  /* ─── TRICK 2 ─── */
  const h2a = removeFromHand(h1b, 1, [5,0])
  steps.push({
    screen: 'game', target: 'tut-felt', anchor: 'above',
    phase: 'playing', hands: h2a, trick: [{ player: 1, domino: [5,0] }], trump: 5, score: 11, tricksWon: 1,
    title: 'Trick 2 — Lead the 5/0',
    body: <span>Next you lead <D a={5} b={0} /> — another trump tile and worth 5 count points. You're pulling trumps out of opponents while grabbing count!</span>,
  })

  const t2_full = [
    { player: 1, domino: [5,0] as DominoT },
    { player: 2, domino: [1,0] as DominoT },
    { player: 3, domino: [5,2] as DominoT },
    { player: 4, domino: [4,3] as DominoT },
  ]
  const h2b = removeManyFromHands(h2a, [[2,[1,0]], [3,[5,2]], [4,[4,3]]])

  steps.push({
    screen: 'game', target: 'tut-felt', anchor: 'above',
    phase: 'playing', hands: h2b, trick: t2_full, trump: 5, score: 11, tricksWon: 1,
    title: 'Trick 2 — The Table',
    body: <span>
      Bot East throws <D a={1} b={0} /> (no trump). Partner plays <D a={5} b={2} /> — also trump! Bot West plays <D a={4} b={3} /> (no trump).{'\n\n'}
      The highest trump wins. Among trumps, the non-5 side decides rank: <D a={5} b={2} /> (rank 2) beats <D a={5} b={0} /> (rank 0). Your partner takes it — but that's great, they're on your team!
    </span>,
  })

  steps.push({
    screen: 'game', target: 'tut-score', anchor: 'below',
    phase: 'playing', hands: h2b, trick: [], trump: 5, score: 17, tricksWon: 2,
    feltText: 'Trick 2: Partner wins! +6 pts',
    title: 'Your Team Wins!',
    body: <span>Your partner took the trick with the higher trump. That's +6 for your team (5 from <D a={5} b={0} /> count + 1 for the trick). You're at 17 — only 13 more to make your bid of 30!</span>,
  })

  /* ─── WRAP UP ─── */
  steps.push({
    screen: 'game', anchor: 'center',
    phase: 'done', hands: h2b, trick: [], trump: 5, score: 17, tricksWon: 2,
    feltText: 'Tutorial Complete!',
    title: 'What Happens at the End',
    body: <>You'd keep playing all 7 tricks. At the end:{'\n\n'}
      • If your team scored ≥ 30 (your bid) → both teams keep their points{'\n'}
      • If you scored {'<'} 30 → your team gets 0 and opponents get the bid value plus their points{'\n\n'}
      First to 250 points (or 7 marks) wins the match!</>,
  })
  steps.push({
    screen: 'game', anchor: 'center',
    phase: 'done', hands: h2b, trick: [], trump: 5, score: 17, tricksWon: 2,
    feltText: 'Tutorial Complete!',
    title: 'Quick Recap',
    body: <>
      1. Each player gets 7 dominoes{'\n'}
      2. Bid on how many pts your team will take (30–42){'\n'}
      3. Bid winner picks the trump suit{'\n'}
      4. Play 7 tricks — follow suit if you can{'\n'}
      5. Count tiles are worth 5 or 10 points{'\n'}
      6. Make your bid → keep points. Miss → opponents get everything{'\n\n'}
      That's it — you're ready to play for real!
    </>,
  })
  steps.push({
    screen: 'game', anchor: 'center',
    phase: 'done', hands: h2b, trick: [], trump: 5, score: 17, tricksWon: 2,
    feltText: 'Tutorial Complete!',
    title: 'You\'re Ready!',
    body: <>Head back to the lobby, create a game, and invite 3 friends. Good luck!</>,
  })

  return steps
}

const ALL_STEPS = buildSteps()

/* ═══════════════════════════════════════════════
   SPOTLIGHT OVERLAY
   Cuts a hole around the target element
   ═══════════════════════════════════════════════ */
function Spotlight({ rect }: { rect: DOMRect | null }) {
  if (!rect) return null
  const p = 6
  return (
    <>
      {/* Dark overlay with cutout */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 240, pointerEvents: 'none',
        background: 'rgba(0,0,0,.45)',
        clipPath: `polygon(
          0% 0%, 0% 100%,
          ${rect.left - p}px 100%,
          ${rect.left - p}px ${rect.top - p}px,
          ${rect.right + p}px ${rect.top - p}px,
          ${rect.right + p}px ${rect.bottom + p}px,
          ${rect.left - p}px ${rect.bottom + p}px,
          ${rect.left - p}px 100%,
          100% 100%, 100% 0%
        )`,
      }} />
      {/* Glowing border around target */}
      <div style={{
        position: 'fixed',
        top: rect.top - p, left: rect.left - p,
        width: rect.width + p * 2, height: rect.height + p * 2,
        borderRadius: 'var(--radius)',
        border: '2.5px solid var(--accent)',
        zIndex: 241, pointerEvents: 'none',
        animation: 'tutPulse 2s ease infinite',
        boxShadow: '0 0 20px rgba(0,109,91,.3)',
      }} />
    </>
  )
}

/* ═══════════════════════════════════════════════
   MAIN TUTORIAL
   ═══════════════════════════════════════════════ */
export default function Tutorial({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const cur = ALL_STEPS[step]

  // Measure the target element after render
  useLayoutEffect(() => {
    if (!cur.target) { setTargetRect(null); return }
    // Small delay so DOM settles (tab switches etc)
    const t = setTimeout(() => {
      const el = containerRef.current?.querySelector(`[data-tut="${cur.target}"]`)
      if (el) {
        setTargetRect(el.getBoundingClientRect())
      } else {
        setTargetRect(null)
      }
    }, 30)
    return () => clearTimeout(t)
  }, [step, cur.target])

  // Remeasure on resize
  useEffect(() => {
    if (!cur.target) return
    const handler = () => {
      const el = containerRef.current?.querySelector(`[data-tut="${cur.target}"]`)
      if (el) setTargetRect(el.getBoundingClientRect())
    }
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [step, cur.target])

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' || e.key === 'Enter') advance()
      if (e.key === 'ArrowLeft' && step > 0) setStep(s => s - 1)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

  function advance() {
    if (step >= ALL_STEPS.length - 1) { onClose(); return }
    setStep(s => s + 1)
  }
  const isLast = step >= ALL_STEPS.length - 1

  // Compute bubble position based on target rect + anchor
  function getBubbleStyle(): React.CSSProperties {
    const anchor = cur.anchor ?? 'center'
    if (anchor === 'center' || !targetRect) {
      return { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
    }
    const gap = 16
    const bubbleH = 220 // estimated bubble height
    const vw = window.innerWidth
    const vh = window.innerHeight
    const clampLeft = (x: number) => Math.max(12, Math.min(x, vw - 412))
    const centeredLeft = clampLeft(targetRect.left + targetRect.width / 2 - 200)

    if (anchor === 'below') {
      let top = targetRect.bottom + gap
      // If it would go off screen, flip to above or clamp
      if (top + bubbleH > vh - 12) {
        const aboveTop = targetRect.top - gap - bubbleH
        if (aboveTop > 12) {
          return { position: 'fixed', top: aboveTop, left: centeredLeft }
        }
        // Both directions overflow — just clamp to bottom
        top = Math.max(12, vh - bubbleH - 12)
      }
      return { position: 'fixed', top, left: centeredLeft }
    }
    if (anchor === 'above') {
      let top = targetRect.top - gap - bubbleH
      // If it would go off screen, flip to below or clamp
      if (top < 12) {
        const belowTop = targetRect.bottom + gap
        if (belowTop + bubbleH < vh - 12) {
          return { position: 'fixed', top: belowTop, left: centeredLeft }
        }
        top = 12
      }
      return { position: 'fixed', top, left: centeredLeft }
    }
    // 'right'
    return {
      position: 'fixed',
      top: Math.max(12, Math.min(targetRect.top + targetRect.height / 2 - 80, vh - bubbleH - 12)),
      left: Math.min(targetRect.right + gap, vw - 412),
    }
  }

  /* ─────── LOBBY SCREEN ─────── */
  if (cur.screen === 'lobby') {
    const tab = cur.lobbyTab ?? 'create'
    return (
      <div ref={containerRef} style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'var(--bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
      }}>
        <style>{`
          @keyframes tutFadeIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
          @keyframes tutPulse { 0%,100%{box-shadow:0 0 0 0 rgba(0,109,91,.35)} 50%{box-shadow:0 0 0 10px rgba(0,109,91,0)} }
          @keyframes tutGlow { 0%,100%{border-color:var(--accent)} 50%{border-color:var(--success)} }
        `}</style>

        <div style={{ width: '100%', maxWidth: 400 }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '4rem', fontWeight: 800, letterSpacing: '-.02em', color: 'var(--accent)', lineHeight: 1 }}>42</div>
            <p style={{ color: 'var(--text-muted)', fontSize: '.82rem', marginTop: '.3rem', letterSpacing: '.06em', textTransform: 'uppercase' }}>
              Texas Domino · Double-Six · 4 Players
            </p>
          </div>

          {/* Fake lobby card — fully visible, not dimmed */}
          <div style={{
            background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow)', padding: '1.75rem',
            border: '1px solid var(--border)',
            pointerEvents: 'none',
          }}>
            {/* Tabs */}
            <div style={{
              display: 'flex', background: 'var(--bg)', borderRadius: 'var(--radius)',
              padding: '.2rem', gap: '.2rem', marginBottom: '1.25rem',
            }}>
              <div data-tut="tut-create-tab" style={{
                flex: 1, padding: '.5rem', borderRadius: '7px', fontWeight: 600, fontSize: '.85rem',
                textAlign: 'center',
                background: tab === 'create' ? 'var(--surface)' : 'transparent',
                color: tab === 'create' ? 'var(--text)' : 'var(--text-muted)',
                boxShadow: tab === 'create' ? 'var(--shadow-sm)' : 'none',
              }}>Create Game</div>
              <div data-tut="tut-join-tab" style={{
                flex: 1, padding: '.5rem', borderRadius: '7px', fontWeight: 600, fontSize: '.85rem',
                textAlign: 'center',
                background: tab === 'join' ? 'var(--surface)' : 'transparent',
                color: tab === 'join' ? 'var(--text)' : 'var(--text-muted)',
                boxShadow: tab === 'join' ? 'var(--shadow-sm)' : 'none',
              }}>Join Game</div>
            </div>

            {tab === 'create' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div data-tut="tut-name-field">
                  <FakeField label="Your Name" placeholder="e.g. Texas Pete" />
                </div>
                <div data-tut="tut-mode-picker">
                  <FakeField label="Game Mode">
                    <div style={{ display: 'flex', gap: '.4rem' }}>
                      <span style={{
                        padding: '.4rem .9rem', borderRadius: '20px', fontWeight: 600, fontSize: '.82rem',
                        border: '1.5px solid var(--accent)', background: 'var(--accent-light)', color: 'var(--accent)',
                      }}>250 Points</span>
                      <span style={{
                        padding: '.4rem .9rem', borderRadius: '20px', fontWeight: 600, fontSize: '.82rem',
                        border: '1.5px solid var(--border)', color: 'var(--text-muted)',
                      }}>7 Marks</span>
                    </div>
                  </FakeField>
                </div>
                <div data-tut="tut-create-btn" style={{
                  background: 'var(--accent)', color: '#fff', padding: '.75rem',
                  borderRadius: 'var(--radius)', fontWeight: 700, fontSize: '.95rem', textAlign: 'center',
                }}>Create Game</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <FakeField label="Your Name" placeholder="e.g. Texas Pete" />
                <div data-tut="tut-room-code">
                  <FakeField label="Room Code" placeholder="ABCDEF" big />
                </div>
                <div style={{
                  background: 'var(--accent)', color: '#fff', padding: '.75rem',
                  borderRadius: 'var(--radius)', fontWeight: 700, fontSize: '.95rem', textAlign: 'center',
                }}>Join Game</div>
              </div>
            )}
          </div>
        </div>

        {/* Spotlight */}
        <Spotlight rect={targetRect} />

        {/* Coach bubble */}
        <div key={step} style={{ ...getBubbleStyle(), zIndex: 250, maxWidth: 400, width: 'calc(100vw - 1.5rem)', animation: 'tutFadeIn .2s ease' }}>
          <BubbleContent
            step={cur} stepNum={step} total={ALL_STEPS.length}
            onNext={advance} onBack={step > 0 ? () => setStep(s => s - 1) : undefined}
            onClose={onClose} isLast={isLast}
          />
        </div>
      </div>
    )
  }

  /* ─────── GAME SCREEN ─────── */
  const myHands = cur.hands ?? STARTING_HANDS
  const trick = cur.trick ?? []

  return (
    <div ref={containerRef} style={{
      position: 'fixed', inset: 0, zIndex: 200,
      display: 'flex', flexDirection: 'column',
      background: 'linear-gradient(135deg, var(--bg-start) 0%, #f8faf9 50%, var(--bg-end) 100%)',
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes tutFadeIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
        @keyframes tutPulse { 0%,100%{box-shadow:0 0 0 0 rgba(0,109,91,.35)} 50%{box-shadow:0 0 0 10px rgba(0,109,91,0)} }
        @keyframes tutGlow { 0%,100%{border-color:var(--accent)} 50%{border-color:var(--success)} }
      `}</style>

      {/* Top Bar */}
      <div style={{
        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 1.25rem', flexShrink: 0,
      }}>
        <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--accent)' }}>FortyTwo</span>
        <div data-tut="tut-score" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{
            background: 'linear-gradient(135deg, var(--accent), #008c73)',
            color: '#fff', padding: '.25rem .85rem', borderRadius: 'var(--radius-pill)',
            fontSize: '.72rem', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase',
          }}>Tutorial</span>
          <span style={{ fontSize: '.82rem', fontWeight: 700, color: 'var(--accent)' }}>Score: {cur.score ?? 0}</span>
          <span style={{ fontSize: '.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Tricks: {cur.tricksWon ?? 0}/7</span>
        </div>
        <button onClick={onClose} style={{
          background: 'var(--surface-soft)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-pill)', padding: '.35rem .85rem',
          fontSize: '.78rem', fontWeight: 600, cursor: 'pointer', color: 'var(--text-muted)',
        }}>Exit Tutorial</button>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Left Sidebar */}
        <div style={{
          width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '.6rem',
          padding: '1rem .85rem', borderRight: '1px solid var(--border)', overflowY: 'auto',
        }}>
          <div style={{ fontSize: '.68rem', fontWeight: 800, color: 'var(--accent)', letterSpacing: '.12em', textTransform: 'uppercase' }}>
            Tutorial Hand
          </div>
          {[1,2,3,4].map(p => {
            const isMe = p === 1
            const team = p % 2 === 1 ? 1 : 2
            const color = team === 1 ? 'var(--t1)' : 'var(--t2)'
            return (
              <div key={p} style={{
                background: isMe ? 'var(--accent-light)' : 'var(--surface)',
                borderRadius: 'var(--radius-sm)', padding: '.5rem .6rem',
                border: isMe ? '1px solid rgba(0,109,91,.2)' : '1px solid var(--border)',
                boxShadow: 'var(--shadow-neu-sm)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '.78rem', fontWeight: 700, color: isMe ? 'var(--accent)' : 'var(--text)' }}>{NAMES[p]}</span>
                  <span style={{ fontSize: '.62rem', color, fontWeight: 700, textTransform: 'uppercase' }}>Team {team}</span>
                </div>
                <div style={{ fontSize: '.65rem', color: 'var(--text-faint)', marginTop: '.15rem' }}>{myHands[p].length} tiles</div>
              </div>
            )
          })}
          {cur.trump != null && (
            <div data-tut="tut-trump" style={{
              background: `var(--suit-${cur.trump})`, borderRadius: 'var(--radius)',
              padding: '.6rem', textAlign: 'center',
            }}>
              <div style={{ fontSize: '.6rem', color: 'rgba(255,255,255,.7)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>Trump</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff' }}>{SUIT_NAMES[cur.trump]}</div>
            </div>
          )}
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: '.7rem', color: 'var(--text-faint)', textAlign: 'center', padding: '.5rem 0' }}>
            Step {step + 1} / {ALL_STEPS.length}
          </div>
        </div>

        {/* Board */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          {/* North */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '.5rem 0' }}>
            <PlayerPill name="Partner" tileCount={myHands[3].length} isPartner />
          </div>

          {/* Table */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'stretch', minHeight: 0, padding: '0 .5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', paddingRight: '.5rem' }}>
              <PlayerPill name="Bot West" tileCount={myHands[4].length} vertical />
            </div>

            {/* Felt */}
            <div data-tut="tut-felt" style={{
              flex: 1, margin: '4px', borderRadius: 16,
              background: 'var(--table-felt)',
              backgroundImage: 'radial-gradient(rgba(0,0,0,.12) 1.5px, transparent 1.5px)',
              backgroundSize: '10px 10px',
              boxShadow: 'inset 0 4px 20px rgba(0,0,0,.15), 0 4px 24px rgba(0,0,0,.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative', minHeight: 200,
            }}>
              {trick.length > 0 ? (
                <div style={{ display: 'flex', gap: '.6rem', alignItems: 'center' }}>
                  {trick.map((t, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.25rem', animation: 'tutFadeIn .3s ease' }}>
                      <DominoTile a={t.domino[0]} b={t.domino[1]} size="lg" inTrick vertical />
                      <span style={{ fontSize: '.6rem', color: 'rgba(255,255,255,.7)', fontWeight: 600 }}>{NAMES[t.player]}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'rgba(255,255,255,.5)' }}>
                    {cur.feltText ?? (cur.phase === 'deal' ? 'Hand dealt' : '')}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', paddingLeft: '.5rem' }}>
              <PlayerPill name="Bot East" tileCount={myHands[2].length} vertical />
            </div>
          </div>

          {/* Hand area */}
          <div data-tut="tut-hand" style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '.5rem 1rem 1rem', flexShrink: 0, gap: '.4rem',
          }}>
            <div style={{
              background: 'rgba(255,255,255,.85)', backdropFilter: 'blur(8px)',
              borderRadius: 'var(--radius-pill)', padding: '.25rem .85rem',
              fontSize: '.72rem', fontWeight: 700, color: 'var(--text-muted)',
            }}>Your hand</div>
            <div style={{
              background: 'var(--surface)', borderRadius: 'var(--radius-xl)',
              boxShadow: 'var(--shadow-neu)', padding: '.75rem 1rem',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.35rem',
            }}>
              {myHands[1].length === 0 ? (
                <div style={{ width: 180, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.75rem', color: 'var(--text-faint)' }}>No tiles</div>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: '.4rem' }}>
                    {myHands[1].slice(0, 3).map(([a, b], i) => {
                      const isHL = cur.highlight?.includes(i)
                      return (
                        <div key={`${a}-${b}`} style={{ position: 'relative', borderRadius: 10, animation: isHL ? 'tutPulse 1.5s ease infinite' : 'none' }}>
                          {isHL && <div style={{ position: 'absolute', inset: -4, borderRadius: 14, border: '2.5px solid var(--accent)', animation: 'tutGlow 1.5s ease infinite', zIndex: 1, pointerEvents: 'none' }} />}
                          <DominoTile a={a} b={b} size="lg" />
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: '.4rem' }}>
                    {myHands[1].slice(3, 7).map(([a, b], i) => {
                      const idx = i + 3
                      const isHL = cur.highlight?.includes(idx)
                      return (
                        <div key={`${a}-${b}`} style={{ position: 'relative', borderRadius: 10, animation: isHL ? 'tutPulse 1.5s ease infinite' : 'none' }}>
                          {isHL && <div style={{ position: 'absolute', inset: -4, borderRadius: 14, border: '2.5px solid var(--accent)', animation: 'tutGlow 1.5s ease infinite', zIndex: 1, pointerEvents: 'none' }} />}
                          <DominoTile a={a} b={b} size="lg" />
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Spotlight */}
      <Spotlight rect={targetRect} />

      {/* Coach bubble */}
      <div key={step} style={{ ...getBubbleStyle(), zIndex: 250, maxWidth: 400, width: 'calc(100vw - 1.5rem)', animation: 'tutFadeIn .2s ease' }}>
        <BubbleContent
          step={cur} stepNum={step} total={ALL_STEPS.length}
          onNext={advance} onBack={step > 0 ? () => setStep(s => s - 1) : undefined}
          onClose={onClose} isLast={isLast}
        />
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   COACH BUBBLE CONTENT
   ═══════════════════════════════════════════════ */
function BubbleContent({ step, stepNum, total, onNext, onBack, onClose, isLast }: {
  step: TutStep; stepNum: number; total: number;
  onNext: () => void; onBack?: () => void; onClose: () => void; isLast: boolean;
}) {
  return (
    <div style={{
      background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
      padding: '1.25rem 1.5rem',
      boxShadow: '0 20px 60px rgba(0,0,0,.25), 0 0 0 1px rgba(0,0,0,.06)',
      maxHeight: 'calc(100vh - 24px)', overflowY: 'auto',
    }}>
      {/* Progress bar */}
      <div style={{ display: 'flex', gap: 3, marginBottom: '.75rem' }}>
        {Array.from({ length: total }, (_, i) => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i <= stepNum ? 'var(--accent)' : 'var(--border)',
            transition: 'background .3s ease',
          }} />
        ))}
      </div>

      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text)', margin: '0 0 .5rem', lineHeight: 1.3 }}>
        {step.title}
      </h3>
      <div style={{ fontSize: '.84rem', lineHeight: 1.7, color: 'var(--text-muted)' }}>
        {step.body}
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginTop: '1rem', gap: '.5rem',
      }}>
        <button onClick={onClose} style={{
          background: 'transparent', color: 'var(--text-faint)',
          fontSize: '.76rem', cursor: 'pointer', padding: '.35rem .5rem',
        }}>Exit tutorial</button>
        <div style={{ display: 'flex', gap: '.4rem' }}>
          {onBack && (
            <button onClick={onBack} style={{
              background: 'var(--bg)', color: 'var(--text-muted)',
              padding: '.5rem 1rem', borderRadius: 'var(--radius)',
              fontWeight: 600, fontSize: '.82rem', cursor: 'pointer',
              border: '1px solid var(--border)',
            }}>Back</button>
          )}
          <button onClick={onNext} style={{
            background: 'var(--accent)', color: '#fff',
            padding: '.5rem 1.2rem', borderRadius: 'var(--radius)',
            fontWeight: 700, fontSize: '.82rem', cursor: 'pointer',
            border: 'none', transition: 'background .15s ease',
          }}
            onMouseOver={e => (e.currentTarget.style.background = 'var(--accent-hover)')}
            onMouseOut={e => (e.currentTarget.style.background = 'var(--accent)')}
          >
            {isLast ? 'Back to Lobby' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   HELPER COMPONENTS
   ═══════════════════════════════════════════════ */
function FakeField({ label, placeholder, big, children }: {
  label: string; placeholder?: string; big?: boolean; children?: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
      <span style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</span>
      {children ?? (
        <div style={{
          background: 'var(--bg)', border: '1.5px solid var(--border)',
          borderRadius: 'var(--radius)', color: 'var(--text-faint)',
          padding: '.65rem .9rem', fontSize: big ? '1.1rem' : '.95rem',
          letterSpacing: big ? '.12em' : 'normal',
        }}>{placeholder}</div>
      )}
    </div>
  )
}

function PlayerPill({ name, tileCount, vertical, isPartner }: {
  name: string; tileCount: number; vertical?: boolean; isPartner?: boolean;
}) {
  const dotColor = isPartner ? 'var(--t1)' : 'var(--text-faint)'
  const pill = (
    <div style={{
      background: 'var(--surface)', borderRadius: 'var(--radius-pill)',
      boxShadow: 'var(--shadow-neu-sm)', padding: '.35rem .75rem',
      display: 'flex', alignItems: 'center', gap: '.4rem', whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
      <span style={{ fontSize: '.82rem', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{name}</span>
    </div>
  )
  const tiles = (
    <div style={{ display: 'flex', flexDirection: vertical ? 'column' : 'row', gap: '.15rem' }}>
      {Array.from({ length: Math.min(tileCount, 7) }, (_, i) => (
        <div key={i} style={{
          width: vertical ? 16 : 36, height: vertical ? 36 : 16,
          background: 'linear-gradient(135deg, rgba(255,255,255,.75), rgba(210,225,218,.55))',
          border: '1px solid rgba(255,255,255,.9)', borderRadius: 3,
          boxShadow: '1px 2px 4px rgba(0,0,0,.12)',
        }} />
      ))}
    </div>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.35rem' }}>
      {pill}
      {tileCount > 0 && tiles}
    </div>
  )
}
