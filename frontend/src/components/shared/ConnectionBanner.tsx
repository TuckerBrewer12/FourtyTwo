import { useGameStore } from '../../store/gameStore'

export default function ConnectionBanner() {
  const status = useGameStore(s => s.connectionStatus)
  if (status === 'connected') return null
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      padding: '.5rem 1rem', textAlign: 'center',
      fontSize: '.82rem', fontWeight: 700, color: '#fff',
      background: status === 'reconnecting'
        ? 'linear-gradient(90deg, #f59e0b, #d97706)'
        : 'linear-gradient(90deg, #ef4444, #dc2626)',
    }}>
      {status === 'reconnecting' ? '⟳ Reconnecting…' : '✕ Connection lost — please refresh'}
    </div>
  )
}
