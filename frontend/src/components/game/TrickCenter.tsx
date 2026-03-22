import { useGameStore } from '../../store/gameStore'
import Domino from '../domino/Domino'

function seatOf(pnum: number, myPNum: number | null): 'south' | 'west' | 'north' | 'east' {
  if (!myPNum) return 'north' // spectator: view from P1 perspective
  const diff = ((pnum - myPNum + 4) % 4)
  return (['south', 'west', 'north', 'east'] as const)[diff]
}

export default function TrickCenter() {
  const { gameState, myPNum } = useGameStore(s => ({
    gameState: s.gameState,
    myPNum:    s.myPNum,
  }))

  const trick = gameState?.trick ?? []
  const slots: Record<string, React.ReactNode> = {}
  trick.forEach(item => {
    const seat = seatOf(item.player, myPNum)
    slots[seat] = (
      <Domino
        a={item.domino[0]} b={item.domino[1]}
        size="md" inTrick
      />
    )
  })

  const count = trick.length

  return (
    <div style={{
      gridArea: 'center',
      display: 'grid',
      gridTemplateAreas: '". n-slot ." "w-slot mid e-slot" ". s-slot ."',
      gridTemplateColumns: '1fr auto 1fr',
      gridTemplateRows: '1fr auto 1fr',
      alignItems: 'center',
      justifyItems: 'center',
      background: 'var(--table-felt)',
      borderRadius: '50%',
      border: '3px solid var(--table-border)',
      boxShadow: 'inset 0 2px 8px rgba(0,0,0,.05), 0 4px 20px rgba(0,0,0,.07)',
      position: 'relative',
      zIndex: 1,
      margin: '8px',
    }}>
      <div style={{ gridArea: 'n-slot', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '.35rem' }}>
        {slots.north}
      </div>
      <div style={{ gridArea: 'w-slot', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '.35rem' }}>
        {slots.west}
      </div>
      <div style={{
        gridArea: 'mid',
        width: 56, height: 56, borderRadius: '50%',
        background: 'rgba(255,255,255,.4)',
        border: '1px solid rgba(255,255,255,.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '.72rem', color: 'rgba(0,0,0,.5)', fontWeight: 700,
      }}>
        {count > 0 ? `${count}/4` : 'trick'}
      </div>
      <div style={{ gridArea: 'e-slot', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '.35rem' }}>
        {slots.east}
      </div>
      <div style={{ gridArea: 's-slot', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '.35rem' }}>
        {slots.south}
      </div>
    </div>
  )
}
