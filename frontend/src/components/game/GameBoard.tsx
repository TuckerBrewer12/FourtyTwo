import { useGameStore } from '../../store/gameStore'
import ScoreHeader from './ScoreHeader'
import TrickCenter from './TrickCenter'
import PlayerZone from './PlayerZone'
import HandArea from './HandArea'
import StatusBar from './StatusBar'

// Returns the player number sitting at the given seat relative to myPNum
function pnumAt(seat: 'north' | 'south' | 'east' | 'west', myPNum: number | null): number {
  if (!myPNum) {
    // Spectator: P1=north, P2=east, P3=south, P4=west
    return { north: 1, east: 2, south: 3, west: 4 }[seat]
  }
  const offsets = { south: 0, west: 1, north: 2, east: 3 }
  return ((myPNum - 1 + offsets[seat]) % 4) + 1
}

export default function GameBoard() {
  const { myPNum, isSpectator } = useGameStore(s => ({
    myPNum:      s.myPNum,
    isSpectator: s.isSpectator,
  }))

  const pNorth = pnumAt('north', myPNum)
  const pWest  = pnumAt('west',  myPNum)
  const pEast  = pnumAt('east',  myPNum)
  const pSouth = pnumAt('south', myPNum)

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
    </div>
  )
}
