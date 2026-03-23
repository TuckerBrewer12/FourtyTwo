import { Component, type ReactNode } from 'react'

interface State { error: Error | null }

export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <div style={{
        position: 'fixed', inset: 0, background: '#fff',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '2rem', fontFamily: 'monospace',
      }}>
        <h2 style={{ color: '#ef4444', marginBottom: '1rem' }}>React Error</h2>
        <pre style={{
          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
          padding: '1rem', maxWidth: 600, width: '100%', overflow: 'auto',
          fontSize: '.8rem', whiteSpace: 'pre-wrap', color: '#dc2626',
        }}>{error.message}{'\n\n'}{error.stack}</pre>
      </div>
    )
  }
}
