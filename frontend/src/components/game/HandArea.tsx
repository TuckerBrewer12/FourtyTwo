import { useGameStore } from '../../store/gameStore'
import { useShallow } from 'zustand/react/shallow'
import Domino from '../domino/Domino'

export default function HandArea() {
  const { myHand, myTurn, isSpectator, validPlays, emitPlay } = useGameStore(useShallow(s => ({
    myHand:      s.myHand,
    myTurn:      s.myTurn,
    isSpectator: s.isSpectator,
    validPlays:  s.validPlays,
    emitPlay:    s.emitPlay,
  })))

  if (isSpectator) return null;

  return (
    <div style={{
      background: 'var(--surface)',
      borderTop: '1px solid var(--border)',
      boxShadow: '0 -2px 8px rgba(0,0,0,.04)',
      padding: '.6rem .5rem .65rem',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.35rem',
      zIndex: 2, position: 'relative',
    }}>
      <div style={{
        fontSize: '.68rem', fontWeight: 700,
        color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.08em',
      }}>
        Your Hand
      </div>
      <div style={{
        display: 'flex', gap: '.4rem', flexWrap: 'wrap',
        justifyContent: 'center', alignItems: 'flex-end',
      }}>
        {myHand.map(([a, b], i) => {
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
        })}
      </div>
    </div>
  )
}
