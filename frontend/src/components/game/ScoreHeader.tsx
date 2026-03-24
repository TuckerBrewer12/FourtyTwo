import { useState, useEffect } from 'react'
import { useGameStore } from '../../store/gameStore'

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
  const scoreStr = `Score: ${t1} – ${t2}`

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
        fontWeight: 800, fontSize: '1.05rem',
        color: 'var(--accent)', letterSpacing: '-.01em',
      }}>
        FortyTwo
      </span>

      {/* Center info */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '1.25rem',
        position: 'absolute', left: '50%', transform: 'translateX(-50%)',
      }}>
        <span style={{ fontSize: '.82rem', fontWeight: 700, color: 'var(--accent)' }}>
          {scoreStr}
        </span>
        {gs && (
          <>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--border)', flexShrink: 0 }} />
            <span style={{ fontSize: '.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              Hand {gs.hand_num}
            </span>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--border)', flexShrink: 0 }} />
          </>
        )}
        <span style={{
          fontSize: '.82rem', fontWeight: 600, color: 'var(--text-muted)',
          fontVariantNumeric: 'tabular-nums',
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
