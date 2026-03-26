import { useGameStore } from '../../store/gameStore'
import { useShallow } from 'zustand/react/shallow'

const SUIT_NAMES = ['Blanks','Aces','Deuces','Threes','Fours','Fives','Sixes','Doubles']

export default function ScorePanel() {
  const { gameState, myPNum, isSpectator, wonTricksPerPlayer } = useGameStore(useShallow(s => ({
    gameState:          s.gameState,
    myPNum:             s.myPNum,
    isSpectator:        s.isSpectator,
    wonTricksPerPlayer: s.wonTricksPerPlayer,
  })))

  const gs = gameState
  const mode = gs?.game_mode ?? 'points_250'
  const isMarks = mode === 'marks_7'

  const myTeam = myPNum ? (gs?.team_map?.[myPNum] ?? null) : null

  const trump = gs?.trump ?? null
  const trumpName = trump === null ? null : trump === 7 ? 'Doubles' : SUIT_NAMES[trump]

  const highBid = gs?.high_bid ?? null
  const highBidder = gs?.high_bidder ?? null
  const highMarks = gs?.high_marks ?? 1
  const players = gs?.players ?? {}
  const bidderName = highBidder !== null ? (players[highBidder] ?? `P${highBidder}`) : null

  const bidDisplay = highBid === null ? null
    : highBid === 0 ? `Low (${highMarks}m)`
    : highBid === 42 ? `42 (${highMarks}m)`
    : `${highBid} pts`

  const trickCount = gs?.trick_count ?? 0
  const t1Score = gs?.team1_score ?? 0
  const t2Score = gs?.team2_score ?? 0

  // Score bar percentage (out of 42)
  const t1Pct = Math.min(100, (t1Score / 42) * 100)
  const t2Pct = Math.min(100, (t2Score / 42) * 100)

  const opponents = myPNum && gs?.players
    ? Object.entries(gs.players)
        .map(([k, v]) => ({ pnum: Number(k), name: v }))
        .filter(p => p.pnum !== myPNum)
    : []

  const sectionLabel: React.CSSProperties = {
    fontSize: '.6rem', fontWeight: 700, letterSpacing: '.1em',
    textTransform: 'uppercase', color: 'var(--text-faint)',
    marginBottom: '.35rem',
  }

  return (
    <div style={{
      width: 230,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: '.65rem',
      padding: '.85rem .75rem',
      borderRight: '1px solid var(--border)',
      overflowY: 'auto',
      background: 'var(--surface-soft)',
    }}>
      {/* Score card — primary visual element */}
      <div style={{
        background: 'var(--surface)',
        borderRadius: 'var(--radius)',
        padding: '.75rem',
        boxShadow: 'var(--shadow-neu-sm)',
        display: 'flex',
        flexDirection: 'column',
        gap: '.5rem',
      }}>
        <div style={sectionLabel}>Score</div>

        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.4rem',
        }}>
          {([1, 2] as const).map(team => {
            const score = team === 1 ? gs?.team1_score : gs?.team2_score
            const total = team === 1 ? gs?.team1_total : gs?.team2_total
            const marks = team === 1 ? gs?.team1_marks : gs?.team2_marks
            const color = team === 1 ? 'var(--t1)' : 'var(--t2)'
            const isMyTeam = myTeam === team
            return (
              <div key={team} style={{
                background: isMyTeam ? 'var(--accent-light)' : 'var(--bg)',
                borderRadius: 'var(--radius-sm)', padding: '.55rem .4rem', textAlign: 'center',
                border: isMyTeam ? '1.5px solid rgba(0,109,91,.2)' : '1px solid var(--border)',
                transition: 'border-color 0.3s ease',
              }}>
                <div style={{ fontSize: '.58rem', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                  {isMyTeam && !isSpectator ? 'You' : `Team ${team}`}
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color, lineHeight: 1.1, margin: '.1rem 0' }}>
                  {score ?? 0}
                </div>
                <div style={{ fontSize: '.58rem', color: 'var(--text-faint)', fontWeight: 500 }}>
                  {isMarks ? `${marks ?? 0} marks` : `${total ?? 0} total`}
                </div>
              </div>
            )
          })}
        </div>

        {/* Score bars */}
        {gs?.phase === 'playing' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.25rem' }}>
            {([
              { label: 'T1', pct: t1Pct, color: 'var(--t1)', score: t1Score },
              { label: 'T2', pct: t2Pct, color: 'var(--t2)', score: t2Score },
            ]).map(bar => (
              <div key={bar.label} style={{ display: 'flex', alignItems: 'center', gap: '.35rem' }}>
                <span style={{ fontSize: '.55rem', fontWeight: 700, color: bar.color, width: 16, textAlign: 'right' }}>
                  {bar.score}
                </span>
                <div style={{
                  flex: 1, height: 5, borderRadius: 3,
                  background: 'var(--border)',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${bar.pct}%`,
                    height: '100%',
                    background: bar.color,
                    borderRadius: 3,
                    transition: 'width 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Current hand info */}
      {(bidDisplay || trumpName) && (
        <div style={{
          background: 'var(--surface)',
          borderRadius: 'var(--radius)',
          padding: '.6rem .7rem',
          boxShadow: 'var(--shadow-neu-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: '.25rem',
        }}>
          <div style={sectionLabel}>This Hand</div>
          {bidDisplay && bidderName && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '.7rem', color: 'var(--text-faint)' }}>Bid</span>
              <span style={{ fontSize: '.75rem', fontWeight: 700, color: 'var(--accent)' }}>
                {bidDisplay}
              </span>
            </div>
          )}
          {trumpName !== null && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '.7rem', color: 'var(--text-faint)' }}>Trump</span>
              <span style={{
                fontSize: '.75rem', fontWeight: 700,
                color: trump === 7 ? '#d97706' : `var(--suit-${trump})`,
              }}>
                {trumpName}
              </span>
            </div>
          )}
          {trickCount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '.7rem', color: 'var(--text-faint)' }}>Tricks</span>
              <span style={{ fontSize: '.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                {trickCount}/7
              </span>
            </div>
          )}
        </div>
      )}

      {/* Opponents */}
      {opponents.length > 0 && (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: '.3rem',
        }}>
          <div style={sectionLabel}>Players</div>
          {opponents
            .filter(p => gs?.team_map?.[p.pnum] !== myTeam)
            .map(p => {
              const tricksWon = Object.values(wonTricksPerPlayer[p.pnum] ?? []).length
              return (
                <div key={p.pnum} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'var(--surface)', borderRadius: 'var(--radius-sm)',
                  padding: '.4rem .55rem', boxShadow: 'var(--shadow-neu-sm)',
                }}>
                  <span style={{ fontSize: '.72rem', fontWeight: 600, color: 'var(--text)' }}>
                    {p.name}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                    <span style={{ fontSize: '.6rem', color: 'var(--text-faint)', fontWeight: 600 }}>
                      {gs?.tile_counts?.[p.pnum] ?? 7} tiles
                    </span>
                    {tricksWon > 0 && (
                      <span style={{
                        fontSize: '.55rem', fontWeight: 700, color: '#fff',
                        background: 'var(--t2)', borderRadius: 4, padding: '1px 5px',
                      }}>
                        {tricksWon}W
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
        </div>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Rules button */}
      <button
        onClick={() => useGameStore.setState({ rulesModalOpen: true })}
        style={{
          background: 'var(--surface)',
          color: 'var(--text-muted)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '.55rem',
          fontWeight: 600,
          fontSize: '.72rem',
          letterSpacing: '.04em',
          cursor: 'pointer',
          width: '100%',
          boxShadow: 'var(--shadow-neu-sm)',
          transition: 'background var(--trans), color var(--trans)',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = '#fff' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--text-muted)' }}
      >
        View Rules
      </button>
    </div>
  )
}
