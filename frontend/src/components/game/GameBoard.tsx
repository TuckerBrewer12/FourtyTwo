import { useGameStore } from '../../store/gameStore'
import { useShallow } from 'zustand/react/shallow'
import ScoreHeader from './ScoreHeader'
import ScorePanel from './ScorePanel'
import TrickCenter from './TrickCenter'
import PlayerZone from './PlayerZone'
import HandArea from './HandArea'
// FlightLayer removed — directional slide-in on TrickCenter handles it now
import ConfettiLayer from './ConfettiLayer'
import TrickResultBadge from './TrickResultBadge'

// Invert a seat_map {pnum→seat} to {seat→pnum}
function invertSeatMap(seatMap: Record<number, string> | null): Record<string, number> {
  if (!seatMap) return { north: 1, east: 2, south: 3, west: 4 }
  const inv: Record<string, number> = {}
  for (const [pnum, seat] of Object.entries(seatMap)) inv[seat] = Number(pnum)
  return inv
}

const SUIT_NAMES = ['Blanks', 'Aces', 'Deuces', 'Threes', 'Fours', 'Fives', 'Sixes', 'Doubles']
const SUIT_EMOJIS = ['⬜', '♠️', '♦️', '🔶', '🟣', '❤️', '🔷', '♟']

// Trump reveal overlay — shown for 2.2s when trump is set
function TrumpRevealOverlay({ suit }: { suit: number }) {
  const suitColor = suit === 7 ? 'var(--suit-7)' : `var(--suit-${suit})`
  const suitName = SUIT_NAMES[suit] ?? `${suit}s`
  const suitEmoji = SUIT_EMOJIS[suit] ?? '🎯'

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 400,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,.45)',
      backdropFilter: 'blur(6px)',
      animation: 'fadeIn .15s ease',
    }}>
      {/* Outer pulse ring */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        width: 320, height: 320,
        borderRadius: '50%',
        border: `3px solid ${suitColor}`,
        animation: 'trumpRingPulse 0.9s ease-out 0.2s forwards',
        opacity: 0,
      }} />
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        width: 240, height: 240,
        borderRadius: '50%',
        border: `2px solid ${suitColor}`,
        animation: 'trumpRingPulse 0.9s ease-out 0.4s forwards',
        opacity: 0,
      }} />

      {/* Main card */}
      <div style={{
        position: 'relative',
        background: 'var(--surface)',
        borderRadius: 28,
        padding: '2.5rem 3.5rem',
        textAlign: 'center',
        boxShadow: `0 0 60px ${suitColor}55, 0 24px 64px rgba(0,0,0,.4), 0 8px 24px rgba(0,0,0,.3)`,
        border: `2px solid ${suitColor}66`,
        animation: 'trumpRevealIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        '--trump-color': suitColor,
        '--trump-color-dim': `${suitColor}44`,
      } as React.CSSProperties}>
        {/* Glow background */}
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          background: `radial-gradient(ellipse at center, ${suitColor}18 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        {/* Label */}
        <div style={{
          fontSize: '.75rem',
          fontWeight: 700,
          letterSpacing: '.15em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          marginBottom: '.5rem',
        }}>
          TRUMP IS
        </div>

        {/* Big emoji */}
        <div style={{
          fontSize: '4rem',
          lineHeight: 1.1,
          marginBottom: '.4rem',
          filter: `drop-shadow(0 4px 12px ${suitColor}88)`,
          animation: 'bounce .6s ease-in-out 0.4s',
        }}>
          {suitEmoji}
        </div>

        {/* Suit name */}
        <div style={{
          fontSize: '2.4rem',
          fontWeight: 900,
          color: suitColor,
          letterSpacing: '-.02em',
          textShadow: `0 0 24px ${suitColor}88, 0 4px 12px ${suitColor}44`,
          marginBottom: '.2rem',
          animation: 'trumpGlow 1.5s ease-in-out infinite',
          '--trump-color': suitColor,
          '--trump-color-dim': `${suitColor}44`,
        } as React.CSSProperties}>
          {suitName.toUpperCase()}
        </div>

        {/* Suit pip display */}
        <div style={{
          fontSize: '1.1rem',
          color: `${suitColor}bb`,
          letterSpacing: '.08em',
          fontWeight: 600,
        }}>
          {Array.from({ length: 5 }, (_, i) => (
            <span key={i} style={{ margin: '0 2px' }}>{suitEmoji}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function GameBoard() {
  const { isSpectator, biddingCountdown, seatMap, trumpRevealSuit } = useGameStore(useShallow(s => ({
    isSpectator:      s.isSpectator,
    biddingCountdown: s.biddingCountdown,
    seatMap:          s.seatMap,
    trumpRevealSuit:  s.trumpRevealSuit,
  })))

  const byName = invertSeatMap(seatMap)
  const pNorth = byName.north ?? 1
  const pWest  = byName.west  ?? 4
  const pEast  = byName.east  ?? 2

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(135deg, var(--bg-start) 0%, #f0f5f3 45%, var(--bg-end) 100%)',
      overflow: 'hidden',
    }}>
      {/* Spectator banner */}
      {isSpectator && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30,
          background: 'linear-gradient(90deg, rgba(251,146,60,.9), rgba(249,115,22,.9))',
          textAlign: 'center', padding: '.35rem 1rem',
          fontSize: '.82rem', fontWeight: 700, color: '#fff',
          letterSpacing: '.03em',
          boxShadow: '0 2px 8px rgba(249,115,22,.3)',
        }}>
          👀 Spectating — sit back and enjoy the show
        </div>
      )}

      {/* Top bar */}
      <ScoreHeader />

      {/* Main content: sidebar + game area */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

        {/* Left sidebar */}
        <ScorePanel />

        {/* Game area */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          overflow: 'hidden',
        }}>
          {/* Board area */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '1rem',
            minHeight: 0,
          }}>
            {/* North player */}
            <PlayerZone seat="north" pnum={pNorth} />

            {/* Table with west/east players flanking */}
            <div style={{
              flex: 1,
              width: '100%',
              display: 'flex',
              alignItems: 'stretch',
              minHeight: 0,
            }}>
              {/* West player */}
              <div style={{ display: 'flex', alignItems: 'center', paddingRight: '.5rem' }}>
                <PlayerZone seat="west" pnum={pWest} vertical />
              </div>

              {/* Felt table */}
              <div style={{ flex: 1, display: 'flex' }}>
                <TrickCenter />
              </div>

              {/* East player */}
              <div style={{ display: 'flex', alignItems: 'center', paddingLeft: '.5rem' }}>
                <PlayerZone seat="east" pnum={pEast} vertical />
              </div>
            </div>
          </div>

          {/* Hand area */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '.75rem 1rem 1.1rem',
            flexShrink: 0,
          }}>
            <HandArea />
          </div>
        </div>
      </div>

      {/* Bidding countdown overlay */}
      {biddingCountdown !== null && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 40,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{
            background: 'var(--surface)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-neu), 0 8px 32px rgba(0,0,0,.12)',
            border: '1px solid var(--border)',
            padding: '1.75rem 2.75rem',
            textAlign: 'center',
            animation: 'countdownPop .3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}>
            <div style={{ fontSize: '.82rem', color: 'var(--text-muted)', marginBottom: '.5rem', fontWeight: 600 }}>
              📋 Look at your hand — bidding starts in
            </div>
            <div style={{
              fontSize: '4rem',
              fontWeight: 900,
              color: 'var(--accent)',
              lineHeight: 1,
              animation: 'countdownPop .4s cubic-bezier(0.34, 1.56, 0.64, 1)',
              textShadow: '0 4px 16px rgba(0,109,91,.3)',
            }}>
              {biddingCountdown}
            </div>
            <div style={{ fontSize: '.75rem', color: 'var(--text-faint)', marginTop: '.4rem' }}>
              Check your dominoes below ↓
            </div>
          </div>
        </div>
      )}

      {/* === ANIMATION LAYERS === */}

      {/* FlightLayer removed — directional slide-in on TrickCenter
          now handles the full animation from player seat to center.
          Keeping the import so the file isn't orphaned. */}

      {/* Confetti / score pop layer */}
      <ConfettiLayer />

      {/* Trick result badge (top-right, after each trick) */}
      <TrickResultBadge />

      {/* Trump reveal overlay */}
      {trumpRevealSuit !== null && (
        <TrumpRevealOverlay suit={trumpRevealSuit} />
      )}
    </div>
  )
}
