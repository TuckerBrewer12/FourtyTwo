import { useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import { useShallow } from 'zustand/react/shallow'
import Modal from '../shared/Modal'
import Domino from '../domino/Domino'

const SUIT_NAMES = ['Blanks','Aces','Deuces','Threes','Fours','Fives','Sixes','Doubles']

export default function TrumpModal() {
  const { trumpModalOpen, gameState, myHand, emitSetTrump, addToast } = useGameStore(useShallow(s => ({
    trumpModalOpen: s.trumpModalOpen,
    gameState:      s.gameState,
    myHand:         s.myHand,
    emitSetTrump:   s.emitSetTrump,
    addToast:       s.addToast,
  })))

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

  // Compute hand counts per suit (including doubles-as-trump)
  function handCountForSuit(suit: number): { count: number; countPts: number } {
    if (!myHand.length) return { count: 0, countPts: 0 };
    let count = 0;
    let countPts = 0;
    for (const [a, b] of myHand) {
      const isTrump = suit === 7 ? a === b : a === suit || b === suit;
      if (isTrump) {
        count++;
        const pip = a + b;
        if (pip > 0 && pip % 5 === 0) countPts += pip;
      }
    }
    return { count, countPts };
  }

  return (
    <Modal>
      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '.15rem' }}>Select Trump Suit</h3>
      <p style={{ fontSize: '.85rem', color: 'var(--text-muted)', marginBottom: '.75rem' }}>
        You won the bid: <strong style={{ color: 'var(--text)' }}>{bidStr}</strong>. Choose your trump suit.
      </p>

      {/* Regular suits 0–6 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '.4rem', margin: '.5rem 0' }}>
        {SUIT_NAMES.slice(0, 7).map((name, i) => {
          const { count, countPts } = handCountForSuit(i)
          return (
            <button
              key={i}
              onClick={() => setSelTrump(i)}
              style={{
                background: `var(--suit-${i})`,
                border: `3px solid ${selTrump === i ? 'white' : 'transparent'}`,
                outline: selTrump === i ? `3px solid var(--suit-${i})` : 'none',
                outlineOffset: 2,
                borderRadius: 'var(--radius)',
                padding: '.6rem .3rem',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.15rem',
                cursor: 'pointer',
                filter: selTrump === i ? 'brightness(.85)' : 'none',
                transition: 'filter var(--trans)',
                position: 'relative',
              }}
            >
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{i}</span>
              <span style={{ fontSize: '.68rem', color: 'rgba(255,255,255,.85)', textAlign: 'center' }}>{name}</span>
              {count > 0 && (
                <span style={{
                  fontSize: '.6rem', color: 'rgba(255,255,255,.9)',
                  background: 'rgba(0,0,0,.25)', borderRadius: 8,
                  padding: '0 .3rem', marginTop: '.05rem',
                }}>
                  {count} tile{count !== 1 ? 's' : ''}{countPts > 0 ? ` +${countPts}` : ''}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Doubles-as-trump button — full width, special style */}
      {(() => {
        const { count, countPts } = handCountForSuit(7)
        const sel = selTrump === 7
        return (
          <button
            onClick={() => setSelTrump(7)}
            style={{
              width: '100%',
              background: sel ? 'var(--suit-7)' : 'var(--surface-soft)',
              border: `2px solid ${sel ? 'var(--suit-7)' : 'var(--border)'}`,
              borderRadius: 'var(--radius)',
              padding: '.65rem 1rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.75rem',
              cursor: 'pointer',
              transition: 'all var(--trans)',
              marginTop: '.3rem',
            }}
          >
            {/* Two small domino thumbnails showing 2-2 and 5-5 */}
            <span style={{ display: 'flex', gap: '.2rem', alignItems: 'center' }}>
              <Domino a={2} b={2} size="xs" />
              <Domino a={5} b={5} size="xs" />
            </span>
            <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
              <span style={{ fontWeight: 800, fontSize: '.9rem', color: sel ? '#fff' : 'var(--suit-7)' }}>
                Doubles
              </span>
              <span style={{ fontSize: '.7rem', color: sel ? 'rgba(255,255,255,.8)' : 'var(--text-muted)' }}>
                All doubles form trump suit — ranked by pip value
                {count > 0 && ` · ${count} in hand${countPts > 0 ? `, +${countPts} pts` : ''}`}
              </span>
            </span>
          </button>
        )
      })()}

      <p style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: '.4rem', marginBottom: '.75rem' }}>
        Trump dominoes rank higher than all others. Doubles are highest of their suit (or entire trump suit if Doubles trump).
      </p>
      <button onClick={submit} style={{
        background: 'var(--accent)', color: '#fff',
        padding: '.65rem 1.4rem', borderRadius: 'var(--radius)',
        fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '.9rem',
      }}>
        Set Trump
      </button>

      {/* Hand peek — highlight trump tiles */}
      {myHand.length > 0 && (
        <div style={{ marginTop: '.75rem', paddingTop: '.6rem', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: '.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.4rem' }}>
            Your Hand {selTrump !== null && <span style={{ color: 'var(--accent)' }}>— trump tiles highlighted</span>}
          </div>
          <div style={{ display: 'flex', gap: '.3rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {myHand.map(([a, b], i) => {
              const t = selTrump
              const isTrump = t === null ? false : t === 7 ? a === b : a === t || b === t
              return <Domino key={i} a={a} b={b} size="sm" isTrump={isTrump} />
            })}
          </div>
        </div>
      )}
    </Modal>
  )
}
