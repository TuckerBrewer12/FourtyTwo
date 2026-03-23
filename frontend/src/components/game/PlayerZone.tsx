import { useGameStore } from '../../store/gameStore'
import { useShallow } from 'zustand/react/shallow'

interface PlayerZoneProps {
  seat?: 'north' | 'south' | 'east' | 'west';
  pnum: number;
}

export default function PlayerZone({ pnum }: PlayerZoneProps) {
  const { gameState, myPNum, isSpectator, myHand } = useGameStore(useShallow(s => ({
    gameState:   s.gameState,
    myPNum:      s.myPNum,
    isSpectator: s.isSpectator,
    myHand:      s.myHand,
  })))

  if (!pnum) return null;

  const gs      = gameState
  const name    = gs?.players?.[pnum] ?? `P${pnum}`
  const isMe      = pnum === myPNum && !isSpectator
  const myTeam    = myPNum !== null ? (gs?.team_map?.[myPNum] ?? null) : null
  const pnumTeam  = gs?.team_map?.[pnum] ?? null
  const isPartner = myTeam !== null && pnumTeam !== null && myTeam === pnumTeam && !isMe
  const isActive  = gs?.phase === 'playing' && gs.play_turn === pnum

  const borderColor = isMe ? 'var(--accent)' : isPartner ? 'var(--t1)' : 'var(--t2)'
  const textColor   = isMe ? 'var(--accent)' : isPartner ? 'var(--t1)' : 'var(--t2)'

  // Tile count: use server-provided tile_counts; fall back to myHand length for self
  const count = isMe ? myHand.length : (gs?.tile_counts?.[pnum] ?? 0)

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
