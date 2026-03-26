import { useState, useEffect } from 'react'
import { useGameStore } from '../../store/gameStore'

const SUIT_NAMES = ['Blanks','Aces','Deuces','Threes','Fours','Fives','Sixes','Doubles']
const SUIT_ICONS = ['⬜','🔵','🟢','🟡','🟣','🔴','🔷','♟']

function useClock() {
  const [time, setTime] = useState(() => {
    const now = new Date()
    const h = now.getHours(), m = now.getMinutes()
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
  })
  useEffect(() => {
    const id = setInterval(() => {
      const now = new Date()
      const h = now.getHours(), m = now.getMinutes()
      setTime(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`)
    }, 10000)
    return () => clearInterval(id)
  }, [])
  return time
}

export default function ScoreHeader() {
  const gameState = useGameStore(s => s.gameState)
  const gs = gameState
  const clock = useClock()

  const t1 = gs?.team1_score ?? 0
  const t2 = gs?.team2_score ?? 0

  const trump = gs?.trump ?? null
  const highBid = gs?.high_bid ?? null
  const highBidder = gs?.high_bidder ?? null
  const highMarks = gs?.high_marks ?? 1
  const players = gs?.players ?? {}

  const trumpName = trump === null ? null
    : trump === 7 ? 'Doubles'
    : SUIT_NAMES[trump]
  const trumpIcon = trump === null ? null
    : trump === 7 ? '♟'
    : SUIT_ICONS[trump]

  const bidderName = highBidder !== null ? (players[highBidder] ?? `P${highBidder}`) : null
  const bidDisplay = highBid === null ? null
    : highBid === 0 ? `Low (${highMarks}m)`
    : highBid === 42 ? `42 (${highMarks}m)`
    : String(highBid)

  return (
    <div style={{
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      height: 52,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 1.25rem',
      zIndex: 20,
      position: 'relative',
      flexShrink: 0,
    }}>
      {/* Brand */}
      <span style={{
        fontWeight: 800, fontSize: '.95rem',
        color: 'var(--accent)', letterSpacing: '-.01em',
      }}>
        FortyTwo
      </span>

      {/* Center info */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '.75rem',
        position: 'absolute', left: '50%', transform: 'translateX(-50%)',
        maxWidth: '70vw', overflow: 'hidden',
      }}>
        {/* Score — most prominent element in header */}
        <span style={{
          fontSize: '.88rem', fontWeight: 800, color: 'var(--text)',
          whiteSpace: 'nowrap', letterSpacing: '.02em',
          background: 'var(--surface-soft)', padding: '.15rem .55rem',
          borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
        }}>
          <span style={{ color: 'var(--t1)' }}>{t1}</span>
          <span style={{ color: 'var(--text-faint)', margin: '0 .2rem' }}>–</span>
          <span style={{ color: 'var(--t2)' }}>{t2}</span>
        </span>

        {gs && (
          <>
            <Dot />
            <span style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              Hand {gs.hand_num}
            </span>
          </>
        )}

        {/* Trump badge — shown during play phase */}
        {trumpName !== null && gs?.phase === 'playing' && (
          <>
            <Dot />
            <span style={{
              display: 'flex', alignItems: 'center', gap: '.25rem',
              background: trump === 7 ? 'rgba(217,119,6,.12)' : `color-mix(in srgb, var(--suit-${trump}) 12%, transparent)`,
              border: `1.5px solid ${trump === 7 ? '#d97706' : `var(--suit-${trump})`}`,
              borderRadius: 'var(--radius-pill)',
              padding: '.18rem .55rem',
              fontSize: '.72rem', fontWeight: 700,
              color: trump === 7 ? '#d97706' : `var(--suit-${trump})`,
              whiteSpace: 'nowrap',
            }}>
              {trumpIcon} {trumpName}
            </span>
          </>
        )}

        {/* Bid info — shown during bidding or trump selection */}
        {bidDisplay && gs?.phase !== 'playing' && bidderName && (
          <>
            <Dot />
            <span style={{
              fontSize: '.72rem', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap',
            }}>
              Bid: <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{bidDisplay}</span> by {bidderName}
            </span>
          </>
        )}

        <Dot />
        <span style={{
          fontSize: '.68rem', fontWeight: 500, color: 'var(--text-faint)',
          fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
        }}>
          {clock}
        </span>
      </div>

      {/* Right icons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
        <button
          onClick={() => useGameStore.setState({ settingsModalOpen: true })}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'var(--surface-soft)',
            border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1rem', cursor: 'pointer',
            boxShadow: 'var(--shadow-neu-sm)',
          }}
          title="Settings"
        >
          ⚙
        </button>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '.85rem', color: '#fff', fontWeight: 700,
          boxShadow: '0 2px 8px rgba(0,109,91,.3)',
        }}>
          42
        </div>
      </div>
    </div>
  )
}

function Dot() {
  return (
    <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--border)', flexShrink: 0, display: 'inline-block' }} />
  )
}
