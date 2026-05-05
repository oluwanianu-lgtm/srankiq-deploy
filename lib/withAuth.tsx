// lib/withAuth.tsx
import React, { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../contexts/AuthContext'

// ── Animated Loading Screen using your exact SRankIQ logo ──────────────────
function LoadingScreen() {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#0a0a12',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* Outer glow ring */}
      <div style={{
        position: 'relative',
        width: 120, height: 120,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {/* Spinning gradient ring */}
        <div style={{
          position: 'absolute', inset: -4,
          borderRadius: '50%',
          background: 'conic-gradient(from 0deg, #00d4ff, #7b2fff, #00d4ff)',
          animation: 'spin 2s linear infinite',
        }} />
        {/* Inner mask */}
        <div style={{
          position: 'absolute', inset: 2,
          borderRadius: '50%',
          background: '#0a0a12',
        }} />

        {/* Pulse ring 1 */}
        <div style={{
          position: 'absolute', inset: -16,
          borderRadius: '50%',
          border: '1px solid rgba(0,212,255,0.15)',
          animation: 'pulse 2s ease-in-out infinite',
        }} />
        {/* Pulse ring 2 */}
        <div style={{
          position: 'absolute', inset: -28,
          borderRadius: '50%',
          border: '1px solid rgba(123,47,255,0.1)',
          animation: 'pulse 2s ease-in-out infinite 0.4s',
        }} />

        {/* Your actual logo — inline SVG */}
        <div style={{ position: 'relative', zIndex: 2, animation: 'breathe 2s ease-in-out infinite' }}>
          <svg width="72" height="72" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="loadGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00d4ff" />
                <stop offset="100%" stopColor="#7b2fff" />
              </linearGradient>
              <linearGradient id="loadGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#7b2fff" stopOpacity="0.15" />
              </linearGradient>
            </defs>
            <rect width="40" height="40" rx="10" fill="#0d0d0d" />
            <rect width="40" height="40" rx="10" fill="url(#loadGrad2)" />
            <rect x="0.5" y="0.5" width="39" height="39" rx="9.5" stroke="url(#loadGrad1)" strokeOpacity="0.5" />
            <path
              d="M14 13.5C14 12.1193 15.1193 11 16.5 11H23.5C24.8807 11 26 12.1193 26 13.5C26 14.8807 24.8807 16 23.5 16H17.5C16.1193 16 15 17.1193 15 18.5V18.5C15 19.8807 16.1193 21 17.5 21H22.5C23.8807 21 25 22.1193 25 23.5V24.5C25 25.8807 23.8807 27 22.5 27H15.5C14.1193 27 13 25.8807 13 24.5"
              stroke="url(#loadGrad1)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <rect x="27" y="23" width="3" height="4" rx="1" fill="url(#loadGrad1)" opacity="0.9" />
            <rect x="31" y="20" width="3" height="7" rx="1" fill="url(#loadGrad1)" opacity="0.7" />
            <rect x="35" y="16" width="3" height="11" rx="1" fill="url(#loadGrad1)" opacity="0.5" />
            <circle cx="31" cy="12" r="1.5" fill="#00d4ff" opacity="0.8" />
            <circle cx="34" cy="9" r="1" fill="#7b2fff" opacity="0.6" />
          </svg>
        </div>
      </div>

      {/* Brand name */}
      <div style={{ marginTop: 28, textAlign: 'center' }}>
        <div style={{
          fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em',
          background: 'linear-gradient(90deg, #00d4ff, #7b2fff)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          animation: 'fadeIn 0.6s ease forwards',
        }}>
          SRankIQ
        </div>
        <div style={{
          fontSize: 11, color: 'rgba(255,255,255,0.3)',
          letterSpacing: '0.15em', textTransform: 'uppercase',
          marginTop: 4, animation: 'fadeIn 0.6s ease 0.2s both',
        }}>
          Social Media Ranking IQ
        </div>
      </div>

      {/* Animated dots */}
      <div style={{
        display: 'flex', gap: 6, marginTop: 32,
        animation: 'fadeIn 0.5s ease 0.4s both',
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'linear-gradient(135deg, #00d4ff, #7b2fff)',
            animation: `dotBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.06); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
        @keyframes dotBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-8px); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthenticatedComponent(props: P) {
    const { user, loading } = useAuth()
    const router = useRouter()

    useEffect(() => {
      if (!loading && !user) {
        router.replace('/login')
      }
    }, [user, loading, router])

    if (loading) return <LoadingScreen />
    if (!user) return <LoadingScreen />

    return <Component {...props} />
  }
}
