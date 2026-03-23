import styles from './Domino.module.css'

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

function PipGrid({ n }: { n: number }) {
  const pos = PIP_POS[n] ?? [];
  const color = `var(--suit-${n})`;
  return (
    <div className={styles.pipGrid}>
      {Array.from({ length: 9 }, (_, i) => (
        <div key={i} className={styles.pipCell}>
          {pos.includes(i) && <div className={styles.pip} style={{ background: color }} />}
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
  className?: string;
}

export default function Domino({
  a, b, size = 'md', onClick, playable, invalid, inTrick, className,
}: DominoProps) {
  const count = isCount(a, b);

  const cls = [
    styles.domino,
    styles[size],
    count   ? styles.count   : '',
    playable ? styles.playable : '',
    invalid  ? styles.invalid  : '',
    inTrick  ? styles.inTrick  : '',
    className ?? '',
  ].filter(Boolean).join(' ');

  return (
    <div className={cls} onClick={playable && onClick ? onClick : undefined}>
      <div className={styles.half} style={{ background: 'var(--domino-half)' }}>
        <PipGrid n={a} />
      </div>
      <div className={styles.divider} />
      <div className={styles.half} style={{ background: 'var(--domino-half)' }}>
        <PipGrid n={b} />
      </div>
    </div>
  );
}
