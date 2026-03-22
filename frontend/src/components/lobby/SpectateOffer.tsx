import { useState } from 'react'
import { useGameStore } from '../../store/gameStore'

export default function SpectateOffer() {
  const [name, setName] = useState('')
  const { pendingRoom, emitJoinSpectator, goLobby } = useGameStore(s => ({
    pendingRoom:       s.pendingRoom,
    emitJoinSpectator: s.emitJoinSpectator,
    goLobby:           s.goLobby,
  }))

  function spectate() {
    emitJoinSpectator(name.trim() || 'Spectator', pendingRoom ?? '')
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
    }}>
      <div style={{
        background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow)', padding: '2rem',
        border: '1px solid var(--border)', maxWidth: 360, width: '100%',
        textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1rem',
      }}>
        <div style={{ fontSize: '2.5rem' }}>🎪</div>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Room Is Full!</h2>
        <p style={{ fontSize: '.85rem', color: 'var(--text-muted)' }}>
          This match already has 4 players. Would you like to spectate and watch the game?
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem', textAlign: 'left' }}>
          <span style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Your Name</span>
          <input value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && spectate()}
            placeholder="e.g. Spectator Sam" maxLength={16}
            style={{
              background: 'var(--bg)', border: '1.5px solid var(--border)',
              borderRadius: 'var(--radius)', color: 'var(--text)',
              padding: '.65rem .9rem', fontSize: '.95rem', fontFamily: 'inherit', outline: 'none', width: '100%',
            }} />
        </div>
        <button onClick={spectate} style={{
          background: 'var(--accent)', color: '#fff', padding: '.75rem',
          borderRadius: 'var(--radius)', fontWeight: 700, border: 'none', cursor: 'pointer',
        }}>👀 Watch as Spectator</button>
        <button onClick={goLobby} style={{
          background: 'transparent', color: 'var(--text-muted)', padding: '.65rem',
          borderRadius: 'var(--radius)', fontWeight: 600, border: '1.5px solid var(--border)', cursor: 'pointer',
        }}>Back to Lobby</button>
      </div>
    </div>
  )
}
