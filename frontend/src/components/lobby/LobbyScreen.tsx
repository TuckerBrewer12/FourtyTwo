import { useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import { useShallow } from 'zustand/react/shallow'
import type { GameMode } from '../../types/game'

const MODE_INFO: Record<GameMode, string> = {
  points_250: 'Teams accumulate points hand by hand. First to 250 wins. Failed bids score zero and gift opponents extra points.',
  marks_7:    'Win a hand to earn marks. First team to reach the target wins the match.',
}

type ChatMode = 'emoji' | 'text' | 'off'

export default function LobbyScreen() {
  const [tab, setTab]       = useState<'create' | 'join'>('create')
  const [nameC, setNameC]   = useState('')
  const [nameJ, setNameJ]   = useState('')
  const [roomCode, setRoom] = useState('')
  const [mode, setMode]     = useState<GameMode>('marks_7')

  // Settings
  const [bidTimerOn, setBidTimerOn]   = useState(false)
  const [bidTimerSec, setBidTimerSec] = useState(15)
  const [chatMode, setChatMode]       = useState<ChatMode>('emoji')
  const [allowSpectators, setAllowSpectators] = useState(true)
  const [marksTarget, setMarksTarget] = useState(7)
  const [nelo, setNelo]     = useState(false)
  const [plunge, setPlunge] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const { emitCreateRoom, emitJoinGame, addToast } = useGameStore(useShallow(s => ({
    emitCreateRoom: s.emitCreateRoom,
    emitJoinGame:   s.emitJoinGame,
    addToast:       s.addToast,
  })))
  const openRules = () => useGameStore.setState({ rulesModalOpen: true })

  function create() {
    const n = nameC.trim()
    if (!n) { addToast('Enter your name', 'error'); return }
    emitCreateRoom(n, mode, {
      bid_timer: bidTimerOn ? bidTimerSec : 0,
      chat_mode: chatMode,
      allow_spectators: allowSpectators,
      marks_target: mode === 'marks_7' ? marksTarget : 250,
      nelo,
      plunge,
    })
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
      overflowY: 'auto',
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
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
              <button key={t} onClick={() => setTab(t)}

                style={{
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
                  {(['marks_7', 'points_250'] as GameMode[]).map(m => (
                    <button key={m} onClick={() => setMode(m)} style={{
                      padding: '.4rem .9rem', borderRadius: '20px', fontWeight: 600,
                      fontSize: '.82rem', cursor: 'pointer',
                      border: `1.5px solid ${mode === m ? 'var(--accent)' : 'var(--border)'}`,
                      background: mode === m ? 'var(--accent-light)' : 'transparent',
                      color: mode === m ? 'var(--accent)' : 'var(--text-muted)',
                    }}>
                      {m === 'points_250' ? '250 Points' : `${marksTarget} Marks`}
                    </button>
                  ))}
                </div>
                <div style={{
                  marginTop: '.5rem', background: 'var(--bg)', borderRadius: 'var(--radius)',
                  padding: '.7rem', fontSize: '.8rem', color: 'var(--text-muted)', lineHeight: 1.55,
                }}>
                  <strong style={{ color: 'var(--accent)' }}>
                    {mode === 'points_250' ? '250 Points' : `${marksTarget} Marks`}
                  </strong>{' — '}{MODE_INFO[mode]}
                </div>
              </Field>

              {/* Marks target slider — only for marks mode */}
              {mode === 'marks_7' && (
                <Field label={`Marks to Win: ${marksTarget}`}>
                  <input type="range" min={1} max={21} value={marksTarget}
                    onChange={e => setMarksTarget(Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--accent)' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.7rem', color: 'var(--text-faint)' }}>
                    <span>1</span><span>7 (default)</span><span>21</span>
                  </div>
                </Field>
              )}

              {/* Bid Timer */}
              <Field label="Bid Timer">
                <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                  <Toggle on={bidTimerOn} onToggle={() => setBidTimerOn(!bidTimerOn)} />
                  <span style={{ fontSize: '.82rem', color: bidTimerOn ? 'var(--text)' : 'var(--text-faint)' }}>
                    {bidTimerOn ? `${bidTimerSec}s per bid` : 'No time limit'}
                  </span>
                </div>
                {bidTimerOn && (
                  <div style={{ marginTop: '.4rem' }}>
                    <input type="range" min={5} max={60} step={5} value={bidTimerSec}
                      onChange={e => setBidTimerSec(Number(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--accent)' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.7rem', color: 'var(--text-faint)' }}>
                      <span>5s</span><span>30s</span><span>60s</span>
                    </div>
                  </div>
                )}
              </Field>

              {/* Chat Mode */}
              <Field label="Chat">
                <div style={{ display: 'flex', gap: '.35rem' }}>
                  {([['emoji', 'Emojis Only'], ['text', 'Full Text'], ['off', 'Off']] as [ChatMode, string][]).map(([v, label]) => (
                    <button key={v} onClick={() => setChatMode(v)} style={{
                      padding: '.35rem .75rem', borderRadius: '20px', fontWeight: 600,
                      fontSize: '.78rem', cursor: 'pointer',
                      border: `1.5px solid ${chatMode === v ? 'var(--accent)' : 'var(--border)'}`,
                      background: chatMode === v ? 'var(--accent-light)' : 'transparent',
                      color: chatMode === v ? 'var(--accent)' : 'var(--text-muted)',
                    }}>
                      {label}
                    </button>
                  ))}
                </div>
              </Field>

              {/* Spectators toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Allow Spectators</span>
                <Toggle on={allowSpectators} onToggle={() => setAllowSpectators(!allowSpectators)} />
              </div>

              {/* Advanced rules section */}
              <button onClick={() => setShowAdvanced(!showAdvanced)} style={{
                display: 'flex', alignItems: 'center', gap: '.4rem',
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '.78rem', fontWeight: 700, color: 'var(--text-muted)',
                padding: '.2rem 0', textTransform: 'uppercase', letterSpacing: '.05em',
              }}>
                <span style={{ transform: showAdvanced ? 'rotate(90deg)' : 'none', transition: 'transform .2s', display: 'inline-block' }}>
                  ▸
                </span>
                House Rules
              </button>

              {showAdvanced && (
                <div style={{
                  display: 'flex', flexDirection: 'column', gap: '.75rem',
                  background: 'var(--bg)', borderRadius: 'var(--radius)',
                  padding: '.75rem', border: '1px solid var(--border)',
                }}>
                  {/* Nelo */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.25rem' }}>
                      <span style={{ fontSize: '.82rem', fontWeight: 700, color: 'var(--text)' }}>Nelo</span>
                      <Toggle on={nelo} onToggle={() => setNelo(!nelo)} />
                    </div>
                    <p style={{ fontSize: '.72rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                      When the bidding team gets set, the penalty marks are <strong>doubled</strong>. High risk, high stakes.
                    </p>
                  </div>

                  <div style={{ height: 1, background: 'var(--border)' }} />

                  {/* Plunge */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.25rem' }}>
                      <span style={{ fontSize: '.82rem', fontWeight: 700, color: 'var(--text)' }}>Plunge</span>
                      <Toggle on={plunge} onToggle={() => setPlunge(!plunge)} />
                    </div>
                    <p style={{ fontSize: '.72rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                      Bid over 30 and get set? That's an <strong>extra mark</strong> penalty on top. Punishes overbidding.
                    </p>
                  </div>
                </div>
              )}

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

        {/* First Time? tutorial button */}
        <button onClick={() => useGameStore.setState({ currentScreen: 'tutorial' })} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.5rem',
          marginTop: '1rem', width: '100%',
          background: 'linear-gradient(135deg, var(--accent), #008c73)',
          color: '#fff', padding: '.7rem 1.2rem',
          borderRadius: 'var(--radius-pill)', fontWeight: 700, fontSize: '.88rem',
          border: 'none', cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(0,109,91,.3)',
          transition: 'all .2s ease',
          letterSpacing: '.02em',
        }}
          onMouseOver={e => {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,109,91,.4)'
          }}
          onMouseOut={e => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,109,91,.3)'
          }}
        >
          <span style={{ fontSize: '1.1rem' }}>?</span>
          First Time? Take the Tour
        </button>
      </div>
    </div>
  )
}

/* ---- Toggle Switch ---- */
function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} style={{
      width: 38, height: 22, borderRadius: 11, padding: 2,
      background: on ? 'var(--accent)' : 'var(--border)',
      border: 'none', cursor: 'pointer',
      transition: 'background .2s ease',
      display: 'flex', alignItems: 'center',
      flexShrink: 0,
    }}>
      <div style={{
        width: 18, height: 18, borderRadius: '50%',
        background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,.2)',
        transition: 'transform .2s ease',
        transform: on ? 'translateX(16px)' : 'translateX(0)',
      }} />
    </button>
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
