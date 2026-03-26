/**
 * ConfettiLayer — particle / confetti burst system.
 * Shows mini confetti on trick wins (score >= 5 pts) and
 * full confetti rain on hand completion.
 */
import { useGameStore } from '../../store/gameStore'
import { useShallow } from 'zustand/react/shallow'
import { useMemo } from 'react'

// Particle config per confetti piece
interface Particle {
  id: number;
  x: number;    // % from left
  y: number;    // % from top
  color: string;
  size: number;
  animName: string;
  duration: number;
  delay: number;
  shape: 'rect' | 'circle' | 'star';
}

const TEAM1_COLORS = ['#3b82f6', '#60a5fa', '#93c5fd', '#1d4ed8', '#bfdbfe', '#ffffff']
const TEAM2_COLORS = ['#ef4444', '#f87171', '#fca5a5', '#b91c1c', '#fee2e2', '#ffffff']
const NEUTRAL_COLORS = ['#22c55e', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#ffffff']

const FALL_ANIMS = [
  'confettiFall1', 'confettiFall2', 'confettiFall3',
  'confettiFall4', 'confettiFall5', 'confettiFall6',
]

function makeParticles(count: number, team: number | null, yBase: number): Particle[] {
  const colors = team === 1 ? TEAM1_COLORS : team === 2 ? TEAM2_COLORS : NEUTRAL_COLORS
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: yBase + (Math.random() - 0.5) * 20,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: 6 + Math.random() * 10,
    animName: FALL_ANIMS[Math.floor(Math.random() * FALL_ANIMS.length)],
    duration: 0.8 + Math.random() * 1.4,
    delay: Math.random() * 0.5,
    shape: (['rect', 'circle', 'star'] as const)[Math.floor(Math.random() * 3)],
  }))
}

function StarShape({ size, color }: { size: number; color: string }) {
  const s = size * 0.5
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      <polygon
        points={`${s},0 ${s*1.18},${s*0.81} ${s*2},${s*0.81} ${s*1.35},${s*1.31} ${s*1.62},${s*2} ${s},${s*1.5} ${s*0.38},${s*2} ${s*0.65},${s*1.31} 0,${s*0.81} ${s*0.82},${s*0.81}`}
        fill={color}
      />
    </svg>
  )
}

function ConfettiParticle({ p }: { p: Particle }) {
  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${p.x}%`,
    top: `${p.y}%`,
    width: p.size,
    height: p.shape === 'rect' ? p.size * 0.5 : p.size,
    background: p.shape !== 'star' ? p.color : 'transparent',
    borderRadius: p.shape === 'circle' ? '50%' : p.shape === 'rect' ? '2px' : 0,
    animation: `${p.animName} ${p.duration}s ${p.delay}s cubic-bezier(0.25, 0.46, 0.45, 0.94) both`,
    pointerEvents: 'none',
    transformOrigin: 'center center',
  }

  if (p.shape === 'star') {
    return (
      <div style={style}>
        <StarShape size={p.size} color={p.color} />
      </div>
    )
  }

  return <div style={style} />
}

// Full confetti rain — many particles across full screen
function FullConfetti({ team }: { team: number }) {
  const particles = useMemo(() => {
    const all: Particle[] = []
    // Multiple waves across the screen
    for (let wave = 0; wave < 4; wave++) {
      const waveParticles = makeParticles(18, team, 5 + wave * 8)
      waveParticles.forEach(p => {
        p.delay += wave * 0.15
        p.duration += wave * 0.1
        all.push({ ...p, id: wave * 100 + p.id })
      })
    }
    return all
  }, [team])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 250, pointerEvents: 'none' }}>
      {particles.map(p => <ConfettiParticle key={p.id} p={p} />)}
    </div>
  )
}

// Score pop burst — small burst at center of table
function ScorePopBurst({ pts, team, label }: { pts: number; team: number; label: string }) {
  // Size confetti burst proportional to score
  const count = pts >= 10 ? 8 : pts >= 5 ? 5 : 3
  const particles = useMemo(() => makeParticles(count, team, 42), [count, team])

  const color = team === 1 ? 'var(--t1)' : 'var(--t2)'

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 260, pointerEvents: 'none' }}>
      {/* Floating score label */}
      <div style={{
        position: 'absolute',
        top: '48%',
        left: '50%',
        animation: 'scorePop 1.5s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        zIndex: 261,
        fontWeight: 900,
        fontSize: pts >= 10 ? '2rem' : '1.5rem',
        color,
        letterSpacing: '-.02em',
        textShadow: `0 2px 12px ${color}88, 0 0 24px ${color}44`,
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }}>
        {label}
      </div>
      {/* Mini burst particles — positions are fixed in useMemo above */}
      {particles.map(p => <ConfettiParticle key={p.id} p={p} />)}
    </div>
  )
}

export default function ConfettiLayer() {
  const { celebrateTeam, scorePops } = useGameStore(useShallow(s => ({
    celebrateTeam: s.celebrateTeam,
    scorePops: s.scorePops,
  })))

  return (
    <>
      {/* Full confetti on hand complete */}
      {celebrateTeam !== null && scorePops.length === 0 && (
        <FullConfetti team={celebrateTeam} />
      )}

      {/* Score pops for each trick */}
      {scorePops.map(pop => (
        <ScorePopBurst key={pop.id} pts={pop.pts} team={pop.team} label={pop.label} />
      ))}
    </>
  )
}
