import { useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import Modal from '../shared/Modal'

const SUIT_NAMES = ['Blanks','Aces','Deuces','Treys','Fours','Fives','Sixes']

export default function TrumpModal() {
  const { trumpModalOpen, gameState, emitSetTrump, addToast } = useGameStore(s => ({
    trumpModalOpen: s.trumpModalOpen,
    gameState:      s.gameState,
    emitSetTrump:   s.emitSetTrump,
    addToast:       s.addToast,
  }))

  const [selTrump, setSelTrump] = useState<number | null>(null)

  if (!trumpModalOpen) return null;

  const hb = gameState?.high_bid
  const hm = gameState?.high_marks ?? 1
  const bidStr = hb === 0 ? `Low (${hm}m)` : hb === 42 ? `42 (${hm}m)` : `${hb}`

  function submit() {
    if (selTrump === null) { addToast('Select a trump suit', 'error'); return }
    emitSetTrump(selTrump)
    setSelTrump(null)
  }

  return (
    <Modal>
      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '.15rem' }}>Select Trump Suit</h3>
      <p style={{ fontSize: '.85rem', color: 'var(--text-muted)', marginBottom: '.75rem' }}>
        You won the bid: <strong style={{ color: 'var(--text)' }}>{bidStr}</strong>. Choose your trump suit.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '.4rem', margin: '.5rem 0' }}>
        {SUIT_NAMES.map((name, i) => (
          <button
            key={i}
            onClick={() => setSelTrump(i)}
            style={{
              background: `var(--suit-${i})`,
              border: `3px solid ${selTrump === i ? 'white' : 'transparent'}`,
              outline: selTrump === i ? `3px solid var(--suit-${i})` : 'none',
              outlineOffset: 2,
              borderRadius: 'var(--radius)',
              padding: '.75rem .3rem',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.2rem',
              cursor: 'pointer',
              filter: selTrump === i ? 'brightness(.85)' : 'none',
              transition: 'filter var(--trans)',
            }}
          >
            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{i}</span>
            <span style={{ fontSize: '.68rem', color: 'rgba(255,255,255,.85)', textAlign: 'center' }}>{name}</span>
          </button>
        ))}
      </div>

      <p style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: '.4rem', marginBottom: '.75rem' }}>
        Trump dominoes rank higher than all others, regardless of their other number.
      </p>
      <button onClick={submit} style={{
        background: 'var(--accent)', color: '#fff',
        padding: '.65rem 1.4rem', borderRadius: 'var(--radius)',
        fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '.9rem',
      }}>
        Set Trump
      </button>
    </Modal>
  )
}
