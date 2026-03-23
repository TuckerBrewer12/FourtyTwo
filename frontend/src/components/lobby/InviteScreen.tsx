import { useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import { useShallow } from 'zustand/react/shallow'

export default function InviteScreen() {
  const [name, setName] = useState('')
  const { inviteRoomCode, emitJoinGame, addToast, goLobby } = useGameStore(useShallow(s => ({
    inviteRoomCode: s.inviteRoomCode,
    emitJoinGame:   s.emitJoinGame,
    addToast:       s.addToast,
    goLobby:        s.goLobby,
  })))

  function join() {
    const n = name.trim()
    if (!n) { addToast('Enter your name', 'error'); return }
    emitJoinGame(n, inviteRoomCode ?? '')
  }

  return (
    <div style={screenStyle}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '3.5rem', fontWeight: 800, color: 'var(--accent)' }}>42</div>
          <p style={{ color: 'var(--text-muted)', fontSize: '.85rem', marginTop: '.25rem' }}>
            You've been invited to play!
          </p>
        </div>
        <div style={cardStyle}>
          <p style={{ textAlign: 'center', fontSize: '.85rem', color: 'var(--text-muted)' }}>Joining room:</p>
          <div style={{
            textAlign: 'center', margin: '.75rem 0',
            background: 'var(--bg)', border: `2px solid var(--accent)`,
            borderRadius: 'var(--radius)', padding: '.75rem',
          }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '.2em', color: 'var(--accent)' }}>
              {inviteRoomCode ?? '------'}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem', marginBottom: '1rem' }}>
            <span style={labelStyle}>Enter Your Name</span>
            <input value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && join()}
              placeholder="e.g. Lone Star" maxLength={16} style={inputStyle} />
          </div>
          <button onClick={join} style={btnStyle}>Join Game</button>
          <button onClick={goLobby} style={outlineBtnStyle}>Back to Lobby</button>
        </div>
      </div>
    </div>
  )
}

const screenStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'var(--bg)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
}
const cardStyle: React.CSSProperties = {
  background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow)', padding: '1.75rem',
  border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '.75rem',
}
const labelStyle: React.CSSProperties = {
  fontSize: '.72rem', fontWeight: 700, color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: '.05em',
}
const inputStyle: React.CSSProperties = {
  background: 'var(--bg)', border: '1.5px solid var(--border)',
  borderRadius: 'var(--radius)', color: 'var(--text)',
  padding: '.65rem .9rem', fontSize: '.95rem', fontFamily: 'inherit', outline: 'none', width: '100%',
}
const btnStyle: React.CSSProperties = {
  background: 'var(--accent)', color: '#fff', padding: '.75rem',
  borderRadius: 'var(--radius)', fontWeight: 700, fontSize: '.95rem',
  border: 'none', cursor: 'pointer', width: '100%',
}
const outlineBtnStyle: React.CSSProperties = {
  background: 'transparent', color: 'var(--text-muted)', padding: '.65rem',
  borderRadius: 'var(--radius)', fontWeight: 600, fontSize: '.85rem',
  border: '1.5px solid var(--border)', cursor: 'pointer', width: '100%',
}
