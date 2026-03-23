import { useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import { useShallow } from 'zustand/react/shallow'
import Modal from '../shared/Modal'
import Domino from '../domino/Domino'

export default function BidModal() {
  const { bidModalOpen, gameState, myHand, emitBid, addToast } = useGameStore(useShallow(s => ({
    bidModalOpen: s.bidModalOpen,
    gameState:    s.gameState,
    myHand:       s.myHand,
    emitBid:      s.emitBid,
    addToast:     s.addToast,
  })))

  const [selBid, setSelBid] = useState<number | null>(null)
  const [marks, setMarks]   = useState(1)

  if (!bidModalOpen) return null;

  const hb = gameState?.high_bid  ?? -1
  const hm = gameState?.high_marks ?? 1
  const highStr = hb === -1 ? 'None (open)'
    : hb === 0  ? `Low (${hm} mark${hm > 1 ? 's' : ''})`
    : hb === 42 ? `42 (${hm} mark${hm > 1 ? 's' : ''})`
    : String(hb)

  const bidValues = gameState?.available_bids ?? []

  function submit() {
    if (selBid === null) { addToast('Select a bid first', 'error'); return }
    emitBid(selBid, (selBid === 0 || selBid === 42) ? marks : 1)
    setSelBid(null)
  }

  function pass() {
    useGameStore.getState().emitBid(-1, 1)
    setSelBid(null)
  }

  return (
    <Modal>
      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text)', marginBottom: '.15rem' }}>Your Bid</h3>
      <p style={{ fontSize: '.85rem', color: 'var(--text-muted)', marginBottom: '.75rem' }}>
        Current high bid: <strong style={{ color: 'var(--text)' }}>{highStr}</strong>
      </p>

      {/* Bid grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '.35rem', margin: '.5rem 0' }}>
        {bidValues.map(v => (
          <BidTile key={v} label={String(v)} val={v} selected={selBid === v} onSelect={setSelBid} />
        ))}
        <BidTile label="Low"  val={0}  selected={selBid === 0}  onSelect={setSelBid} special />
        <BidTile label="42"   val={42} selected={selBid === 42} onSelect={setSelBid} special />
      </div>

      {/* Marks stepper (only for Low/42) */}
      {(selBid === 0 || selBid === 42) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', margin: '.5rem 0', padding: '.65rem', background: 'var(--bg)', borderRadius: 'var(--radius)' }}>
          <span style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>Marks:</span>
          <button onClick={() => setMarks(m => Math.max(1, m - 1))} style={stepBtn}>−</button>
          <span style={{ fontWeight: 700, fontSize: '1rem', minWidth: 20, textAlign: 'center' }}>{marks}</span>
          <button onClick={() => setMarks(m => Math.min(5, m + 1))} style={stepBtn}>+</button>
          <span style={{ fontSize: '.78rem', color: 'var(--text-faint)' }}>(current: {hm})</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: '.5rem', marginTop: '.75rem' }}>
        <button onClick={submit} style={accentBtn}>Submit Bid</button>
        <button onClick={pass} style={outlineBtn}>Pass</button>
      </div>

      {/* Hand peek */}
      {myHand.length > 0 && (
        <div style={{ marginTop: '.75rem', paddingTop: '.6rem', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: '.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.4rem' }}>
            Your Hand
          </div>
          <div style={{ display: 'flex', gap: '.3rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {myHand.map(([a, b], i) => <Domino key={i} a={a} b={b} size="sm" />)}
          </div>
        </div>
      )}
    </Modal>
  )
}

function BidTile({ label, val, selected, onSelect, special }: {
  label: string; val: number; selected: boolean;
  onSelect: (v: number) => void; special?: boolean;
}) {
  return (
    <button onClick={() => onSelect(val)} style={{
      background: selected ? 'var(--accent)' : 'var(--bg)',
      border: `1.5px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-sm)',
      padding: '.5rem .25rem',
      textAlign: 'center', fontSize: '.85rem', fontWeight: 600,
      cursor: 'pointer',
      color: selected ? '#fff' : special ? 'var(--accent)' : 'var(--text)',
      transition: 'all var(--trans)',
    }}>
      {label}
    </button>
  )
}

const stepBtn: React.CSSProperties = {
  width: 28, height: 28, borderRadius: '50%',
  background: 'var(--surface)', border: '1.5px solid var(--border)',
  cursor: 'pointer', fontWeight: 700, fontSize: '1rem',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
const accentBtn: React.CSSProperties = {
  background: 'var(--accent)', color: '#fff',
  padding: '.65rem 1.4rem', borderRadius: 'var(--radius)',
  fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '.9rem',
}
const outlineBtn: React.CSSProperties = {
  background: 'transparent', color: 'var(--text-muted)',
  padding: '.65rem 1.4rem', borderRadius: 'var(--radius)',
  fontWeight: 600, border: '1.5px solid var(--border)', cursor: 'pointer', fontSize: '.9rem',
}
