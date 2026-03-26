import { useEffect, useRef, useCallback } from 'react'
import { useGameStore } from '../../store/gameStore'
import { useShallow } from 'zustand/react/shallow'
import Domino from '../domino/Domino'

const SUIT_NAMES = ['Blanks','Aces','Deuces','Threes','Fours','Fives','Sixes','Doubles']

function isTrumpDomino(a: number, b: number, trump: number | null): boolean {
  if (trump === null) return false;
  if (trump === 7) return a === b;
  return a === trump || b === trump;
}

/* ── Starting transforms per seat (where the player's hand is) ── */
const SEAT_START: Record<string, { transform: string }> = {
  south: { transform: 'translateY(min(45vh, 350px))  scale(0.4)' },
  north: { transform: 'translateY(max(-45vh, -350px)) scale(0.4)' },
  east:  { transform: 'translateX(min(40vw, 400px))  scale(0.4)' },
  west:  { transform: 'translateX(max(-40vw, -400px)) scale(0.4)' },
}

/**
 * SlidingTile uses the Web Animations API (element.animate()) directly.
 * This is immune to React re-render timing, CSS specificity battles,
 * and state-race issues that broke the previous CSS transition approach.
 * The animation fires exactly once when the element mounts.
 */
function SlidingTile({
  seat,
  animate,
  children,
}: {
  seat: string
  animate: boolean
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || !animate) return

    const start = SEAT_START[seat] ?? SEAT_START.south

    // Web Animations API — runs at compositor level, immune to JS/React timing
    el.animate(
      [
        { transform: start.transform, opacity: 0 },
        { transform: 'translateY(0) scale(1)', opacity: 1 },
      ],
      {
        duration: 550,
        easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
        fill: 'forwards',
      }
    )
  }, []) // eslint-disable-line react-hooks/exhaustive-deps — fire once on mount only

  return (
    <div
      ref={ref}
      style={{
        // If animating, start invisible — the WAAPI animation sets initial opacity=0
        // If not animating, show immediately
        opacity: animate ? 0 : 1,
        filter: 'drop-shadow(0 8px 18px rgba(0,0,0,.30))',
      }}
    >
      {children}
    </div>
  )
}

export default function TrickCenter() {
  const {
    gameState, seatMap, lastTrickWinner, wonTricksPerPlayer,
    trickSweepSeat, richAnimations,
  } = useGameStore(useShallow(s => ({
    gameState:          s.gameState,
    seatMap:            s.seatMap,
    lastTrickWinner:    s.lastTrickWinner,
    wonTricksPerPlayer: s.wonTricksPerPlayer,
    trickSweepSeat:     s.trickSweepSeat,
    richAnimations:     s.richAnimations,
  })))

  const trump     = gameState?.trump ?? null
  const trick     = gameState?.trick ?? []
  const isSweeping = !!trickSweepSeat

  const trumpColor = trump === null ? null : trump === 7 ? 'var(--suit-7)' : `var(--suit-${trump})`
  const trumpLabel = trump === null ? null : trump === 7 ? 'DOUBLES' : SUIT_NAMES[trump].toUpperCase()

  // Invert seatMap {pnum→seat} for looking up seat by player number
  const pnumToSeat: Record<number, string> = {}
  if (seatMap) {
    for (const [pnum, seat] of Object.entries(seatMap)) {
      pnumToSeat[Number(pnum)] = seat
    }
  }

  /* Track which player tiles have mounted this trick so we only
     animate the NEWEST tile. We track by a counter that resets
     when the trick length drops (new trick). */
  const seenRef = useRef<Set<number>>(new Set())
  const prevLen = useRef(0)

  // Reset when trick shrinks (new trick started)
  if (trick.length < prevLen.current) {
    seenRef.current = new Set()
  }
  prevLen.current = trick.length

  // Memoized check — marks a tile as seen and returns whether it's new
  const checkNew = useCallback((player: number) => {
    if (seenRef.current.has(player)) return false
    seenRef.current.add(player)
    return true
  }, [])

  // Won-tricks stacked at edges — always stack vertically (column)
  // so each trick is one row of 4 xs dominos, and multiple tricks
  // go on top of each other = 2×4, 3×4, etc.
  const STACK_ANCHOR: Record<string, React.CSSProperties> = {
    north: { top: 6,    left: '50%',  transform: 'translateX(-50%)' },
    south: { bottom: 6, left: '50%',  transform: 'translateX(-50%)' },
    east:  { right: 6,  top: '50%',   transform: 'translateY(-50%)' },
    west:  { left: 6,   top: '50%',   transform: 'translateY(-50%)' },
  }

  return (
    <div style={{
      flex: 1,
      margin: '8px 12px',
      borderRadius: 20,
      background: 'radial-gradient(ellipse at 30% 30%, #5a9e87 0%, #4d8c75 40%, #3d7a63 100%)',
      backgroundSize: '400% 400%',
      animation: 'tableBreath 8s ease-in-out infinite',
      boxShadow: trumpColor
        ? `inset 0 4px 20px rgba(0,0,0,.18), 0 6px 28px rgba(0,0,0,.14), 0 0 0 2.5px ${trumpColor}66`
        : 'inset 0 4px 20px rgba(0,0,0,.18), 0 6px 28px rgba(0,0,0,.14)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      minHeight: 200,
      overflow: 'visible',
      transition: 'box-shadow 0.6s ease',
    }}>
      {/* Clip layer — keeps backgrounds inside rounded corners */}
      <div style={{
        position: 'absolute', inset: 0,
        borderRadius: 20, overflow: 'hidden',
        pointerEvents: 'none',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(rgba(0,0,0,.1) 1.5px, transparent 1.5px)',
          backgroundSize: '12px 12px',
        }} />
        {trumpColor && (
          <div style={{
            position: 'absolute', inset: 0,
            background: `radial-gradient(ellipse at center, ${trumpColor}1a 0%, transparent 65%)`,
            transition: 'opacity 0.8s ease',
          }} />
        )}
      </div>

      {/* Empty-table ring */}
      {trick.length === 0 && !isSweeping && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          width: 72, height: 72, borderRadius: '50%',
          border: '2px dashed rgba(255,255,255,.15)',
          animation: 'trickRingPulse 3s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
      )}

      {/* ── Active trick — horizontal row in center ── */}
      {trick.length > 0 && !isSweeping && (
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 2,
        }}>
          {trick.map((item) => {
            const seat = pnumToSeat[item.player] ?? 'south'
            const isNew = checkNew(item.player)

            return (
              <SlidingTile
                key={`t-${item.player}`}
                seat={seat}
                animate={isNew && richAnimations}
              >
                <Domino
                  a={item.domino[0]} b={item.domino[1]}
                  size="lg" vertical
                  isTrump={isTrumpDomino(item.domino[0], item.domino[1], trump)}
                />
              </SlidingTile>
            )
          })}
        </div>
      )}

      {/* ── Sweep — row fades out ── */}
      {trick.length > 0 && isSweeping && (
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 2,
          animation: 'trickFadeAway 0.58s ease forwards',
        }}>
          {trick.map((item) => (
            <div
              key={`s-${item.player}`}
              style={{ filter: 'drop-shadow(0 8px 18px rgba(0,0,0,.25))' }}
            >
              <Domino
                a={item.domino[0]} b={item.domino[1]}
                size="lg" vertical
                isTrump={isTrumpDomino(item.domino[0], item.domino[1], trump)}
              />
            </div>
          ))}
        </div>
      )}

      {/* ── Won-tricks stacked near each player's edge ── */}
      {seatMap && Object.entries(wonTricksPerPlayer).map(([pnumStr, tricks]) => {
        const pnum = Number(pnumStr)
        const seat = seatMap[pnum]
        if (!seat || tricks.length === 0) return null
        const anchor = STACK_ANCHOR[seat]
        const displayTricks = lastTrickWinner === pnum ? tricks.slice(0, -1) : tricks
        if (displayTricks.length === 0) return null

        return (
          <div
            key={pnum}
            style={{
              position: 'absolute',
              ...anchor,
              display: 'flex',
              flexDirection: 'column',
              gap: '.15rem',
              zIndex: 1,
              alignItems: 'center',
            }}
          >
            {displayTricks.map((trickDominos, ti) => (
              <div
                key={ti}
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  gap: '.08rem',
                  padding: '2px 3px',
                  background: 'rgba(255,255,255,.12)',
                  borderRadius: 4,
                  animation: ti === displayTricks.length - 1 ? 'slideUp 0.35s cubic-bezier(0.22,0.61,0.36,1)' : 'none',
                }}
              >
                {trickDominos.map((d, di) => (
                  <Domino key={di} a={d[0]} b={d[1]} size="xs" vertical />
                ))}
              </div>
            ))}
          </div>
        )
      })}

      {/* ── Trick count ── */}
      {gameState?.trick_count !== undefined && gameState.trick_count > 0 && (
        <div style={{
          position: 'absolute', bottom: 10, right: 12,
          fontSize: '.6rem', fontWeight: 700,
          color: 'rgba(255,255,255,.45)',
          letterSpacing: '.06em', pointerEvents: 'none', userSelect: 'none',
        }}>
          {gameState.trick_count}/7
        </div>
      )}

      {/* ── Trump badge ── */}
      {trumpLabel && trumpColor && (
        <div style={{
          position: 'absolute', bottom: 10, left: 12,
          display: 'flex', alignItems: 'center', gap: 5,
          background: `${trumpColor}22`,
          border: `1.5px solid ${trumpColor}99`,
          backdropFilter: 'blur(6px)',
          padding: '3px 8px 3px 6px',
          borderRadius: 8,
          pointerEvents: 'none', userSelect: 'none',
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: trumpColor, boxShadow: `0 0 6px ${trumpColor}`,
            flexShrink: 0, display: 'inline-block',
          }} />
          <span style={{
            fontSize: '.65rem', fontWeight: 800,
            color: trumpColor, letterSpacing: '.06em',
            textShadow: `0 0 10px ${trumpColor}88`,
          }}>
            {trumpLabel}
          </span>
        </div>
      )}
    </div>
  )
}
