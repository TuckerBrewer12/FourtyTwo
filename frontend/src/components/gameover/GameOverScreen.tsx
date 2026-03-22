import { useGameStore } from '../../store/gameStore'

export default function GameOverScreen() {
  const { gameOverData, gameState, goLobby, emitNewHand } = useGameStore(s => ({
    gameOverData: s.gameOverData,
    gameState:    s.gameState,
    goLobby:      s.goLobby,
    emitNewHand:  s.emitNewHand,
  }))

  if (!gameOverData) return null;
  const d  = gameOverData
  const wt = d.winner_team

  const history = gameState?.hand_history ?? []

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem', overflowY: 'auto',
    }}>
      <div style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ fontSize: '4rem', textAlign: 'center', animation: 'bounce .6s ease' }}>🏆</div>
        <h2 style={{
          textAlign: 'center', fontSize: '2rem', fontWeight: 900,
          color: wt === 1 ? 'var(--t1)' : 'var(--t2)',
        }}>
          Team {wt} Wins!
        </h2>

        <div style={{
          background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow)', padding: '1.5rem',
          border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1rem',
        }}>
          {/* Final scores */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
            {[1, 2].map(team => {
              const total = team === 1 ? d.team1_total : d.team2_total
              const marks = team === 1 ? d.team1_marks : d.team2_marks
              const color = team === 1 ? 'var(--t1)' : 'var(--t2)'
              const won   = wt === team
              return (
                <div key={team} style={{
                  background: won ? 'rgba(251,191,36,.05)' : 'var(--bg)',
                  border: `1.5px solid ${won ? 'var(--warning)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-lg)', padding: '1.25rem', textAlign: 'center',
                }}>
                  <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                    Team {team} (P{team === 1 ? '1 & 3' : '2 & 4'})
                  </div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 900, color }}>{total}</div>
                  <div style={{ fontSize: '.9rem', color: 'var(--text-muted)' }}>{marks} mark{marks !== 1 ? 's' : ''}</div>
                </div>
              )
            })}
          </div>

          {/* Hand history */}
          {history.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.78rem' }}>
              <thead>
                <tr>
                  {['Hand','Bid','T1','T2'].map(h => (
                    <th key={h} style={{ color: 'var(--text-faint)', fontSize: '.68rem', textTransform: 'uppercase', letterSpacing: '.04em', padding: '.2rem .3rem', textAlign: 'center' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map(h => (
                  <tr key={h.hand_num} style={{ background: h.made ? 'rgba(34,197,94,.04)' : 'rgba(239,68,68,.04)' }}>
                    <td style={{ ...histCell, color: 'var(--text)' }}>
                      H{h.hand_num}{' '}
                      <span style={{ color: h.made ? 'var(--success)' : 'var(--danger)' }}>
                        {h.made ? '✓' : '✗'}
                      </span>
                    </td>
                    <td style={histCell}>{h.high_bid === 0 ? 'Low' : h.high_bid}</td>
                    <td style={{ ...histCell, color: 'var(--t1)', fontWeight: 600 }}>{h.t1_gained}</td>
                    <td style={{ ...histCell, color: 'var(--t2)', fontWeight: 600 }}>{h.t2_gained}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <button onClick={() => { useGameStore.setState({ gameOverData: null }); emitNewHand() }} style={{
            background: 'var(--accent)', color: '#fff', padding: '.75rem',
            borderRadius: 'var(--radius)', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '.95rem',
          }}>Play Again</button>
          <button onClick={goLobby} style={{
            background: 'transparent', color: 'var(--text-muted)', padding: '.65rem',
            borderRadius: 'var(--radius)', fontWeight: 600,
            border: '1.5px solid var(--border)', cursor: 'pointer',
          }}>Back to Lobby</button>
        </div>
      </div>
    </div>
  )
}

const histCell: React.CSSProperties = {
  padding: '.25rem .3rem', borderTop: '1px solid var(--border)', textAlign: 'center', color: 'var(--text-muted)',
}
