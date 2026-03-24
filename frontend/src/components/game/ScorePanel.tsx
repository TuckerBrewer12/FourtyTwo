import { useGameStore } from '../../store/gameStore'
import { useShallow } from 'zustand/react/shallow'

export default function ScorePanel() {
  const { gameState, myPNum, isSpectator } = useGameStore(useShallow(s => ({
    gameState:   s.gameState,
    myPNum:      s.myPNum,
    isSpectator: s.isSpectator,
  })))

  const gs = gameState
  const mode = gs?.game_mode ?? 'points_250'
  const isMarks = mode === 'marks_7'

  // Which team am I on?
  const myTeam = myPNum ? (gs?.team_map?.[myPNum] ?? null) : null

  // Scores for display
  const myTotal  = myTeam === 1 ? gs?.team1_total  : gs?.team2_total
  const myMarks  = myTeam === 1 ? gs?.team1_marks  : gs?.team2_marks

  // Opponent player numbers
  const opponents = myPNum && gs?.players
    ? Object.entries(gs.players)
        .map(([k, v]) => ({ pnum: Number(k), name: v }))
        .filter(p => p.pnum !== myPNum)
    : []

  return (
    <div style={{
      width: 240,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: '.75rem',
      padding: '1rem .85rem',
      borderRight: '1px solid var(--border)',
    }}>
      {/* Header */}
      <div>
        <div style={{ fontSize: '.68rem', fontWeight: 800, color: 'var(--accent)', letterSpacing: '.12em', textTransform: 'uppercase' }}>
          Racking System
        </div>
        <div style={{ fontSize: '.62rem', color: 'var(--text-faint)', letterSpacing: '.08em', textTransform: 'uppercase', marginTop: '.1rem' }}>
          Active Session
        </div>
      </div>

      {/* Score card */}
      <div style={{
        background: 'var(--surface)',
        borderRadius: 'var(--radius)',
        padding: '.75rem',
        boxShadow: 'var(--shadow-neu-sm)',
        display: 'flex',
        flexDirection: 'column',
        gap: '.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', marginBottom: '.1rem' }}>
          <span style={{ fontSize: '.75rem' }}>🏆</span>
          <span style={{ fontSize: '.65rem', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            {isSpectator ? 'Scores' : 'Winning Sets'}
          </span>
        </div>

        {/* My team score */}
        {!isSpectator && myTeam && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '.7rem', color: myTeam === 1 ? 'var(--t1)' : 'var(--t2)', fontWeight: 700 }}>
              {isSpectator ? `Team ${myTeam}` : 'Your Team'}
            </span>
            <span style={{ fontSize: '.9rem', fontWeight: 800, color: 'var(--text)' }}>
              {isMarks ? `${myMarks ?? 0}m` : `${myTotal ?? 0}`}
            </span>
          </div>
        )}

        {/* Scores row */}
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
                background: isMyTeam ? 'var(--accent-light)' : 'var(--surface-soft)',
                borderRadius: 'var(--radius-sm)', padding: '.5rem .4rem', textAlign: 'center',
                border: isMyTeam ? '1px solid rgba(0,109,91,.2)' : '1px solid var(--border)',
              }}>
                <div style={{ fontSize: '.6rem', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                  T{team}
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color, lineHeight: 1.1 }}>
                  {score ?? 0}
                </div>
                <div style={{ fontSize: '.6rem', color: 'var(--text-faint)' }}>
                  {isMarks ? `${marks ?? 0} marks` : `${total ?? 0} total`}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Opponents */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.35rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
          <span style={{ fontSize: '.75rem' }}>👥</span>
          <span style={{ fontSize: '.65rem', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Opponents
          </span>
        </div>
        {opponents.length === 0 ? (
          <div style={{ fontSize: '.72rem', color: 'var(--text-faint)', paddingLeft: '.25rem' }}>Waiting…</div>
        ) : (
          opponents
            .filter(p => gs?.team_map?.[p.pnum] !== myTeam)
            .map(p => (
              <div key={p.pnum} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'var(--surface)', borderRadius: 'var(--radius-sm)',
                padding: '.4rem .6rem', boxShadow: 'var(--shadow-neu-sm)',
              }}>
                <span style={{ fontSize: '.75rem', fontWeight: 600, color: 'var(--text)' }}>
                  {p.name}
                </span>
                <span style={{ fontSize: '.65rem', color: 'var(--text-faint)', fontWeight: 600 }}>
                  {gs?.tile_counts?.[p.pnum] ?? 7} tiles
                </span>
              </div>
            ))
        )}
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* View History button */}
      <button
        onClick={() => useGameStore.setState({ rulesModalOpen: true })}
        style={{
          background: 'var(--accent)',
          color: '#fff',
          border: 'none',
          borderRadius: 'var(--radius-pill)',
          padding: '.65rem',
          fontWeight: 700,
          fontSize: '.8rem',
          letterSpacing: '.05em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          width: '100%',
          boxShadow: '0 4px 14px rgba(0,109,91,.3)',
          transition: 'background var(--trans), box-shadow var(--trans)',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-hover)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
      >
        View History
      </button>
    </div>
  )
}
