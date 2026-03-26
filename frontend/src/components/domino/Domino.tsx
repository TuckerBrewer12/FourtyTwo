import styles from './Domino.module.css'
import { useGameStore } from '../../store/gameStore'

const PIP_POS: Record<number, number[]> = {
  0: [],
  1: [4],
  2: [2, 6],
  3: [2, 4, 6],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
}

function isCount(a: number, b: number) {
  const s = a + b;
  return s > 0 && s % 5 === 0;
}

function PipGrid({ n, suit, colorless }: { n: number; suit: number; colorless?: boolean }) {
  const pos = PIP_POS[n] ?? [];
  return (
    <div className={styles.pipGrid}>
      {Array.from({ length: 9 }, (_, i) => (
        <div key={i} className={styles.pipCell}>
          {pos.includes(i) && (
            <div
              className={styles.pip}
              style={{ background: colorless ? 'rgba(0,0,0,0.55)' : `var(--suit-${suit})` }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface DominoProps {
  a: number;
  b: number;
  size?: Size;
  onClick?: () => void;
  playable?: boolean;
  invalid?: boolean;
  inTrick?: boolean;
  vertical?: boolean;
  isTrump?: boolean;
  className?: string;
  // Animation extras
  dealing?: boolean;
  dealDelay?: number;  // ms delay for staggered deal
  sweepDir?: 'north' | 'south' | 'east' | 'west' | null;
  flying?: boolean;
  colorless?: boolean;  // render pips in neutral dark color (no suit color)
  style?: React.CSSProperties;
}

export default function Domino({
  a, b, size = 'md', onClick, playable, invalid, inTrick, vertical, isTrump, className,
  dealing, dealDelay, sweepDir, flying, colorless, style,
}: DominoProps) {
  const showCountMarkers = useGameStore(s => s.showCountMarkers);
  const count = showCountMarkers && isCount(a, b);

  const sweepClass = sweepDir
    ? `${styles.sweeping} ${styles['sweep' + sweepDir.charAt(0).toUpperCase() + sweepDir.slice(1)]}`
    : '';

  const cls = [
    styles.domino,
    styles[size],
    isTrump  ? styles.trump    : '',
    count    ? styles.count    : '',
    playable ? styles.playable : '',
    invalid  ? styles.invalid  : '',
    inTrick  ? styles.inTrick  : '',
    vertical ? styles.vertical : '',
    dealing  ? styles.dealing  : '',
    flying   ? styles.flying   : '',
    sweepClass,
    className ?? '',
  ].filter(Boolean).join(' ');

  const dealStyle: React.CSSProperties = dealing && dealDelay !== undefined
    ? { animationDelay: `${dealDelay}ms` }
    : {};

  return (
    <div
      className={cls}
      style={{ ...dealStyle, ...style }}
      onClick={playable && onClick ? onClick : undefined}
    >
      <div className={styles.half}>
        <PipGrid n={a} suit={a} colorless={colorless} />
      </div>
      <div className={styles.divider} />
      <div className={styles.half}>
        <PipGrid n={b} suit={b} colorless={colorless} />
      </div>
    </div>
  );
}
