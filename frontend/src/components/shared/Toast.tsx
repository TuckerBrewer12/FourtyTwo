import { useGameStore } from '../../store/gameStore'

const BORDER_COLORS: Record<string, string> = {
  default: 'var(--accent)',
  success: 'var(--success)',
  error:   'var(--danger)',
  info:    'var(--text-muted)',
}

export default function ToastStack() {
  const toasts = useGameStore(s => s.toasts);
  const remove = useGameStore(s => s.removeToast);

  return (
    <div style={{
      position: 'fixed', top: '.75rem', right: '.75rem',
      zIndex: 200, display: 'flex', flexDirection: 'column', gap: '.35rem',
      pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <div
          key={t.id}
          onClick={() => remove(t.id)}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderLeft: `4px solid ${BORDER_COLORS[t.type] ?? BORDER_COLORS.default}`,
            borderRadius: 'var(--radius)',
            padding: '.5rem .9rem',
            fontSize: '.84rem',
            maxWidth: 280,
            boxShadow: 'var(--shadow)',
            animation: 'slideLeft .2s ease',
            pointerEvents: 'auto',
            cursor: 'pointer',
            color: 'var(--text)',
          }}
        >
          {t.msg}
        </div>
      ))}
    </div>
  );
}
