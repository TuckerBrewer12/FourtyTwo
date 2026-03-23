import { useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import { useShallow } from 'zustand/react/shallow'
import type { GameMode } from '../../types/game'

const MODE_INFO: Record<GameMode, string> = {
  points_250: 'Teams accumulate points hand by hand. First to 250 wins. Failed bids score zero and gift opponents extra points.',
  marks_7:    'Win a hand to earn 1 mark. First team to 7 marks wins the match.',
}

export default function LobbyScreen() {
  const [tab, setTab]       = useState<'create' | 'join'>('create')
  const [nameC, setNameC]   = useState('')
  const [nameJ, setNameJ]   = useState('')
  const [roomCode, setRoom] = useState('')
  const [mode, setMode]     = useState<GameMode>('points_250')

  const { emitCreateRoom, emitJoinGame, addToast } = useGameStore(useShallow(s => ({
    emitCreateRoom: s.emitCreateRoom,
    emitJoinGame:   s.emitJoinGame,
    addToast:       s.addToast,
  })))
  const openRules = () => useGameStore.setState({ rulesModalOpen: true })

  function create() {
    const n = nameC.trim()
    if (!n) { addToast('Enter your name', 'error'); return }
    emitCreateRoom(n, mode)
  }

  function join() {
    const n = nameJ.trim()
    const r = roomCode.trim().toUpperCase()
    if (!n) { addToast('Enter your name', 'error'); return }
    if (!r) { addToast('Enter a room code', 'error'); return }
    emitJoinGame(n, r)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            fontSize: '4rem', fontWeight: 800, letterSpacing: '-.02em',
            color: 'var(--accent)', lineHeight: 1,
          }}>42</div>
          <p style={{ color: 'var(--text-muted)', fontSize: '.82rem', marginTop: '.3rem', letterSpacing: '.06em', textTransform: 'uppercase' }}>
            Texas Domino · Double-Six · 4 Players
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow)', padding: '1.75rem',
          border: '1px solid var(--border)',
        }}>
          {/* Tabs */}
          <div style={{
            display: 'flex', background: 'var(--bg)', borderRadius: 'var(--radius)',
            padding: '.2rem', gap: '.2rem', marginBottom: '1.25rem',
          }}>
            {(['create', 'join'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                flex: 1, padding: '.5rem', borderRadius: '7px', fontWeight: 600,
                fontSize: '.85rem', transition: 'all var(--trans)',
                background: tab === t ? 'var(--surface)' : 'transparent',
                color: tab === t ? 'var(--text)' : 'var(--text-muted)',
                boxShadow: tab === t ? 'var(--shadow-sm)' : 'none',
              }}>
                {t === 'create' ? 'Create Game' : 'Join Game'}
              </button>
            ))}
          </div>

          {tab === 'create' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Field label="Your Name">
                <input value={nameC} onChange={e => setNameC(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && create()}
                  placeholder="e.g. Texas Pete" maxLength={16} style={inputStyle} />
              </Field>
              <Field label="Game Mode">
                <div style={{ display: 'flex', gap: '.4rem' }}>
                  {(['points_250', 'marks_7'] as GameMode[]).map(m => (
                    <button key={m} onClick={() => setMode(m)} style={{
                      padding: '.4rem .9rem', borderRadius: '20px', fontWeight: 600,
                      fontSize: '.82rem', cursor: 'pointer',
                      border: `1.5px solid ${mode === m ? 'var(--accent)' : 'var(--border)'}`,
                      background: mode === m ? 'var(--accent-light)' : 'transparent',
                      color: mode === m ? 'var(--accent)' : 'var(--text-muted)',
                    }}>
                      {m === 'points_250' ? '250 Points' : '7 Marks'}
                    </button>
                  ))}
                </div>
                <div style={{
                  marginTop: '.5rem', background: 'var(--bg)', borderRadius: 'var(--radius)',
                  padding: '.7rem', fontSize: '.8rem', color: 'var(--text-muted)', lineHeight: 1.55,
                }}>
                  <strong style={{ color: 'var(--accent)' }}>
                    {mode === 'points_250' ? '250 Points' : '7 Marks'}
                  </strong>{' — '}{MODE_INFO[mode]}
                </div>
              </Field>
              <Btn onClick={create}>Create Game</Btn>
              <GhostBtn onClick={openRules}>📖 Rules</GhostBtn>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Field label="Your Name">
                <input value={nameJ} onChange={e => setNameJ(e.target.value)}
                  placeholder="e.g. Texas Pete" maxLength={16} style={inputStyle} />
              </Field>
              <Field label="Room Code">
                <input value={roomCode}
                  onChange={e => setRoom(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && join()}
                  placeholder="6-letter code" maxLength={6}
                  style={{ ...inputStyle, textTransform: 'uppercase', letterSpacing: '.12em', fontSize: '1.1rem' }} />
              </Field>
              <Btn onClick={join}>Join Game</Btn>
              <GhostBtn onClick={openRules}>📖 Rules</GhostBtn>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
      <span style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
        {label}
      </span>
      {children}
    </div>
  )
}

function Btn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      background: 'var(--accent)', color: '#fff', padding: '.75rem 1.5rem',
      borderRadius: 'var(--radius)', fontWeight: 700, fontSize: '.95rem',
      border: 'none', cursor: 'pointer', width: '100%',
      transition: 'background var(--trans)',
    }}
      onMouseOver={e => (e.currentTarget.style.background = 'var(--accent-hover)')}
      onMouseOut={e => (e.currentTarget.style.background = 'var(--accent)')}
    >{children}</button>
  )
}

function GhostBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      background: 'transparent', color: 'var(--text-muted)', padding: '.5rem',
      fontSize: '.85rem', width: '100%', cursor: 'pointer',
    }}>{children}</button>
  )
}

const inputStyle: React.CSSProperties = {
  background: 'var(--bg)', border: '1.5px solid var(--border)',
  borderRadius: 'var(--radius)', color: 'var(--text)',
  padding: '.65rem .9rem', fontSize: '.95rem',
  fontFamily: 'inherit', outline: 'none', width: '100%',
}
