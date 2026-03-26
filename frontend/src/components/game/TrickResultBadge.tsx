/**
 * TrickResultBadge — appears in the top-right corner after each trick.
 * Shows who won and mini dominos from that trick.
 */
import { useGameStore } from '../../store/gameStore'
import { useShallow } from 'zustand/react/shallow'
import Domino from '../domino/Domino'

export default function TrickResultBadge() {
  const { trickResult, trickBadgeColors } = useGameStore(useShallow(s => ({
    trickResult: s.trickResult,
    trickBadgeColors: s.trickBadgeColors,
  })))

  if (!trickResult) return null

  const { winnerName, dominos, score } = trickResult

  return (
    <div
      key={winnerName + dominos.length + score}
      style={{
        position: 'fixed',
        top: 60,
        right: 12,
        zIndex: 400,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '8px 12px',
        boxShadow: '0 6px 24px rgba(0,0,0,.12), 0 2px 8px rgba(0,0,0,.06)',
        animation: 'trickBadgeIn 0.38s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        maxWidth: 280,
      }}
    >
      {/* Mini domino row */}
      {dominos.length > 0 && (
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          gap: 3,
        }}>
          {dominos.map((d, i) => (
            <Domino
              key={i}
              a={d[0]}
              b={d[1]}
              size="xs"
              vertical
              colorless={!trickBadgeColors}
            />
          ))}
        </div>
      )}

      {/* Winner text */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span style={{
          fontSize: '.68rem',
          fontWeight: 700,
          color: 'var(--text)',
          whiteSpace: 'nowrap',
          lineHeight: 1.2,
        }}>
          {winnerName} won
        </span>
        {score > 0 && (
          <span style={{
            fontSize: '.6rem',
            fontWeight: 700,
            color: 'var(--accent)',
          }}>
            +{score} pts
          </span>
        )}
      </div>
    </div>
  )
}
