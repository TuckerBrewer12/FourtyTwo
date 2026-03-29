import { useState, useEffect } from 'react'

export default function SplashScreen() {
  const [visible, setVisible] = useState(true)
  const [fading, setFading] = useState(false)
  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 1200)
    const t2 = setTimeout(() => setVisible(false), 1600)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])
  if (!visible) return null
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: 'linear-gradient(135deg, #0a2e1f 0%, #1a4a35 50%, #0d3626 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      transition: 'opacity .4s ease',
      opacity: fading ? 0 : 1,
      pointerEvents: fading ? 'none' : 'auto',
    }}>
      <div style={{
        position: 'absolute', inset: 0, overflow: 'hidden', opacity: 0.05,
      }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: 8, height: 8, borderRadius: '50%', background: '#fff',
            top: `${15 + (i % 4) * 22}%`,
            left: `${10 + Math.floor(i / 4) * 30 + (i % 3) * 8}%`,
          }} />
        ))}
      </div>
      <div style={{
        fontSize: '6rem', fontWeight: 900, color: '#fff', lineHeight: 1,
        textShadow: '0 0 60px rgba(16,185,129,.4), 0 0 120px rgba(16,185,129,.2)',
        letterSpacing: '-.04em',
      }}>42</div>
      <div style={{
        fontSize: '1rem', fontWeight: 600,
        color: 'rgba(255,255,255,.6)',
        letterSpacing: '.15em', textTransform: 'uppercase',
        marginTop: '.5rem',
      }}>Texas Dominos</div>
      <div style={{ display: 'flex', gap: '.4rem', marginTop: '2rem' }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'rgba(255,255,255,.4)',
            animation: `splashDot 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
      <style>{`
        @keyframes splashDot {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.4); }
        }
      `}</style>
    </div>
  )
}
