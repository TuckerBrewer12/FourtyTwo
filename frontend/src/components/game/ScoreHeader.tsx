import { useState, useEffect } from 'react'
import { useGameStore } from '../../store/gameStore'
import { useShallow } from 'zustand/react/shallow'
import { useIsMobile } from '../../hooks/useIsMobile'

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
  const isMobile = useIsMobile()
  const { gameState, myPNum } = useGameStore(useShallow(s => ({
    gameState: s.gameState,
    myPNum: s.myPNum,
  })))
  const gs = gameState
  useClock()

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

  // Determine my team and "left to win" info
  const myTeam = myPNum ? (myPNum % 2 === 1 ? 1 : 2) : 1
  const isMarksMode = gs?.game_mode === 'marks_7'
  const winTarget = gs?.win_target ?? (isMarksMode ? 7 : 250)

  let leftToWin: string | null = null
  if (gs) {
    if (isMarksMode) {
      const myMarks = myTeam === 1 ? (gs.team1_marks ?? 0) : (gs.team2_marks ?? 0)
      const remaining = Math.max(0, winTarget - myMarks)
      leftToWin = isMobile
        ? (remaining === 1 ? '1m left' : `${remaining}m left`)
        : (remaining === 1 ? '1 mark to win' : `${remaining} marks to win`)
    } else {
      const myTotal = myTeam === 1 ? (gs.team1_total ?? 0) : (gs.team2_total ?? 0)
      const remaining = Math.max(0, winTarget - myTotal)
      leftToWin = isMobile ? `${remaining}p left` : `${remaining} pts to win`
    }
  }

  // Overall game score line
  let gameScoreLabel: string | null = null
  if (gs) {
    if (isMarksMode) {
      gameScoreLabel = `${gs.team1_marks ?? 0} – ${gs.team2_marks ?? 0} marks`
    } else {
      gameScoreLabel = `${gs.team1_total ?? 0} – ${gs.team2_total ?? 0} total`
    }
  }

  return (
    <div style={{
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      height: isMobile ? 44 : 52,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: isMobile ? '0 0.75rem' : '0 1.25rem',
      zIndex: 20,
      position: 'relative',
      flexShrink: 0,
    }}>
      {/* Left: Brand + overall game score */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '.35rem' : '.6rem', minWidth: 0 }}>
        <span style={{
          fontWeight: 800, fontSize: isMobile ? '.78rem' : '.95rem',
          color: 'var(--accent)', letterSpacing: '-.01em',
          flexShrink: 0,
        }}>
          {isMobile ? '42' : 'FortyTwo'}
        </span>
        {gameScoreLabel && !isMobile && (
          <>
            <Dot />
            <span style={{
              fontSize: '.72rem', fontWeight: 700, color: 'var(--text-muted)',
              whiteSpace: 'nowrap',
              background: 'var(--bg)', padding: '.12rem .45rem',
              borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
            }}>
              <span style={{ color: 'var(--t1)' }}>{isMarksMode ? (gs?.team1_marks ?? 0) : (gs?.team1_total ?? 0)}</span>
              <span style={{ color: 'var(--text-faint)', margin: '0 .15rem' }}>–</span>
              <span style={{ color: 'var(--t2)' }}>{isMarksMode ? (gs?.team2_marks ?? 0) : (gs?.team2_total ?? 0)}</span>
              <span style={{ color: 'var(--text-faint)', marginLeft: '.25rem', fontSize: '.65rem', fontWeight: 500 }}>
                {isMarksMode ? 'marks' : 'pts'}
              </span>
            </span>
          </>
        )}
      </div>

      {/* Center info */}
      <div style={{
        display: isMobile ? 'none' : 'flex', alignItems: 'center', gap: '.75rem',
        position: 'absolute', left: '50%', transform: 'translateX(-50%)',
        maxWidth: '50vw', overflow: 'hidden',
      }}>
        {/* Hand score — this hand only */}
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
      </div>

      {/* Right: "left to win" + icons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '.35rem' : '.5rem' }}>
        {leftToWin && (
          <span style={{
            fontSize: isMobile ? '.6rem' : '.68rem', fontWeight: 700,
            color: 'var(--accent)',
            whiteSpace: 'nowrap',
            background: 'var(--accent-light)',
            padding: isMobile ? '.1rem .35rem' : '.15rem .5rem',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid var(--accent)',
            letterSpacing: '.01em',
          }}>
            {leftToWin}
          </span>
        )}
        <button
          onClick={() => useGameStore.setState({ statsOpen: true })}
          style={{
            width: isMobile ? 32 : 36, height: isMobile ? 32 : 36, borderRadius: '50%',
            background: 'var(--surface-soft)',
            border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: isMobile ? '.8rem' : '1rem', cursor: 'pointer',
            boxShadow: 'var(--shadow-neu-sm)',
            flexShrink: 0,
          }}
          title="Stats"
        >
          📊
        </button>
        <button
          onClick={() => useGameStore.setState({ settingsModalOpen: true })}
          style={{
            width: isMobile ? 32 : 36, height: isMobile ? 32 : 36, borderRadius: '50%',
            background: 'var(--surface-soft)',
            border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: isMobile ? '.8rem' : '1rem', cursor: 'pointer',
            boxShadow: 'var(--shadow-neu-sm)',
            flexShrink: 0,
          }}
          title="Settings"
        >
          ⚙
        </button>
        {!isMobile && (
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '.85rem', color: '#fff', fontWeight: 700,
            boxShadow: '0 2px 8px rgba(0,109,91,.3)',
            flexShrink: 0,
          }}>
            42
          </div>
        )}
      </div>
    </div>
  )
}

function Dot() {
  return (
    <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--border)', flexShrink: 0, display: 'inline-block' }} />
  )
}
