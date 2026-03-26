import { useGameStore } from '../../store/gameStore'
import { useShallow } from 'zustand/react/shallow'
import Modal from '../shared/Modal'

export default function HandResultModal() {
  const { handResultData, gameState, emitNewHand, myPNum } = useGameStore(useShallow(s => ({
    handResultData: s.handResultData,
    gameState:      s.gameState,
    emitNewHand:    s.emitNewHand,
    myPNum:         s.myPNum,
  })))

  if (!handResultData) return null;
  const d = handResultData

  const mode      = gameState?.game_mode
  const winTarget = gameState?.win_target ?? 250
  const bidStr    = d.high_bid === 0 ? 'Low' : d.high_bid === 42 ? '42' : `${d.high_bid}`

  // Find my team
  const myTeam = myPNum !== null ? (gameState?.team_map?.[myPNum] ?? null) : null
  const myTeamWon = myTeam !== null && d.winner_team === myTeam

  const t1Pts = d.team1_total, t2Pts = d.team2_total
  const t1BarPct = `${Math.min(100, (t1Pts / winTarget) * 100)}%`
  const t2BarPct = `${Math.min(100, (t2Pts / winTarget) * 100)}%`

  function closeAndNext() {
    useGameStore.setState({ handResultData: null })
    emitNewHand()
  }

  return (
    <Modal>
      <div style={{ animation: 'resultSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>

        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '.75rem',
        }}>
          <h3 style={{
            fontSize: '1.2rem',
            fontWeight: 800,
            color: 'var(--text)',
            letterSpacing: '-.01em',
          }}>
            Hand {gameState?.hand_num ?? ''} Complete
          </h3>
        </div>

        {/* Made/Set badge */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '.5rem',
            borderRadius: '20px',
            padding: '.4rem 1.1rem',
            fontSize: '1rem',
            fontWeight: 800,
            background: d.made ? 'rgba(34,197,94,.1)' : 'rgba(239,68,68,.1)',
            color: d.made ? 'var(--success)' : 'var(--danger)',
            border: `1.5px solid ${d.made ? 'rgba(34,197,94,.35)' : 'rgba(239,68,68,.35)'}`,
            animation: d.made ? 'madeGlow 1.5s ease-in-out infinite' : 'setShake 0.5s ease .3s',
          }}>
            <span style={{ fontSize: '1.3rem' }}>{d.made ? '✅' : '💥'}</span>
            {d.made ? 'Bid Made!' : 'Set!'}
          </div>
        </div>

        {/* Personal result banner */}
        {myTeam !== null && (
          <div style={{
            textAlign: 'center',
            marginBottom: '.75rem',
            padding: '.4rem',
            borderRadius: 10,
            background: myTeamWon
              ? 'linear-gradient(135deg, rgba(34,197,94,.1), rgba(22,163,74,.05))'
              : 'linear-gradient(135deg, rgba(239,68,68,.08), rgba(185,28,28,.04))',
            border: `1px solid ${myTeamWon ? 'rgba(34,197,94,.2)' : 'rgba(239,68,68,.15)'}`,
            fontSize: '.85rem',
            fontWeight: 700,
            color: myTeamWon ? 'var(--success)' : 'var(--danger)',
          }}>
            {myTeamWon ? '🏆 Your team won this hand!' : '😤 Better luck next hand!'}
          </div>
        )}

        {/* Score cells */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '.6rem',
          marginBottom: '.75rem',
        }}>
          {[1, 2].map(team => {
            const pts    = team === 1 ? d.t1_this_hand : d.t2_this_hand
            const gained = team === 1 ? d.t1_gained : d.t2_gained
            const total  = team === 1 ? d.team1_total : d.team2_total
            const marks  = team === 1 ? d.team1_marks : d.team2_marks
            const winner = d.winner_team === team
            const color  = team === 1 ? 'var(--t1)' : 'var(--t2)'
            const isMyTeam = myTeam === team

            return (
              <div key={team} style={{
                background: winner
                  ? `linear-gradient(135deg, rgba(251,191,36,.08) 0%, var(--bg) 100%)`
                  : 'var(--bg)',
                border: `1.5px solid ${winner ? 'rgba(251,191,36,.5)' : isMyTeam ? color + '33' : 'var(--border)'}`,
                borderRadius: 'var(--radius)',
                padding: '1rem',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
              }}>
                {winner && (
                  <div style={{
                    position: 'absolute',
                    top: 6, right: 8,
                    fontSize: '.85rem',
                  }}>
                    ⭐
                  </div>
                )}
                <div style={{
                  fontSize: '.7rem',
                  color: 'var(--text-muted)',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '.06em',
                  marginBottom: '.3rem',
                }}>
                  {isMyTeam ? 'Your Team' : `Team ${team}`}
                </div>
                <div style={{
                  fontSize: '2.2rem',
                  fontWeight: 900,
                  color,
                  lineHeight: 1,
                  textShadow: `0 2px 8px ${color}44`,
                }}>
                  {pts}
                </div>
                <div style={{
                  fontSize: '.78rem',
                  marginTop: '.3rem',
                  color: gained > 0 ? 'var(--success)' : 'var(--danger)',
                  fontWeight: 700,
                }}>
                  {gained > 0 ? `+${gained} pts` : 'scored 0'}
                </div>
                <div style={{
                  fontSize: '.72rem',
                  color: 'var(--text-muted)',
                  marginTop: '.2rem',
                }}>
                  {mode === 'marks_7'
                    ? `${marks} / 7 marks`
                    : `${total} / ${winTarget} total`}
                </div>
              </div>
            )
          })}
        </div>

        {/* Race bar (250-pt mode) */}
        {mode === 'points_250' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            gap: '.5rem',
            marginBottom: '.75rem',
          }}>
            <div style={{
              height: 10,
              background: 'var(--bg)',
              borderRadius: 5,
              overflow: 'hidden',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,.1)',
            }}>
              <div style={{
                height: '100%',
                borderRadius: 5,
                background: 'linear-gradient(90deg, var(--t1), #60a5fa)',
                width: t1BarPct,
                transition: 'width .6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                boxShadow: '0 0 8px rgba(59,130,246,.4)',
              }} />
            </div>
            <span style={{
              fontSize: '.72rem',
              color: 'var(--text-muted)',
              whiteSpace: 'nowrap',
              fontWeight: 700,
            }}>
              {winTarget}
            </span>
            <div style={{
              height: 10,
              background: 'var(--bg)',
              borderRadius: 5,
              overflow: 'hidden',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,.1)',
            }}>
              <div style={{
                height: '100%',
                borderRadius: 5,
                background: 'linear-gradient(90deg, var(--t2), #f87171)',
                width: t2BarPct,
                transition: 'width .6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                boxShadow: '0 0 8px rgba(239,68,68,.4)',
              }} />
            </div>
          </div>
        )}

        <p style={{
          fontSize: '.84rem',
          color: 'var(--text-muted)',
          marginBottom: '.85rem',
          textAlign: 'center',
        }}>
          T{d.bid_team} bid {bidStr} — {d.made
            ? (d.high_bid === 0 ? '🎯 stayed low!' : '🎉 made it!')
            : (d.high_bid === 0 ? '💀 took count — set!' : '💥 they were set!')}
        </p>

        <button
          onClick={closeAndNext}
          style={{
            background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)',
            color: '#fff',
            padding: '.8rem',
            borderRadius: 'var(--radius)',
            fontWeight: 800,
            border: 'none',
            cursor: 'pointer',
            width: '100%',
            fontSize: '1rem',
            letterSpacing: '.02em',
            boxShadow: '0 4px 16px rgba(0,109,91,.3)',
            transition: 'all .15s ease',
          }}
          onMouseOver={e => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'
            ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(0,109,91,.4)'
          }}
          onMouseOut={e => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'
            ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(0,109,91,.3)'
          }}
        >
          Next Hand →
        </button>
      </div>
    </Modal>
  )
}
