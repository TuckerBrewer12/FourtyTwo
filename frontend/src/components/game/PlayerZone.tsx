import { useGameStore } from '../../store/gameStore'

interface PlayerZoneProps {
  seat?: 'north' | 'south' | 'east' | 'west';
  pnum: number;
}

export default function PlayerZone({ pnum }: PlayerZoneProps) {
  const { gameState, myPNum, isSpectator, myHand } = useGameStore(s => ({
    gameState:   s.gameState,
    myPNum:      s.myPNum,
    isSpectator: s.isSpectator,
    myHand:      s.myHand,
  }))

  if (!pnum) return null;

  const gs      = gameState
  const name    = gs?.players?.[pnum] ?? `P${pnum}`
  const isMe    = pnum === myPNum && !isSpectator
  const isPartner = myPNum !== null && pnum % 2 === myPNum % 2 && !isMe
  const isActive  = gs?.phase === 'playing' && gs.play_turn === pnum

  const borderColor = isMe ? 'var(--accent)' : isPartner ? 'var(--t1)' : 'var(--t2)'
  const textColor   = isMe ? 'var(--accent)' : isPartner ? 'var(--t1)' : 'var(--t2)'

  // Tile count
  let count: number
  if (isMe) {
    count = myHand.length
  } else {
    const played  = gs?.trick_count ?? 0
    const inTrick = (gs?.trick ?? []).filter(t => t.player === pnum).length
    count = Math.max(0, 7 - played - inTrick)
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: '.3rem', padding: '.4rem', position: 'relative',
    }}>
      {isActive && (
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: 'var(--accent)', animation: 'pulse 1.2s ease infinite',
        }} />
      )}
      <div style={{
        background: 'var(--surface)',
        border: `1.5px solid ${borderColor}`,
        borderRadius: '20px', padding: '.25rem .65rem',
        fontWeight: 700, fontSize: '.78rem',
        maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        color: textColor,
        boxShadow: 'var(--shadow-sm)',
      }}>
        {isMe ? 'You' : name}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '.2rem',
        fontSize: '.7rem', color: 'var(--text-muted)',
      }}>
        <span style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '20px', padding: '.08rem .4rem',
          fontSize: '.68rem', fontWeight: 600,
        }}>{count}</span>
      </div>
    </div>
  )
}
