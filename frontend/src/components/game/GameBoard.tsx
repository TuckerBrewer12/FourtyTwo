import { useGameStore } from '../../store/gameStore'
import { useShallow } from 'zustand/react/shallow'
import ScoreHeader from './ScoreHeader'
import ScorePanel from './ScorePanel'
import TrickCenter from './TrickCenter'
import PlayerZone from './PlayerZone'
import HandArea from './HandArea'

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

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(135deg, var(--bg-start) 0%, #f8faf9 50%, var(--bg-end) 100%)',
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

      {/* Top bar */}
      <ScoreHeader />

      {/* Main content: sidebar + game area */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

        {/* Left sidebar */}
        <ScorePanel />

        {/* Game area */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          overflow: 'hidden',
        }}>
          {/* Board — fills available space */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '1rem',
            minHeight: 0,
          }}>
            {/* North player */}
            <PlayerZone seat="north" pnum={pNorth} />

            {/* Table with west/east players flanking */}
            <div style={{
              flex: 1,
              width: '100%',
              display: 'flex',
              alignItems: 'stretch',
              minHeight: 0,
            }}>
              {/* West player */}
              <div style={{ display: 'flex', alignItems: 'center', paddingRight: '.5rem' }}>
                <PlayerZone seat="west" pnum={pWest} vertical />
              </div>

              {/* Felt table */}
              <div style={{ flex: 1, display: 'flex' }}>
                <TrickCenter />
              </div>

              {/* East player */}
              <div style={{ display: 'flex', alignItems: 'center', paddingLeft: '.5rem' }}>
                <PlayerZone seat="east" pnum={pEast} vertical />
              </div>
            </div>
          </div>

          {/* Hand area — flows naturally below the board, centered */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '.75rem 1rem 1rem', flexShrink: 0 }}>
            <HandArea />
          </div>
        </div>
      </div>

      {/* Bidding countdown overlay */}
      {biddingCountdown !== null && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 40,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{
            background: 'var(--surface)', borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-neu)', border: '1px solid var(--border)',
            padding: '1.5rem 2.5rem', textAlign: 'center', animation: 'slideUp .2s ease',
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
