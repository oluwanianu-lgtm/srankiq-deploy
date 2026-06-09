// pages/extension-auth.tsx
// Bridge page the Chrome extension opens to obtain the signed-in user's Firebase ID token.
// If logged in: posts the token to the extension (via window.postMessage + a readable DOM node).
// If not: shows a Sign In button that routes to /login and back.

import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../contexts/AuthContext'
import { getAuth } from 'firebase/auth'

export default function ExtensionAuth() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const [status, setStatus] = useState('Checking your SRankIQ session…')

  useEffect(() => {
    if (loading) return
    if (!user) { setStatus('not_signed_in'); return }
    ;(async () => {
      try {
        const token = await getAuth().currentUser?.getIdToken(true)
        if (!token) { setStatus('not_signed_in'); return }
        const payload = { type: 'SRANKIQ_AUTH', token, plan: (profile?.plan || 'free'), email: user.email }
        // 1) expose in a DOM node the content script can read
        const node = document.getElementById('srankiq-auth-payload')
        if (node) node.textContent = JSON.stringify(payload)
        // 2) broadcast for any listener (extension content script / opener)
        window.postMessage(payload, '*')
        if (window.opener) window.opener.postMessage(payload, '*')
        setStatus('connected')
      } catch {
        setStatus('error')
      }
    })()
  }, [user, profile, loading])

  const goLogin = () => router.push('/login?next=/extension-auth')

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(circle at 50% 35%, #0a0a1e, #030309)', color: '#fff',
      fontFamily: 'Outfit, sans-serif', textAlign: 'center', padding: 24 }}>
      <div style={{ maxWidth: 420 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-icon-cyan.png" alt="SRankIQ" width={64} height={64}
          style={{ width: 64, height: 64, objectFit: 'contain', marginBottom: 20 }} />
        {status === 'connected' && (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 800 }}>You're connected ✓</h1>
            <p style={{ color: '#9a9ab8', marginTop: 10 }}>The SRankIQ extension is now linked to your account. You can close this tab and head back to YouTube.</p>
          </>
        )}
        {status === 'not_signed_in' && (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 800 }}>Sign in to use the extension</h1>
            <p style={{ color: '#9a9ab8', marginTop: 10, marginBottom: 20 }}>The SRankIQ extension works once you're signed in to your SRankIQ account.</p>
            <button onClick={goLogin} style={{ background: 'linear-gradient(135deg,#00f5ff,#7b2fff)', color: '#000',
              border: 'none', borderRadius: 12, padding: '14px 28px', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>
              Sign in to SRankIQ →
            </button>
          </>
        )}
        {(status !== 'connected' && status !== 'not_signed_in' && status !== 'error') && (
          <p style={{ color: '#9a9ab8' }}>{status}</p>
        )}
        {status === 'error' && <p style={{ color: '#ff6688' }}>Something went wrong. Please refresh.</p>}
        <div id="srankiq-auth-payload" style={{ display: 'none' }} />
      </div>
    </div>
  )
}
