import { useGameStore } from '../../store/gameStore'
import { useShallow } from 'zustand/react/shallow'

interface PlayerZoneProps {
  seat?: 'north' | 'south' | 'east' | 'west';
  pnum: number;
  vertical?: boolean;
}

// Tile silhouette — portrait (for north/south) or landscape-rotated (for east/west)
function TileSilhouette({ sideways, index }: { sideways?: boolean; index: number }) {
  return (
    <div style={{
      position: 'relative',
      width:  sideways ? 18 : 40,
      height: sideways ? 40 : 18,
      background: 'linear-gradient(135deg, rgba(255,255,255,.8) 0%, rgba(200,220,212,.6) 100%)',
      border: '1px solid rgba(255,255,255,.95)',
      borderRadius: 4,
      boxShadow: '1px 2px 6px rgba(0,0,0,.15), 0 1px 2px rgba(0,0,0,.08)',
      flexShrink: 0,
      animation: 'tileAppear 0.3s ease both',
      animationDelay: `${index * 60}ms`,
    }}>
      {/* Divider line */}
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

function TilePyramid({ count, sideways }: { count: number; sideways?: boolean }) {
  if (count === 0) return null

  if (sideways) {
    const leftCol  = Math.min(count, 3)
    const rightCol = Math.max(0, count - 3)
    return (
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '.2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.2rem' }}>
          {Array.from({ length: leftCol }, (_, i) => <TileSilhouette key={i} sideways index={i} />)}
        </div>
        {rightCol > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.2rem' }}>
            {Array.from({ length: rightCol }, (_, i) => <TileSilhouette key={i + 3} sideways index={i + 3} />)}
          </div>
        )}
      </div>
    )
  }

  const topRow    = Math.min(count, 3)
  const bottomRow = Math.max(0, count - 3)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.2rem' }}>
      <div style={{ display: 'flex', gap: '.2rem' }}>
        {Array.from({ length: topRow }, (_, i) => <TileSilhouette key={i} index={i} />)}
      </div>
      {bottomRow > 0 && (
        <div style={{ display: 'flex', gap: '.2rem' }}>
          {Array.from({ length: bottomRow }, (_, i) => <TileSilhouette key={i + 3} index={i + 3} />)}
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

  const dotColor = isActive
    ? 'var(--success)'
    : isPartner ? 'var(--t1)' : 'var(--text-faint)'

  const teamColor = (pnumTeam === 1) ? 'var(--t1)' : 'var(--t2)'

  // Active player gets a dramatic pulsing name pill
  const namePillStyle: React.CSSProperties = {
    background: isActive
      ? 'linear-gradient(135deg, rgba(16,185,129,.12) 0%, var(--surface) 60%)'
      : isMe
        ? 'linear-gradient(135deg, rgba(0,109,91,.08) 0%, var(--surface) 70%)'
        : 'var(--surface)',
    borderRadius: 'var(--radius-pill)',
    boxShadow: isActive
      ? 'none'  // overridden by animation
      : 'var(--shadow-neu-sm)',
    padding: '.38rem .85rem',
    display: 'flex',
    alignItems: 'center',
    gap: '.4rem',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    border: isActive
      ? '1.5px solid rgba(34,197,94,.45)'
      : isMe
        ? '1px solid rgba(0,109,91,.15)'
        : 'none',
    animation: isActive ? 'activePlayerGlow 1.8s ease-in-out infinite' : 'none',
    transition: 'all 0.3s ease',
    position: 'relative',
    overflow: 'hidden',
  }

  const namePill = (
    <div style={namePillStyle}>
      {/* Shimmer overlay when active */}
      {isActive && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(105deg, transparent 30%, rgba(34,197,94,.12) 50%, transparent 70%)',
          animation: 'shimmerSweep 2s ease-in-out infinite',
          borderRadius: 'inherit',
          pointerEvents: 'none',
        }} />
      )}

      {/* Active pulse ring */}
      {isActive && (
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          border: '2px solid rgba(34,197,94,.6)',
          animation: 'activePlayerRing 1.8s ease-out infinite',
          pointerEvents: 'none',
        }} />
      )}

      {/* Status dot */}
      <span style={{
        width: 8, height: 8, borderRadius: '50%',
        background: dotColor,
        flexShrink: 0,
        animation: isActive ? 'activeDot 1.8s ease-in-out infinite' : 'none',
        transition: 'background 0.3s ease',
        position: 'relative',
        zIndex: 1,
      }} />

      {/* Team color bar */}
      {pnumTeam && (
        <span style={{
          width: 3, height: 14, borderRadius: 2,
          background: teamColor,
          flexShrink: 0,
          opacity: 0.6,
          position: 'relative',
          zIndex: 1,
        }} />
      )}

      <span style={{
        fontSize: '.88rem',
        fontWeight: isActive ? 800 : 700,
        letterSpacing: '.05em',
        textTransform: 'uppercase',
        color: isActive ? 'var(--accent)' : isMe ? 'var(--text)' : 'var(--text-muted)',
        position: 'relative',
        zIndex: 1,
        transition: 'color 0.3s ease',
      }}>
        {displayName}
      </span>

      {/* Active indicator */}
      {isActive && (
        <span style={{
          fontSize: '.65rem',
          background: 'var(--success)',
          color: '#fff',
          borderRadius: 4,
          padding: '1px 5px',
          fontWeight: 700,
          letterSpacing: '.03em',
          position: 'relative',
          zIndex: 1,
          animation: 'bounce 1s ease-in-out infinite',
        }}>
          ▶
        </span>
      )}
    </div>
  )

  // Vertical layout = east/west seat
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
        {isWest && namePill}
        {!isMe && tileCount > 0 && <TilePyramid count={tileCount} sideways />}
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
      <div style={namePillStyle}>
        {/* Active shimmer */}
        {isActive && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(105deg, transparent 30%, rgba(34,197,94,.12) 50%, transparent 70%)',
            animation: 'shimmerSweep 2s ease-in-out infinite',
            borderRadius: 'inherit',
            pointerEvents: 'none',
          }} />
        )}
        {/* Active ring */}
        {isActive && (
          <div style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 'inherit',
            border: '2px solid rgba(34,197,94,.6)',
            animation: 'activePlayerRing 1.8s ease-out infinite',
            pointerEvents: 'none',
          }} />
        )}

        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: dotColor,
          flexShrink: 0,
          animation: isActive ? 'activeDot 1.8s ease-in-out infinite' : 'none',
          transition: 'background 0.3s ease',
          position: 'relative',
          zIndex: 1,
        }} />

        {pnumTeam && (
          <span style={{
            width: 3, height: 14, borderRadius: 2,
            background: teamColor,
            flexShrink: 0,
            opacity: 0.6,
            position: 'relative',
            zIndex: 1,
          }} />
        )}

        <span style={{
          fontSize: '.88rem',
          fontWeight: isActive ? 800 : 700,
          letterSpacing: '.05em',
          textTransform: 'uppercase',
          color: isActive ? 'var(--accent)' : isMe ? 'var(--text)' : 'var(--text-muted)',
          position: 'relative',
          zIndex: 1,
          transition: 'color 0.3s ease',
        }}>
          {displayName}
        </span>

        {isActive && (
          <span style={{
            fontSize: '.65rem',
            background: 'var(--success)',
            color: '#fff',
            borderRadius: 4,
            padding: '1px 5px',
            fontWeight: 700,
            letterSpacing: '.03em',
            position: 'relative',
            zIndex: 1,
            animation: 'bounce 1s ease-in-out infinite',
          }}>
            ▶
          </span>
        )}
      </div>

      {!isMe && tileCount > 0 && <TilePyramid count={tileCount} />}
    </div>
  )
}
