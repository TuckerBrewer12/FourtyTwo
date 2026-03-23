import { useRef, useEffect, useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import { useShallow } from 'zustand/react/shallow'

const QUICK_EMOJI = ['👍','👏','🎉','🔥','😂','😬','🤯','💀']
const QUICK_PHRASES = ['Nice Play!','Good Bid!','Oops!',"Let's Go!",'Lucky!','GG!']

export default function ChatPanel() {
  const { chatOpen, gameState, emitChat, setChatOpen } = useGameStore(useShallow(s => ({
    chatOpen:  s.chatOpen,
    gameState: s.gameState,
    emitChat:  s.emitChat,
    setChatOpen: s.setChatOpen,
  })))

  const [msg, setMsg] = useState('')
  const msgsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (chatOpen && msgsRef.current) {
      msgsRef.current.scrollTop = msgsRef.current.scrollHeight
    }
  }, [chatOpen, gameState?.chat_history?.length])

  function send() {
    if (!msg.trim()) return
    emitChat(msg.trim())
    setMsg('')
  }

  function sendQuick(text: string) {
    emitChat(text)
  }

  const history = gameState?.chat_history ?? []

  return (
    <div style={{
      position: 'fixed', right: 0, top: 0, bottom: 0, width: 280,
      background: 'var(--surface)', borderLeft: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', zIndex: 50,
      transform: chatOpen ? 'translateX(0)' : 'translateX(100%)',
      transition: 'transform .25s ease',
      boxShadow: chatOpen ? '-4px 0 16px rgba(0,0,0,.08)' : 'none',
    }}>
      {/* Header */}
      <div style={{
        padding: '.75rem 1rem', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <span style={{ fontWeight: 700, fontSize: '.9rem' }}>💬 Chat</span>
        <button onClick={() => setChatOpen(false)} style={{
          background: 'transparent', color: 'var(--text-muted)', fontSize: '.85rem',
          padding: '.25rem .5rem', borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)', cursor: 'pointer',
        }}>✕</button>
      </div>

      {/* Messages */}
      <div ref={msgsRef} style={{
        flex: 1, overflowY: 'auto', padding: '.5rem .75rem',
        display: 'flex', flexDirection: 'column', gap: '.35rem',
      }}>
        {history.map((m, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '.05rem', animation: 'fadeIn .15s ease' }}>
            <span style={{
              fontSize: '.68rem', fontWeight: 600,
              color: m.spectator ? 'var(--warning)' : 'var(--text-muted)',
            }}>
              {m.sender}{m.spectator ? ' 👀' : ''}
            </span>
            <span style={{ fontSize: '1.3rem', lineHeight: 1.2 }}>{m.msg}</span>
          </div>
        ))}
      </div>

      {/* Quick reactions */}
      <div style={{ padding: '.5rem .75rem', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ fontSize: '.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.3rem' }}>
          Quick Reactions
        </div>
        <div style={{ display: 'flex', gap: '.25rem', flexWrap: 'wrap', marginBottom: '.25rem' }}>
          {QUICK_EMOJI.map(e => (
            <button key={e} onClick={() => sendQuick(e)} style={{
              fontSize: '1.2rem', lineHeight: 1, padding: '.2rem .3rem',
              background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', cursor: 'pointer',
            }}>{e}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '.25rem', flexWrap: 'wrap' }}>
          {QUICK_PHRASES.map(p => (
            <button key={p} onClick={() => sendQuick(p)} style={{
              fontSize: '.7rem', fontWeight: 600, padding: '.2rem .5rem',
              background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: '20px', cursor: 'pointer', color: 'var(--text-muted)',
              whiteSpace: 'nowrap',
            }}>{p}</button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div style={{ padding: '.6rem .75rem', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: '.4rem' }}>
          <input
            value={msg}
            onChange={e => setMsg(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Emoji or type above 😊"
            maxLength={40}
            style={{
              flex: 1, background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', padding: '.45rem .6rem',
              fontSize: '1.2rem', color: 'var(--text)', outline: 'none', fontFamily: 'inherit',
            }}
          />
          <button onClick={send} style={{
            background: 'var(--accent)', color: '#fff', padding: '.45rem .8rem',
            borderRadius: 'var(--radius-sm)', fontWeight: 600, fontSize: '.82rem',
            border: 'none', cursor: 'pointer',
          }}>Send</button>
        </div>
      </div>
    </div>
  )
}
