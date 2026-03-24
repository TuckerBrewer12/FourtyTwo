import { useGameStore } from '../../store/gameStore'
import { useShallow } from 'zustand/react/shallow'
import Modal from '../shared/Modal'

export default function SettingsModal() {
  const { open, showCountMarkers, setShowCountMarkers } = useGameStore(useShallow(s => ({
    open: s.settingsModalOpen,
    showCountMarkers: s.showCountMarkers,
    setShowCountMarkers: s.setShowCountMarkers,
  })))

  if (!open) return null
  const close = () => useGameStore.setState({ settingsModalOpen: false })

  return (
    <Modal onClose={close}>
      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem' }}>Settings</h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
        {/* Count markers toggle */}
        <label style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--surface-soft)', borderRadius: 'var(--radius)',
          padding: '.75rem .85rem', cursor: 'pointer',
          border: '1px solid var(--border)',
        }}>
          <div>
            <div style={{ fontSize: '.85rem', fontWeight: 600, color: 'var(--text)' }}>
              Show Count Markers
            </div>
            <div style={{ fontSize: '.72rem', color: 'var(--text-faint)', marginTop: '.15rem' }}>
              Orange outline on dominoes worth points (multiples of 5)
            </div>
          </div>
          <input
            type="checkbox"
            checked={showCountMarkers}
            onChange={e => setShowCountMarkers(e.target.checked)}
            style={{ width: 20, height: 20, accentColor: 'var(--accent)', cursor: 'pointer' }}
          />
        </label>
      </div>

      <div style={{ display: 'flex', gap: '.75rem', marginTop: '1.25rem' }}>
        <button
          onClick={() => {
            close()
            useGameStore.setState({ rulesModalOpen: true })
          }}
          style={{
            background: 'var(--surface-soft)', color: 'var(--text-muted)',
            padding: '.65rem 1.2rem', borderRadius: 'var(--radius)',
            fontWeight: 600, border: '1px solid var(--border)', cursor: 'pointer',
            fontSize: '.82rem',
          }}
        >
          View Rules
        </button>
        <button onClick={close} style={{
          background: 'var(--accent)', color: '#fff', padding: '.65rem 1.4rem',
          borderRadius: 'var(--radius)', fontWeight: 700, border: 'none', cursor: 'pointer',
          fontSize: '.82rem',
        }}>
          Done
        </button>
      </div>
    </Modal>
  )
}
