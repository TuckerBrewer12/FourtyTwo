import { useGameStore } from '../../store/gameStore'
import { useShallow } from 'zustand/react/shallow'
import Domino from '../domino/Domino'

const WINNER_POS: Record<string, React.CSSProperties> = {
  north: { top: 8, left: '50%', transform: 'translateX(-50%)' },
  south: { bottom: 8, left: '50%', transform: 'translateX(-50%)' },
  east:  { right: 8, top: '50%', transform: 'translateY(-50%)' },
  west:  { left: 8, top: '50%', transform: 'translateY(-50%)' },
}

// Stack direction for won tricks near each seat
const STACK_DIR: Record<string, React.CSSProperties> = {
  north: { flexDirection: 'column', alignItems: 'center' },
  south: { flexDirection: 'column-reverse', alignItems: 'center' },
  east:  { flexDirection: 'column', alignItems: 'flex-end' },
  west:  { flexDirection: 'column', alignItems: 'flex-start' },
}

export default function TrickCenter() {
  const { gameState, seatMap, lastTrickWinner, wonTricksPerPlayer } = useGameStore(useShallow(s => ({
    gameState:          s.gameState,
    seatMap:            s.seatMap,
    lastTrickWinner:    s.lastTrickWinner,
    wonTricksPerPlayer: s.wonTricksPerPlayer,
  })))

  const trick = gameState?.trick ?? []
  const winnerSeat = lastTrickWinner != null ? (seatMap?.[lastTrickWinner] ?? 'north') : null
  const winnerPos = winnerSeat ? WINNER_POS[winnerSeat] : null

  return (
    <div style={{
      flex: 1,
      margin: '8px 12px',
      borderRadius: 16,
      background: 'var(--table-felt)',
      backgroundImage: 'radial-gradient(rgba(0,0,0,.12) 1.5px, transparent 1.5px)',
      backgroundSize: '10px 10px',
      boxShadow: 'inset 0 4px 20px rgba(0,0,0,.15), 0 4px 24px rgba(0,0,0,.1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      minHeight: 200,
    }}>
      {/* Active trick — centered row of vertical dominos */}
      {trick.length > 0 && !winnerPos && (
        <div style={{ display: 'flex', gap: '.4rem', alignItems: 'center' }}>
          {trick.map((item, i) => (
            <Domino
              key={i}
              a={item.domino[0]} b={item.domino[1]}
              size="xl" inTrick vertical
            />
          ))}
        </div>
      )}

      {/* Trick won — snap to winner's corner for 800ms */}
      {trick.length > 0 && winnerPos && (
        <div style={{ position: 'absolute', ...winnerPos, display: 'flex', gap: '.2rem', alignItems: 'center' }}>
          {trick.map((item, i) => (
            <Domino
              key={i}
              a={item.domino[0]} b={item.domino[1]}
              size="xs" vertical
            />
          ))}
        </div>
      )}

      {/* Persistent won tricks near each seat */}
      {seatMap && Object.entries(wonTricksPerPlayer).map(([pnumStr, tricks]) => {
        const pnum = Number(pnumStr)
        const seat = seatMap[pnum]
        if (!seat || tricks.length === 0) return null
        const anchorPos = WINNER_POS[seat]
        const stackDir = STACK_DIR[seat]
        // Don't show the currently animating trick group (shown above)
        const displayTricks = lastTrickWinner === pnum ? tricks.slice(0, -1) : tricks
        if (displayTricks.length === 0) return null

        return (
          <div
            key={pnum}
            style={{
              position: 'absolute',
              ...anchorPos,
              display: 'flex',
              gap: '.15rem',
              ...stackDir,
            }}
          >
            {displayTricks.map((trickDominos, ti) => (
              <div key={ti} style={{ display: 'flex', gap: '.1rem' }}>
                {trickDominos.map((d, di) => (
                  <Domino key={di} a={d[0]} b={d[1]} size="xs" vertical />
                ))}
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
