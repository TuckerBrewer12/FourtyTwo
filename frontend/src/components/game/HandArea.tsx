import { useGameStore } from '../../store/gameStore'
import { useShallow } from 'zustand/react/shallow'
import Domino from '../domino/Domino'

export default function HandArea() {
  const { myHand, myTurn, isSpectator, validPlays, emitPlay, statusMsg } = useGameStore(useShallow(s => ({
    myHand:      s.myHand,
    myTurn:      s.myTurn,
    isSpectator: s.isSpectator,
    validPlays:  s.validPlays,
    emitPlay:    s.emitPlay,
    statusMsg:   s.statusMsg,
  })))

  if (isSpectator) return null;

  const topRow    = myHand.slice(0, 3)
  const bottomRow = myHand.slice(3, 7)

  function renderDomino(a: number, b: number, i: number) {
    const isValid = validPlays.some(([va, vb]) => va === a && vb === b)
    const playable = myTurn && isValid
    return (
      <Domino
        key={`${a}-${b}-${i}`}
        a={a} b={b} size="xl"
        playable={playable}
        invalid={myTurn && !isValid}
        onClick={playable ? () => emitPlay([a, b]) : undefined}
      />
    )
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '.4rem',
    }}>
      {/* Status message */}
      {statusMsg && (
        <div style={{
          background: 'rgba(255,255,255,.85)',
          backdropFilter: 'blur(8px)',
          borderRadius: 'var(--radius-pill)',
          padding: '.25rem .85rem',
          fontSize: '.72rem',
          fontWeight: 600,
          color: myTurn ? 'var(--accent)' : 'var(--text-muted)',
          whiteSpace: 'nowrap',
          boxShadow: '0 2px 8px rgba(0,0,0,.06)',
        }}>
          {statusMsg}
        </div>
      )}

      {/* Floating pill — pyramid layout */}
      <div style={{
        background: 'var(--surface)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-neu)',
        padding: '.75rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '.35rem',
      }}>
        {myHand.length === 0 ? (
          <div style={{
            width: 180, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '.75rem', color: 'var(--text-faint)', fontStyle: 'italic',
          }}>
            No tiles
          </div>
        ) : (
          <>
            {/* Top row — 3 tiles */}
            <div style={{ display: 'flex', gap: '.4rem' }}>
              {topRow.map(([a, b], i) => renderDomino(a, b, i))}
            </div>
            {/* Bottom row — up to 4 tiles */}
            <div style={{ display: 'flex', gap: '.4rem' }}>
              {bottomRow.map(([a, b], i) => renderDomino(a, b, i + 3))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
