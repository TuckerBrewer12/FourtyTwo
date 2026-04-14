import { useGameStore } from '../../store/gameStore'
import { useShallow } from 'zustand/react/shallow'

function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text)
  }
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.focus()
  ta.select()
  document.execCommand('copy')
  document.body.removeChild(ta)
  return Promise.resolve()
}

export default function WaitingRoom() {
  const { gameState, myPNum, myRoom, addToast, emitChooseTeam } = useGameStore(useShallow(s => ({
    gameState:      s.gameState,
    myPNum:         s.myPNum,
    myRoom:         s.myRoom,
    addToast:       s.addToast,
    emitChooseTeam: s.emitChooseTeam,
  })))

  const players        = gameState?.players ?? {}
  const teamSelections = gameState?.team_selections ?? {}
  const filled         = Object.keys(players).length
  const inviteUrl      = `${window.location.origin}/join/${myRoom}`
  const myTeam         = myPNum != null ? teamSelections[myPNum] : undefined

  // Build team rosters: team_selections maps player_num → 1|2
  const team1Members = Object.entries(teamSelections)
    .filter(([, t]) => t === 1)
    .map(([p]) => Number(p))
  const team2Members = Object.entries(teamSelections)
    .filter(([, t]) => t === 2)
    .map(([p]) => Number(p))

  const t1Full = team1Members.length >= 2
  const t2Full = team2Members.length >= 2
  const allTeamsReady = t1Full && t2Full && filled === 4

  function copyCode() {
    copyToClipboard(myRoom ?? '').then(() => addToast('Room code copied!', 'success'))
  }
  function copyUrl() {
    copyToClipboard(inviteUrl).then(() => addToast('Invite link copied!', 'success'))
  }

  function fillBots() {
    fetch(`/api/fill-bots/${myRoom}`)
      .then(r => r.json())
      .then(d => {
        if (d.ok) {
          addToast(`Added ${d.added.length} bot${d.added.length > 1 ? 's' : ''} — teams forming!`, 'success')
        } else {
          addToast(d.error || 'Failed to add bots', 'error')
        }
      })
      .catch(() => addToast('Failed to connect', 'error'))
  }

  function handleTeamClick(team: 1 | 2) {
    emitChooseTeam(team)
  }

  function TeamBox({ team }: { team: 1 | 2 }) {
    const members  = team === 1 ? team1Members : team2Members
    const isFull   = members.length >= 2
    const onMyTeam = myTeam === team
    const canJoin  = !onMyTeam && !isFull && myPNum != null

    const color  = team === 1 ? '#3b82f6' : '#ef4444'
    const bgCol  = team === 1 ? 'rgba(59,130,246,.08)' : 'rgba(239,68,68,.08)'
    const border = team === 1 ? 'rgba(59,130,246,.3)' : 'rgba(239,68,68,.3)'
    const label  = team === 1 ? 'Team 1' : 'Team 2'

    return (
      <div style={{
        flex: 1, borderRadius: 'var(--radius-lg)',
        border: `2px solid ${border}`,
        background: bgCol,
        padding: '1rem',
        display: 'flex', flexDirection: 'column', gap: '.6rem',
        minHeight: 160,
      }}>
        <div style={{
          fontWeight: 800, fontSize: '.9rem', color,
          textAlign: 'center', letterSpacing: '.05em', textTransform: 'uppercase',
        }}>
          {label}
        </div>

        {/* Slots */}
        {[0, 1].map(slot => {
          const pnum = members[slot]
          const name = pnum != null ? players[pnum] : null
          const isMe = pnum === myPNum
          return (
            <div key={slot} style={{
              padding: '.6rem .75rem',
              borderRadius: 'var(--radius)',
              border: `1.5px ${name ? 'solid' : 'dashed'} ${name ? border : 'var(--border)'}`,
              background: name ? (isMe ? `${color}22` : 'transparent') : 'transparent',
              display: 'flex', alignItems: 'center', gap: '.5rem',
              minHeight: 42,
            }}>
              {name ? (
                <>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: `${color}22`, color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '.8rem', flexShrink: 0,
                  }}>
                    {name[0].toUpperCase()}
                  </div>
                  <span style={{
                    fontWeight: isMe ? 700 : 500, fontSize: '.85rem',
                    color: isMe ? color : 'var(--text)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {name}{isMe ? ' (you)' : ''}
                  </span>
                </>
              ) : (
                <span style={{ fontSize: '.8rem', color: 'var(--text-faint)' }}>
                  open slot
                </span>
              )}
            </div>
          )
        })}

        {/* Join / Leave button */}
        {myPNum != null && (
          onMyTeam ? (
            <button onClick={() => handleTeamClick(team)} style={{
              marginTop: 'auto', padding: '.45rem',
              background: 'transparent', border: `1.5px solid ${border}`,
              borderRadius: 'var(--radius-sm)', color,
              fontSize: '.78rem', fontWeight: 600, cursor: 'pointer',
            }}>
              Leave
            </button>
          ) : canJoin ? (
            <button onClick={() => handleTeamClick(team)} style={{
              marginTop: 'auto', padding: '.45rem',
              background: color, border: 'none',
              borderRadius: 'var(--radius-sm)', color: '#fff',
              fontSize: '.78rem', fontWeight: 700, cursor: 'pointer',
            }}>
              Join {label}
            </button>
          ) : isFull ? (
            <div style={{ marginTop: 'auto', fontSize: '.75rem', color: 'var(--text-faint)', textAlign: 'center' }}>
              Team full
            </div>
          ) : null
        )}
      </div>
    )
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
    }}>
      <div style={{ width: '100%', maxWidth: 500 }}>
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--accent)' }}>42</div>
        </div>

        <div style={{
          background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow)', padding: '1.5rem',
          border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1.1rem',
        }}>
          {/* Room code */}
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.35rem' }}>
              Room Code
            </p>
            <button onClick={copyCode} style={{
              fontSize: '2.5rem', fontWeight: 800, letterSpacing: '.25em',
              color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer',
            }}>
              {myRoom ?? '------'}
            </button>
            <p style={{ fontSize: '.7rem', color: 'var(--text-faint)', marginTop: '.1rem' }}>click to copy</p>
          </div>

          {/* Invite link */}
          <div style={{ display: 'flex', gap: '.4rem' }}>
            <input readOnly value={inviteUrl} style={{
              flex: 1, fontSize: '.78rem', padding: '.5rem .7rem',
              background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)',
              outline: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }} />
            <button onClick={copyUrl} style={{
              padding: '.5rem .9rem', background: 'var(--bg)', border: '1.5px solid var(--border)',
              borderRadius: 'var(--radius-sm)', fontWeight: 600, fontSize: '.8rem', cursor: 'pointer', color: 'var(--text)',
            }}>Copy</button>
          </div>

          {typeof navigator.share === 'function' && (
            <button onClick={() => {
              navigator.share({
                title: '42 — Texas Dominos',
                text: `Join my game of 42! Room code: ${myRoom}`,
                url: inviteUrl,
              }).catch(() => {})
            }} style={{
              width: '100%', padding: '.7rem',
              background: 'linear-gradient(135deg, var(--accent), #008c73)',
              color: '#fff', borderRadius: 'var(--radius)',
              fontWeight: 700, fontSize: '.88rem',
              border: 'none', cursor: 'pointer',
            }}>
              Share Invite Link
            </button>
          )}

          {/* Player count */}
          <p style={{ textAlign: 'center', fontSize: '.85rem', color: 'var(--text-muted)', margin: 0 }}>
            {filled < 4
              ? `${filled}/4 players joined — waiting for ${4 - filled} more…`
              : allTeamsReady
                ? 'Teams locked — starting game!'
                : 'All players present — choose your teams below'}
          </p>

          {/* Team selection */}
          <div style={{ display: 'flex', gap: '.75rem' }}>
            <TeamBox team={1} />
            <TeamBox team={2} />
          </div>

          {/* Unassigned players (joined but no team yet) */}
          {(() => {
            const unassigned = Object.entries(players)
              .map(([p]) => Number(p))
              .filter(p => !teamSelections[p])
            if (unassigned.length === 0) return null
            return (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem', alignItems: 'center' }}>
                <span style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Waiting to pick:</span>
                {unassigned.map(p => (
                  <span key={p} style={{
                    padding: '.2rem .55rem', borderRadius: 999,
                    background: 'var(--bg)', border: '1px solid var(--border)',
                    fontSize: '.78rem', color: 'var(--text)',
                  }}>
                    {players[p]}{p === myPNum ? ' (you)' : ''}
                  </span>
                ))}
              </div>
            )
          })()}

          {/* Fill bots */}
          {filled < 4 && (
            <button onClick={fillBots} style={{
              width: '100%', padding: '.6rem', borderRadius: 'var(--radius)',
              background: 'transparent', border: '1.5px dashed var(--border)',
              color: 'var(--text-muted)', fontSize: '.82rem', fontWeight: 600,
              cursor: 'pointer',
            }}>
              Quick Test — Fill with {4 - filled} bot{4 - filled > 1 ? 's' : ''}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
