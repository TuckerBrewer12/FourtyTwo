import { useGameStore } from '../../store/gameStore'
import { useShallow } from 'zustand/react/shallow'
import Modal from '../shared/Modal'

export default function HandResultModal() {
  const { handResultData, gameState, emitNewHand } = useGameStore(useShallow(s => ({
    handResultData: s.handResultData,
    gameState:      s.gameState,
    emitNewHand:    s.emitNewHand,
  })))

  if (!handResultData) return null;
  const d = handResultData

  const mode      = gameState?.game_mode
  const winTarget = gameState?.win_target ?? 250
  const bidStr    = d.high_bid === 0 ? 'Low' : d.high_bid === 42 ? '42' : `${d.high_bid}`
  // CSS progress percentages — purely presentational layout math
  const t1Pts = d.team1_total, t2Pts = d.team2_total
  const t1BarPct = `${Math.min(100, (t1Pts / winTarget) * 100)}%`
  const t2BarPct = `${Math.min(100, (t2Pts / winTarget) * 100)}%`

  function closeAndNext() {
    useGameStore.setState({ handResultData: null })
    emitNewHand()
  }

  return (
    <Modal>
      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '.5rem' }}>Hand Complete</h3>

      {/* Made/Set badge */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '.75rem' }}>
        <div style={{
          display: 'inline-block', borderRadius: '20px', padding: '.3rem .9rem',
          fontSize: '.9rem', fontWeight: 700,
          background: d.made ? 'rgba(34,197,94,.1)' : 'rgba(239,68,68,.1)',
          color: d.made ? 'var(--success)' : 'var(--danger)',
          border: `1px solid ${d.made ? 'rgba(34,197,94,.3)' : 'rgba(239,68,68,.3)'}`,
        }}>
          {d.made ? '✓ Bid Made!' : '✗ Set!'}
        </div>
      </div>

      {/* Score cells */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.6rem', marginBottom: '.75rem' }}>
        {[1, 2].map(team => {
          const pts    = team === 1 ? d.t1_this_hand : d.t2_this_hand
          const gained = team === 1 ? d.t1_gained : d.t2_gained
          const total  = team === 1 ? d.team1_total : d.team2_total
          const marks  = team === 1 ? d.team1_marks : d.team2_marks
          const winner = d.winner_team === team
          const color  = team === 1 ? 'var(--t1)' : 'var(--t2)'
          return (
            <div key={team} style={{
              background: 'var(--bg)',
              border: `1.5px solid ${winner ? 'var(--warning)' : 'var(--border)'}`,
              borderRadius: 'var(--radius)', padding: '.9rem', textAlign: 'center',
            }}>
              <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: '.2rem' }}>
                Team {team}
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color, lineHeight: 1 }}>{pts}</div>
              <div style={{ fontSize: '.78rem', marginTop: '.25rem', color: gained > 0 ? 'var(--success)' : 'var(--danger)' }}>
                {gained > 0 ? `+${gained} earned` : 'scored 0'}
              </div>
              <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: '.25rem' }}>
                {mode === 'marks_7' ? `${marks}/7 marks` : `${total} / ${gameState?.win_target ?? 250} total`}
              </div>
            </div>
          )
        })}
      </div>

      {/* Race bar (250-pt mode) */}
      {mode === 'points_250' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '.4rem', marginBottom: '.75rem' }}>
          <div style={{ height: 8, background: 'var(--bg)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 4, background: 'var(--t1)', width: t1BarPct, transition: 'width .4s ease' }} />
          </div>
          <span style={{ fontSize: '.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontWeight: 600 }}>{winTarget}</span>
          <div style={{ height: 8, background: 'var(--bg)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 4, background: 'var(--t2)', width: t2BarPct, transition: 'width .4s ease' }} />
          </div>
        </div>
      )}

      <p style={{ fontSize: '.84rem', color: 'var(--text-muted)', marginBottom: '.75rem' }}>
        T{d.bid_team} bid {bidStr} — {d.made
          ? (d.high_bid === 0 ? 'stayed low!' : 'made it!')
          : (d.high_bid === 0 ? 'took count — set!' : 'they were set!')}
      </p>

      <button onClick={closeAndNext} style={{
        background: 'var(--accent)', color: '#fff', padding: '.7rem',
        borderRadius: 'var(--radius)', fontWeight: 700, border: 'none',
        cursor: 'pointer', width: '100%', fontSize: '.95rem',
      }}>
        Next Hand →
      </button>
    </Modal>
  )
}
