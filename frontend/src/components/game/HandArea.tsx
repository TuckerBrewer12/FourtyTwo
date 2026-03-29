import { useGameStore } from '../../store/gameStore'
import { useShallow } from 'zustand/react/shallow'
import Domino from '../domino/Domino'
import { useIsMobile } from '../../hooks/useIsMobile'

export default function HandArea() {
  const isMobile = useIsMobile()
  const { myHand, myTurn, isSpectator, validPlays, emitPlay, statusMsg, dealAnimating, gameState } = useGameStore(useShallow(s => ({
    myHand:        s.myHand,
    myTurn:        s.myTurn,
    isSpectator:   s.isSpectator,
    validPlays:    s.validPlays,
    emitPlay:      s.emitPlay,
    statusMsg:     s.statusMsg,
    dealAnimating: s.dealAnimating,
    gameState:     s.gameState,
  })))

  const trump = gameState?.trump ?? null

  function dominoIsTrump(a: number, b: number): boolean {
    if (trump === null) return false;
    if (trump === 7) return a === b;  // doubles-as-trump: all doubles
    return a === trump || b === trump;
  }

  if (isSpectator) return null;

  const topRow    = myHand.slice(0, 3)
  const bottomRow = myHand.slice(3, 7)

  function renderDomino(a: number, b: number, handIndex: number) {
    const isValid = validPlays.some(([va, vb]) => va === a && vb === b)
    const playable = myTurn && isValid
    // Stagger deal: top row tiles 0-2, bottom row 3-6 (130ms between each)
    const dealDelay = dealAnimating ? handIndex * 130 : 0

    return (
      <div
        key={`${a}-${b}-${handIndex}`}
        style={{
          position: 'relative',
          transform: playable ? 'translateY(-2px)' : 'none',
          transition: 'transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <Domino
          a={a} b={b} size="xl"
          playable={playable}
          invalid={myTurn && !isValid}
          isTrump={dominoIsTrump(a, b)}
          onClick={playable ? () => emitPlay([a, b]) : undefined}
          dealing={dealAnimating}
          dealDelay={dealDelay}
        />
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '.4rem',
    }}>
      {/* Status message */}
      {statusMsg && (
        <div style={{
          background: myTurn
            ? 'linear-gradient(135deg, rgba(16,185,129,.15), rgba(255,255,255,.95))'
            : 'rgba(255,255,255,.88)',
          backdropFilter: 'blur(10px)',
          borderRadius: 'var(--radius-pill)',
          padding: myTurn ? (isMobile ? '.3rem .85rem' : '.38rem 1.2rem') : (isMobile ? '.22rem .7rem' : '.27rem .9rem'),
          fontSize: myTurn ? (isMobile ? '.72rem' : '.82rem') : (isMobile ? '.64rem' : '.72rem'),
          fontWeight: 700,
          color: myTurn ? 'var(--accent)' : 'var(--text-muted)',
          whiteSpace: 'nowrap',
          border: myTurn ? '1.5px solid rgba(16,185,129,.35)' : 'none',
          animation: myTurn ? 'turnPulse 2s ease-in-out infinite' : 'slideUp .3s ease',
          letterSpacing: myTurn ? '.02em' : 'normal',
          boxShadow: myTurn
            ? '0 4px 20px rgba(16,185,129,.2), 0 2px 8px rgba(0,0,0,.06)'
            : '0 2px 8px rgba(0,0,0,.05)',
          transition: 'all .3s ease',
        }}>
          {statusMsg}
        </div>
      )}

      {/* Hand tile tray */}
      <div style={{
        background: myTurn
          ? 'linear-gradient(135deg, rgba(16,185,129,.06), var(--surface) 40%)'
          : 'var(--surface)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: myTurn
          ? '8px 8px 20px rgba(0,0,0,.08), -8px -8px 20px rgba(255,255,255,.92), 0 0 0 1.5px rgba(16,185,129,.2)'
          : 'var(--shadow-neu)',
        padding: isMobile ? '.5rem .65rem' : '.85rem 1.1rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: isMobile ? '.25rem' : '.4rem',
        transition: 'all .35s ease',
        position: 'relative',
        overflow: 'visible',
      }}>
        {/* Turn indicator shimmer overlay on the tray */}
        {myTurn && (
          <div style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 'var(--radius-xl)',
            background: 'linear-gradient(105deg, transparent 30%, rgba(16,185,129,.06) 50%, transparent 70%)',
            animation: 'shimmerSweep 2.5s ease-in-out infinite',
            pointerEvents: 'none',
          }} />
        )}

        {myHand.length === 0 ? (
          <div style={{
            width: 200, height: 60,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '.75rem', color: 'var(--text-faint)', fontStyle: 'italic',
            animation: 'fadeIn .5s ease',
          }}>
            No tiles
          </div>
        ) : (
          <>
            {/* Top row — 3 tiles */}
            <div style={{
              display: 'flex',
              gap: isMobile ? '.25rem' : '.45rem',
              position: 'relative',
              zIndex: 1,
            }}>
              {topRow.map(([a, b], i) => renderDomino(a, b, i))}
            </div>
            {/* Bottom row — up to 4 tiles */}
            <div style={{
              display: 'flex',
              gap: isMobile ? '.25rem' : '.45rem',
              position: 'relative',
              zIndex: 1,
            }}>
              {bottomRow.map(([a, b], i) => renderDomino(a, b, i + 3))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
