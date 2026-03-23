import { useGameStore } from '../../store/gameStore'
import { useShallow } from 'zustand/react/shallow'
import ScoreHeader from './ScoreHeader'
import TrickCenter from './TrickCenter'
import PlayerZone from './PlayerZone'
import HandArea from './HandArea'
import StatusBar from './StatusBar'

// Invert a seat_map {pnum→seat} to {seat→pnum}
function invertSeatMap(seatMap: Record<number, string> | null): Record<string, number> {
  if (!seatMap) return { north: 1, east: 2, south: 3, west: 4 }
  const inv: Record<string, number> = {}
  for (const [pnum, seat] of Object.entries(seatMap)) inv[seat] = Number(pnum)
  return inv
}

export default function GameBoard() {
  const { isSpectator, biddingCountdown, seatMap } = useGameStore(useShallow(s => ({
    isSpectator:      s.isSpectator,
    biddingCountdown: s.biddingCountdown,
    seatMap:          s.seatMap,
  })))

  const byName = invertSeatMap(seatMap)
  const pNorth = byName.north ?? 1
  const pWest  = byName.west  ?? 4
  const pEast  = byName.east  ?? 2
  const pSouth = byName.south ?? 3

  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'grid',
      gridTemplateRows: 'auto 1fr auto auto',
      background: 'var(--bg)',
      overflow: 'hidden',
    }}>
      {/* Spectator banner */}
      {isSpectator && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30,
          background: 'rgba(251,146,60,.9)',
          textAlign: 'center', padding: '.3rem 1rem',
          fontSize: '.82rem', fontWeight: 600, color: '#fff',
        }}>
          👀 You are spectating this match
        </div>
      )}

      {/* Header */}
      <ScoreHeader />

      {/* Game board grid */}
      <div style={{
        display: 'grid',
        gridTemplateAreas: '". north ." "west center east" ". south ."',
        gridTemplateColumns: 'minmax(80px,100px) 1fr minmax(80px,100px)',
        gridTemplateRows: 'minmax(80px,110px) 1fr minmax(80px,110px)',
        background: 'var(--bg)',
        overflow: 'hidden',
      }}>
        <div style={{ gridArea: 'north' }}><PlayerZone seat="north" pnum={pNorth} /></div>
        <div style={{ gridArea: 'west'  }}><PlayerZone seat="west"  pnum={pWest}  /></div>
        <TrickCenter />
        <div style={{ gridArea: 'east'  }}><PlayerZone seat="east"  pnum={pEast}  /></div>
        <div style={{ gridArea: 'south' }}><PlayerZone seat="south" pnum={pSouth} /></div>
      </div>

      {/* Status + Hand */}
      <StatusBar />
      <HandArea />

      {/* Bidding countdown overlay */}
      {biddingCountdown !== null && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 40,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{
            background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)',
            padding: '1.5rem 2rem', textAlign: 'center', animation: 'slideUp .2s ease',
          }}>
            <div style={{ fontSize: '.82rem', color: 'var(--text-muted)', marginBottom: '.3rem' }}>
              Look at your hand — bidding starts in
            </div>
            <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--accent)', lineHeight: 1 }}>
              {biddingCountdown}
            </div>
            <div style={{ fontSize: '.75rem', color: 'var(--text-faint)', marginTop: '.3rem' }}>
              Check your dominoes below ↓
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
