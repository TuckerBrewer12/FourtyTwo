import { useState, useEffect } from 'react'
import { useGameStore } from '../../store/gameStore'

const SUIT_NAMES = ['Blanks','Aces','Deuces','Treys','Fours','Fives','Sixes']

function useClock() {
  const [time, setTime] = useState(() => {
    const now = new Date()
    const h = now.getHours(), m = now.getMinutes()
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
  })
  useEffect(() => {
    const id = setInterval(() => {
      const now = new Date()
      const h = now.getHours(), m = now.getMinutes()
      setTime(`${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`)
    }, 10000)
    return () => clearInterval(id)
  }, [])
  return time
}

export default function ScoreHeader() {
  const gameState = useGameStore(s => s.gameState)
  const gs = gameState
  const clock = useClock()

  return (
    <div style={{
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      boxShadow: '0 1px 3px rgba(0,0,0,.05)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: '.4rem', padding: '.45rem .75rem',
      zIndex: 20, position: 'relative',
    }}>
      {/* Left: logo + hand info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--accent)', letterSpacing: '-.01em' }}>42</span>
        <Chip>{`Hand ${gs?.hand_num ?? 1}`}</Chip>
        <Chip>{`Trick ${gs?.trick_count ?? 0}/${gs?.total_tricks ?? 7}`}</Chip>
        {gs?.trump !== null && gs?.trump !== undefined && (
          <Chip color="var(--accent)" bg="var(--accent-light)" border="rgba(45,158,92,.25)">
            {SUIT_NAMES[gs.trump]}s Trump
          </Chip>
        )}
      </div>

      {/* Right: scores + clock + rules */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '.5rem',
          background: 'var(--bg)', borderRadius: 'var(--radius-sm)',
          padding: '.25rem .65rem', border: '1px solid var(--border)',
        }}>
          <TeamScore label="T1" pts={gs?.team1_score ?? 0} total={gs?.team1_total ?? 0} color="var(--t1)" />
          <span style={{ color: 'var(--text-faint)', fontSize: '.75rem' }}>vs</span>
          <TeamScore label="T2" pts={gs?.team2_score ?? 0} total={gs?.team2_total ?? 0} color="var(--t2)" />
        </div>
        <span style={{
          fontSize: '.78rem', fontWeight: 600, color: 'var(--text-muted)',
          fontVariantNumeric: 'tabular-nums', letterSpacing: '.03em', minWidth: 52, textAlign: 'right',
        }}>{clock}</span>
        <button onClick={() => useGameStore.setState({ rulesModalOpen: true })} style={{
          width: 32, height: 32, borderRadius: '50%', fontSize: '.95rem',
          background: 'var(--bg)', border: '1px solid var(--border)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>📖</button>
      </div>
    </div>
  )
}

function Chip({ children, color = 'var(--text-muted)', bg = 'var(--bg)', border = 'var(--border)' }: {
  children: React.ReactNode; color?: string; bg?: string; border?: string;
}) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      background: bg, border: `1px solid ${border}`,
      borderRadius: '20px', padding: '.2rem .6rem',
      fontSize: '.75rem', fontWeight: 600, color,
    }}>
      {children}
    </span>
  )
}

function TeamScore({ label, pts, total, color }: { label: string; pts: number; total: number; color: string }) {
  return (
    <div>
      <div style={{ fontSize: '.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color }}>{label}</div>
      <div style={{ fontSize: '.95rem', fontWeight: 800, lineHeight: 1, color }}>{pts}</div>
      <div style={{ fontSize: '.68rem', color: 'var(--text-muted)' }}>{total} total</div>
    </div>
  )
}
