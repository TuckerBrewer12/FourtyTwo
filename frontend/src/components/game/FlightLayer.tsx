/**
 * FlightLayer — a fixed full-screen overlay that renders flying dominos
 * when a player plays a tile. Each domino animates from the player's
 * seat position to the center of the table.
 */
import { useGameStore } from '../../store/gameStore'
import Domino from '../domino/Domino'

// Map seat → CSS animation name
const FLY_ANIM: Record<string, string> = {
  north: 'flyFromNorth',
  south: 'flyFromSouth',
  east:  'flyFromEast',
  west:  'flyFromWest',
}

export default function FlightLayer() {
  const flightDominos = useGameStore(s => s.flightDominos)

  if (flightDominos.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        pointerEvents: 'none',
      }}
    >
      {flightDominos.map(({ id, a, b, fromSeat }) => {
        const animName = FLY_ANIM[fromSeat] ?? 'flyFromSouth'
        return (
          <div
            key={id}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              // animation starts at seat-offset and ends at center via keyframes
              animation: `${animName} 0.72s cubic-bezier(0.22, 1, 0.36, 1) forwards`,
              zIndex: 301,
              filter: 'drop-shadow(0 12px 32px rgba(0,0,0,.45))',
            }}
          >
            <Domino a={a} b={b} size="xl" vertical flying />
          </div>
        )
      })}
    </div>
  )
}
