import { useGameStore } from '../../store/gameStore'
import { useShallow } from 'zustand/react/shallow'

function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text)
  }
  // Fallback for non-HTTPS (e.g. local IP access)
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
  const { gameState, myPNum, myRoom, addToast } = useGameStore(useShallow(s => ({
    gameState: s.gameState,
    myPNum:    s.myPNum,
    myRoom:    s.myRoom,
    addToast:  s.addToast,
  })))

  const players = gameState?.players ?? {}
  const filled  = Object.keys(players).length
  const inviteUrl = `${window.location.origin}/join/${myRoom}`

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
          addToast(`Added ${d.added.length} bot${d.added.length > 1 ? 's' : ''} — game starting!`, 'success')
        } else {
          addToast(d.error || 'Failed to add bots', 'error')
        }
      })
      .catch(() => addToast('Failed to connect', 'error'))
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
    }}>
      <div style={{ width: '100%', maxWidth: 460 }}>
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--accent)' }}>42</div>
        </div>
        <div style={{
          background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow)', padding: '1.75rem',
          border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1.25rem',
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
            <span style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
              Share Invite Link
            </span>
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
          </div>

          {/* Player seats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.6rem' }}>
            {[1, 2, 3, 4].map(p => {
              const name   = players[p]
              const team   = (gameState?.team_map?.[p] ?? ({ 1: 1, 2: 2, 3: 1, 4: 2 } as Record<number, 1|2>)[p]) as 1 | 2
              const isMe   = p === myPNum
              const tColor = team === 1 ? 'var(--t1)' : 'var(--t2)'
              const tBg    = team === 1 ? 'var(--t1-bg)' : 'var(--t2-bg)'
              const tBdr   = team === 1 ? 'var(--t1-border)' : 'var(--t2-border)'
              return (
                <div key={p} style={{
                  display: 'flex', alignItems: 'center', gap: '.6rem',
                  padding: '.75rem', borderRadius: 'var(--radius)',
                  border: `1.5px ${name ? 'solid' : 'dashed'} ${name ? (isMe ? 'var(--accent)' : tBdr) : 'var(--border)'}`,
                  background: name ? (isMe ? 'var(--accent-light)' : tBg) : 'transparent',
                  opacity: name ? 1 : .5,
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '.85rem',
                    background: name ? (team === 1 ? 'rgba(59,130,246,.15)' : 'rgba(239,68,68,.15)') : 'var(--bg)',
                    color: name ? tColor : 'var(--text-faint)',
                    flexShrink: 0,
                  }}>
                    {name ? name[0].toUpperCase() : `P${p}`}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontWeight: 600, fontSize: '.88rem',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      color: name ? 'var(--text)' : 'var(--text-faint)',
                    }}>
                      {name ? `${name}${isMe ? ' (you)' : ''}` : 'Waiting…'}
                    </div>
                    <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginTop: '.05rem' }}>
                      {team === 1 ? '🔵 Team 1' : '🔴 Team 2'} · P{p}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <p style={{ textAlign: 'center', fontSize: '.85rem', color: 'var(--text-muted)' }}>
            {filled === 4
              ? 'All players present — starting game!'
              : `${filled}/4 players joined — waiting for ${4 - filled} more…`}
          </p>

          {/* Quick Test — server-side bots, no popup issues */}
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
