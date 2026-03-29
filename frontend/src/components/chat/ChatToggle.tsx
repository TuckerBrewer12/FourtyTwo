import { useGameStore } from '../../store/gameStore'
import { useShallow } from 'zustand/react/shallow'

export default function ChatToggle() {
  const { chatOpen, unreadChat, setChatOpen } = useGameStore(useShallow(s => ({
    chatOpen:    s.chatOpen,
    unreadChat:  s.unreadChat,
    setChatOpen: s.setChatOpen,
  })))

  return (
    <button
      onClick={() => setChatOpen(!chatOpen)}
      style={{
        position: 'fixed', right: '.75rem', bottom: 'calc(120px + .75rem)',
        zIndex: 45, width: 44, height: 44, borderRadius: '50%',
        border: '1.5px solid var(--border)',
        background: 'var(--surface)', color: 'var(--text)',
        fontSize: '1.2rem', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: 'var(--shadow)',
      }}
    >
      💬
      {unreadChat > 0 && (
        <div style={{
          position: 'absolute', top: -4, right: -4,
          background: 'var(--danger)', color: '#fff', borderRadius: '50%',
          width: 18, height: 18, fontSize: '.65rem', fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {unreadChat > 9 ? '9+' : unreadChat}
        </div>
      )}
    </button>
  )
}
