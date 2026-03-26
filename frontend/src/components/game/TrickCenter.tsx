import { useState, useEffect, useRef } from 'react'
import { useGameStore } from '../../store/gameStore'
import { useShallow } from 'zustand/react/shallow'
import Domino from '../domino/Domino'

const SUIT_NAMES = ['Blanks','Aces','Deuces','Threes','Fours','Fives','Sixes','Doubles']

function isTrumpDomino(a: number, b: number, trump: number | null): boolean {
  if (trump === null) return false;
  if (trump === 7) return a === b;
  return a === trump || b === trump;
}

/* ── Starting offsets per seat ──
   The tile starts offset toward the player's position and
   slides to transform:none (the center). Using translate + scale + opacity. */
const START_OFFSET: Record<string, React.CSSProperties> = {
  south: { transform: 'translateY(45vh)  scale(0.45)', opacity: 0 },
  north: { transform: 'translateY(-45vh) scale(0.45)', opacity: 0 },
  east:  { transform: 'translateX(40vw)  scale(0.45)', opacity: 0 },
  west:  { transform: 'translateX(-40vw) scale(0.45)', opacity: 0 },
}
const LANDED: React.CSSProperties = { transform: 'none', opacity: 1 }

const SLIDE_TRANSITION = 'transform 0.55s cubic-bezier(0.22, 0.61, 0.36, 1), opacity 0.25s ease'

/* ── Individual tile wrapper that animates itself on mount ── */
function SlidingTile({
  seat,
  children,
  shouldAnimate,
}: {
  seat: string
  children: React.ReactNode
  shouldAnimate: boolean
}) {
  const [landed, setLanded] = useState(!shouldAnimate)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!shouldAnimate) return
    // Force the browser to paint the element at its starting offset
    // BEFORE we add the transition. Double-rAF ensures the initial
    // styles have been committed to the rendering pipeline.
    const el = ref.current
    if (!el) return
    // Read a layout property to force style recalculation
    void el.offsetHeight
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setLanded(true)
      })
    })
  }, [shouldAnimate])

  const startStyle = START_OFFSET[seat] ?? START_OFFSET.south

  return (
    <div
      ref={ref}
      data-keep-transition
      style={{
        ...(landed ? LANDED : startStyle),
        transition: landed ? SLIDE_TRANSITION : 'none',
        filter: 'drop-shadow(0 8px 18px rgba(0,0,0,.30))',
        willChange: 'transform, opacity',
      }}
    >
      {children}
    </div>
  )
}

export default function TrickCenter() {
  const { gameState, seatMap, lastTrickWinner, wonTricksPerPlayer, trickSweepSeat } = useGameStore(useShallow(s => ({
    gameState:          s.gameState,
    seatMap:            s.seatMap,
    lastTrickWinner:    s.lastTrickWinner,
    wonTricksPerPlayer: s.wonTricksPerPlayer,
    trickSweepSeat:     s.trickSweepSeat,
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

  /* Track which tiles have already been rendered so we only animate
     the NEWEST addition to the trick. Once a tile has appeared we
     never re-animate it. We clear the set when the trick resets. */
  const seenPlayers = useRef<Set<number>>(new Set())
  const prevTrickLen = useRef(0)

  // Reset seen set when trick shrinks (new trick started)
  if (trick.length < prevTrickLen.current) {
    seenPlayers.current.clear()
  }
  prevTrickLen.current = trick.length

  // Won-tricks stacked at edges — each trick is a row of 4,
  // multiple tricks stack vertically (north/south) or horizontally (east/west)
  const STACK_ANCHOR: Record<string, React.CSSProperties> = {
    north: { top: 6,    left: '50%',  transform: 'translateX(-50%)', flexDirection: 'column' as const },
    south: { bottom: 6, left: '50%',  transform: 'translateX(-50%)', flexDirection: 'column' as const },
    east:  { right: 6,  top: '50%',   transform: 'translateY(-50%)', flexDirection: 'row' as const },
    west:  { left: 6,   top: '50%',   transform: 'translateY(-50%)', flexDirection: 'row' as const },
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
        {/* Felt dot pattern */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(rgba(0,0,0,.1) 1.5px, transparent 1.5px)',
          backgroundSize: '12px 12px',
        }} />

        {/* Trump tint on felt */}
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
            // Only animate tiles we haven't seen before
            const isNew = !seenPlayers.current.has(item.player)
            if (isNew) seenPlayers.current.add(item.player)

            return (
              <SlidingTile
                key={`t-${item.player}`}
                seat={seat}
                shouldAnimate={isNew}
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
