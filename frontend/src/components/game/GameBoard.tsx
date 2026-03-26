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
      background: 'rgba(0,0,0,.5)',
      backdropFilter: 'blur(8px)',
      animation: 'fadeIn .2s ease',
    }}>
      {/* Single pulse ring */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        width: 260, height: 260,
        borderRadius: '50%',
        border: `2.5px solid ${suitColor}`,
        animation: 'trumpRingPulse 0.9s ease-out 0.3s forwards',
        opacity: 0,
      }} />

      {/* Main card — clean, minimal */}
      <div style={{
        position: 'relative',
        background: `linear-gradient(145deg, var(--surface) 0%, #f8faf9 100%)`,
        borderRadius: 24,
        padding: '2rem 3rem',
        textAlign: 'center',
        boxShadow: `0 0 80px ${suitColor}40, 0 20px 60px rgba(0,0,0,.35)`,
        border: `2.5px solid ${suitColor}88`,
        animation: 'trumpRevealIn 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        '--trump-color': suitColor,
        '--trump-color-dim': `${suitColor}44`,
        maxWidth: 280,
      } as React.CSSProperties}>

        {/* Colored accent bar at top */}
        <div style={{
          position: 'absolute',
          top: 0, left: '15%', right: '15%',
          height: 3,
          borderRadius: '0 0 3px 3px',
          background: suitColor,
          boxShadow: `0 2px 12px ${suitColor}88`,
        }} />

        {/* Emoji + Name stacked */}
        <div style={{
          fontSize: '3.2rem',
          lineHeight: 1,
          marginBottom: '.5rem',
          filter: `drop-shadow(0 3px 10px ${suitColor}66)`,
          animation: 'bounce .5s ease-in-out 0.35s',
        }}>
          {suitEmoji}
        </div>

        <div style={{
          fontSize: '.65rem',
          fontWeight: 600,
          letterSpacing: '.18em',
          textTransform: 'uppercase',
          color: 'var(--text-faint)',
          marginBottom: '.25rem',
        }}>
          TRUMP
        </div>

        <div style={{
          fontSize: '1.8rem',
          fontWeight: 900,
          color: suitColor,
          letterSpacing: '.02em',
          lineHeight: 1.1,
          textShadow: `0 0 20px ${suitColor}55`,
        }}>
          {suitName.toUpperCase()}
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
