import { useGameStore } from '../../store/gameStore'
import { getValidPlays } from '../../hooks/useValidPlays'
import Domino from '../domino/Domino'

export default function HandArea() {
  const { myHand, myTurn, isSpectator, gameState, emitPlay } = useGameStore(s => ({
    myHand:      s.myHand,
    myTurn:      s.myTurn,
    isSpectator: s.isSpectator,
    gameState:   s.gameState,
    emitPlay:    s.emitPlay,
  }))

  if (isSpectator) return null;

  const trick = gameState?.trick ?? []
  const trump = gameState?.trump ?? null
  const valid = myTurn ? getValidPlays(myHand, trump, trick) : []

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
          const isValid = valid.some(([va, vb]) => va === a && vb === b)
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
