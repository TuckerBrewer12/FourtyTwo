import { useGameStore } from '../../store/gameStore'
import { useShallow } from 'zustand/react/shallow'
import Modal from '../shared/Modal'

function ToggleRow({
  label, description, checked, onChange,
}: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: 'var(--surface-soft)', borderRadius: 'var(--radius)',
      padding: '.75rem .85rem', cursor: 'pointer',
      border: '1px solid var(--border)',
    }}>
      <div>
        <div style={{ fontSize: '.85rem', fontWeight: 600, color: 'var(--text)' }}>
          {label}
        </div>
        <div style={{ fontSize: '.72rem', color: 'var(--text-faint)', marginTop: '.15rem' }}>
          {description}
        </div>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        style={{ width: 20, height: 20, accentColor: 'var(--accent)', cursor: 'pointer' }}
      />
    </label>
  )
}

export default function SettingsModal() {
  const {
    open,
    darkMode, setDarkMode,
    showCountMarkers, setShowCountMarkers,
    richAnimations, setRichAnimations,
    trickBadgeColors, setTrickBadgeColors,
    soundEnabled, setSoundEnabled,
  } = useGameStore(useShallow(s => ({
    open: s.settingsModalOpen,
    darkMode: s.darkMode,
    setDarkMode: s.setDarkMode,
    showCountMarkers: s.showCountMarkers,
    setShowCountMarkers: s.setShowCountMarkers,
    richAnimations: s.richAnimations,
    setRichAnimations: s.setRichAnimations,
    trickBadgeColors: s.trickBadgeColors,
    setTrickBadgeColors: s.setTrickBadgeColors,
    soundEnabled: s.soundEnabled,
    setSoundEnabled: s.setSoundEnabled,
  })))

  if (!open) return null
  const close = () => useGameStore.setState({ settingsModalOpen: false })

  return (
    <Modal onClose={close}>
      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem' }}>Settings</h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
        <ToggleRow
          label="Dark Mode"
          description="Easy on the eyes for late-night games"
          checked={darkMode}
          onChange={setDarkMode}
        />
        <ToggleRow
          label="Show Count Markers"
          description="Orange outline on dominoes worth points (multiples of 5)"
          checked={showCountMarkers}
          onChange={setShowCountMarkers}
        />
        <ToggleRow
          label="Rich Animations"
          description="Flying tiles, shimmer effects, and smooth sweeps — turn off for a snappier experience"
          checked={richAnimations}
          onChange={setRichAnimations}
        />
        <ToggleRow
          label="Sound Effects"
          description="Audio feedback for plays, bids, tricks, and game events"
          checked={soundEnabled}
          onChange={setSoundEnabled}
        />
        <ToggleRow
          label="Trick Badge — Domino Colors"
          description="Show pip colors on mini dominoes in the after-trick history badge"
          checked={trickBadgeColors}
          onChange={setTrickBadgeColors}
        />
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
