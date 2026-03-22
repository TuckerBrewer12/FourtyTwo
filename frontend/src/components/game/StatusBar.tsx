import { useGameStore } from '../../store/gameStore'

export default function StatusBar() {
  const statusMsg = useGameStore(s => s.statusMsg)
  return (
    <div style={{
      background: 'var(--surface)',
      borderTop: '1px solid var(--border)',
      borderBottom: '1px solid var(--border)',
      padding: '.4rem 1rem',
      textAlign: 'center',
      fontSize: '.85rem',
      fontWeight: 600,
      color: 'var(--accent)',
      minHeight: '2.1rem',
      position: 'relative',
      zIndex: 2,
    }}>
      {statusMsg}
    </div>
  )
}
