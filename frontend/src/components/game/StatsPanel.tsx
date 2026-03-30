import { useGameStore } from '../../store/gameStore'
import { useShallow } from 'zustand/react/shallow'

export default function StatsPanel() {
  const { gameState, myPNum, statsOpen } = useGameStore(useShallow(s => ({
    gameState: s.gameState,
    myPNum: s.myPNum,
    statsOpen: s.statsOpen,
  })))

  if (!statsOpen || !gameState) return null

  const close = () => useGameStore.setState({ statsOpen: false })
  const history = gameState.hand_history ?? []
  const myTeam = myPNum ? (myPNum % 2 === 1 ? 1 : 2) : 1
  const isMarks = gameState.game_mode === 'marks_7'

  // Compute stats
  const totalHands = history.length
  const handsWon = history.filter(h => {
    const bidTeamWon = h.made
    const isBidTeam = h.bid_team === myTeam
    return (isBidTeam && bidTeamWon) || (!isBidTeam && !bidTeamWon)
  }).length
  const winRate = totalHands > 0 ? Math.round((handsWon / totalHands) * 100) : 0

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'rgba(0,0,0,.4)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }} onClick={close}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
        padding: '1.5rem', maxWidth: 400, width: '100%',
        boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)',
        maxHeight: '80vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Game Stats</h3>
          <button onClick={close} style={{
            background: 'var(--surface-soft)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', padding: '.25rem .5rem',
            cursor: 'pointer', fontSize: '.8rem', color: 'var(--text-muted)',
          }}>✕</button>
        </div>

        {/* Summary row */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          gap: '.5rem', marginBottom: '1rem',
        }}>
          <StatBox label="Hands Played" value={String(totalHands)} />
          <StatBox label="Hands Won" value={String(handsWon)} color="var(--success)" />
          <StatBox label="Win Rate" value={`${winRate}%`} color="var(--accent)" />
        </div>

        {/* Overall score */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: '.5rem', marginBottom: '1rem',
        }}>
          <div style={{
            background: 'var(--t1-bg)', border: '1px solid var(--t1-border)',
            borderRadius: 'var(--radius)', padding: '.6rem', textAlign: 'center',
          }}>
            <div style={{ fontSize: '.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
              {myTeam === 1 ? 'Your Team' : 'Team 1'}
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--t1)' }}>
              {isMarks ? (gameState.team1_marks ?? 0) : (gameState.team1_total ?? 0)}
            </div>
            <div style={{ fontSize: '.65rem', color: 'var(--text-faint)' }}>
              {isMarks ? 'marks' : 'points'}
            </div>
          </div>
          <div style={{
            background: 'var(--t2-bg)', border: '1px solid var(--t2-border)',
            borderRadius: 'var(--radius)', padding: '.6rem', textAlign: 'center',
          }}>
            <div style={{ fontSize: '.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
              {myTeam === 2 ? 'Your Team' : 'Team 2'}
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--t2)' }}>
              {isMarks ? (gameState.team2_marks ?? 0) : (gameState.team2_total ?? 0)}
            </div>
            <div style={{ fontSize: '.65rem', color: 'var(--text-faint)' }}>
              {isMarks ? 'marks' : 'points'}
            </div>
          </div>
        </div>

        {/* Hand history list */}
        {history.length > 0 && (
          <>
            <div style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.4rem' }}>
              Hand History
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
              {[...history].reverse().map((h, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '.4rem .6rem', borderRadius: 'var(--radius-sm)',
                  background: 'var(--surface-soft)', border: '1px solid var(--border)',
                  fontSize: '.75rem',
                }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
                    Hand {h.hand_num}
                  </span>
                  <span style={{
                    fontWeight: 700,
                    color: h.made ? 'var(--success)' : 'var(--danger)',
                  }}>
                    T{h.bid_team} bid {h.high_bid} — {h.made ? 'Made' : 'Set'}
                  </span>
                  <span style={{ color: 'var(--text-faint)', fontSize: '.7rem' }}>
                    {h.t1_total}–{h.t2_total}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {history.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--text-faint)', fontSize: '.82rem', fontStyle: 'italic' }}>
            No hands played yet
          </p>
        )}
      </div>
    </div>
  )
}

function StatBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{
      background: 'var(--surface-soft)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)', padding: '.5rem', textAlign: 'center',
    }}>
      <div style={{ fontSize: '.6rem', color: 'var(--text-faint)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>
        {label}
      </div>
      <div style={{ fontSize: '1.2rem', fontWeight: 900, color: color ?? 'var(--text)', marginTop: '.1rem' }}>
        {value}
      </div>
    </div>
  )
}
