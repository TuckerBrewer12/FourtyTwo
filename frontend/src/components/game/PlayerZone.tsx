import { useGameStore } from '../../store/gameStore'
import { useShallow } from 'zustand/react/shallow'

interface PlayerZoneProps {
  seat?: 'north' | 'south' | 'east' | 'west';
  pnum: number;
  vertical?: boolean;
}

// Tile silhouette — portrait (for north/south) or landscape-rotated (for east/west)
function TileSilhouette({ sideways }: { sideways?: boolean }) {
  return (
    <div style={{
      position: 'relative',
      width:  sideways ? 12 : 28,
      height: sideways ? 28 : 12,
      background: 'linear-gradient(135deg, rgba(255,255,255,.75) 0%, rgba(210,225,218,.55) 100%)',
      border: '1px solid rgba(255,255,255,.9)',
      borderRadius: 3,
      boxShadow: '1px 2px 4px rgba(0,0,0,.12)',
      flexShrink: 0,
    }}>
      {/* Divider line — vertical center for landscape, horizontal center for portrait */}
      <div style={{
        position: 'absolute',
        ...(sideways
          ? { top: '50%', left: 0, right: 0, height: 1 }
          : { top: 0, bottom: 0, left: '50%', width: 1 }),
        background: 'rgba(0,0,0,.12)',
      }} />
    </div>
  )
}

// Pyramid for north/south: 3 tiles top row, up to 4 bottom row (horizontal expansion)
// Pyramid for east/west:   left col 3 tiles, right col up to 4  (vertical expansion toward table)
function TilePyramid({ count, sideways }: { count: number; sideways?: boolean }) {
  if (count === 0) return null

  if (sideways) {
    // Two columns: left col has min(count,3), right col has remainder
    const leftCol  = Math.min(count, 3)
    const rightCol = Math.max(0, count - 3)
    return (
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '.2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.2rem' }}>
          {Array.from({ length: leftCol }, (_, i) => <TileSilhouette key={i} sideways />)}
        </div>
        {rightCol > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.2rem' }}>
            {Array.from({ length: rightCol }, (_, i) => <TileSilhouette key={i + 3} sideways />)}
          </div>
        )}
      </div>
    )
  }

  // Horizontal pyramid (north/south)
  const topRow    = Math.min(count, 3)
  const bottomRow = Math.max(0, count - 3)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.2rem' }}>
      <div style={{ display: 'flex', gap: '.2rem' }}>
        {Array.from({ length: topRow }, (_, i) => <TileSilhouette key={i} />)}
      </div>
      {bottomRow > 0 && (
        <div style={{ display: 'flex', gap: '.2rem' }}>
          {Array.from({ length: bottomRow }, (_, i) => <TileSilhouette key={i + 3} />)}
        </div>
      )}
    </div>
  )
}

export default function PlayerZone({ seat, pnum, vertical }: PlayerZoneProps) {
  const { gameState, myPNum, isSpectator, myHand } = useGameStore(useShallow(s => ({
    gameState:   s.gameState,
    myPNum:      s.myPNum,
    isSpectator: s.isSpectator,
    myHand:      s.myHand,
  })))

  if (!pnum) return null;

  const gs        = gameState
  const name      = gs?.players?.[pnum] ?? `P${pnum}`
  const isMe      = pnum === myPNum && !isSpectator
  const myTeam    = myPNum !== null ? (gs?.team_map?.[myPNum] ?? null) : null
  const pnumTeam  = gs?.team_map?.[pnum] ?? null
  const isPartner = myTeam !== null && pnumTeam !== null && myTeam === pnumTeam && !isMe
  const isActive  = gs?.phase === 'playing' && gs.play_turn === pnum
  const tileCount = isMe ? myHand.length : (gs?.tile_counts?.[pnum] ?? 0)
  const displayName = isMe ? 'You' : name

  const dotColor = isActive ? 'var(--success)' : isPartner ? 'var(--t1)' : 'var(--text-faint)'

  const namePill = (
    <div style={{
      background: 'var(--surface)',
      borderRadius: 'var(--radius-pill)',
      boxShadow: 'var(--shadow-neu-sm)',
      padding: '.35rem .75rem',
      display: 'flex',
      alignItems: 'center',
      gap: '.4rem',
      whiteSpace: 'nowrap',
      flexShrink: 0,
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: '50%',
        background: dotColor,
        flexShrink: 0,
        boxShadow: isActive ? `0 0 0 2px rgba(34,197,94,.25)` : 'none',
        transition: 'background var(--trans)',
      }} />
      <span style={{
        fontSize: '.9rem',
        fontWeight: 700,
        letterSpacing: '.06em',
        textTransform: 'uppercase',
        color: 'var(--text-muted)',
      }}>
        {displayName}
      </span>
    </div>
  )

  // Vertical layout = east/west seat — show as a horizontal strip: [name][tiles] or [tiles][name]
  if (vertical) {
    const isWest = seat === 'west'
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '.4rem',
        padding: '.4rem .25rem',
      }}>
        {/* West: name on left (behind them), tiles on right */}
        {isWest && namePill}
        {!isMe && tileCount > 0 && <TilePyramid count={tileCount} sideways />}
        {/* East: tiles on left, name on right (behind them) */}
        {!isWest && namePill}
      </div>
    )
  }

  // Horizontal layout (north/south seats)
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '.4rem',
      padding: '.4rem .5rem',
    }}>
      {/* Name pill */}
      <div style={{
        background: 'var(--surface)',
        borderRadius: 'var(--radius-pill)',
        boxShadow: 'var(--shadow-neu-sm)',
        padding: '.35rem 1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '.45rem',
        whiteSpace: 'nowrap',
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: dotColor,
          flexShrink: 0,
          boxShadow: isActive ? `0 0 0 2px rgba(34,197,94,.25)` : 'none',
          transition: 'background var(--trans)',
        }} />
        <span style={{
          fontSize: '.9rem',
          fontWeight: 700,
          letterSpacing: '.06em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
        }}>
          {displayName}
        </span>
      </div>

      {/* Pyramid tile silhouettes */}
      {!isMe && tileCount > 0 && <TilePyramid count={tileCount} />}
    </div>
  )
}
