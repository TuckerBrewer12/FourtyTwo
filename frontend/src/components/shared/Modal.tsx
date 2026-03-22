import type { ReactNode } from 'react'

interface ModalProps {
  children: ReactNode;
  onClose?: () => void;
}

export default function Modal({ children, onClose }: ModalProps) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100, padding: '1rem',
        animation: 'fadeIn .15s ease',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose?.() }}
    >
      <div style={{
        background: 'var(--surface)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.75rem',
        maxWidth: 480, width: '100%',
        boxShadow: 'var(--shadow-lg)',
        animation: 'slideUp .2s ease',
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>
        {children}
      </div>
    </div>
  );
}
