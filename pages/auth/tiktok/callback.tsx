// pages/auth/tiktok/callback.tsx
// TikTok redirects here after user approves OAuth
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../../../contexts/AuthContext'
import { usePlatform } from '../../../contexts/PlatformContext'
import toast from 'react-hot-toast'

export default function TikTokCallback() {
  const router = useRouter()
  const { user } = useAuth()
  const { connectPlatform } = usePlatform()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Connecting your TikTok account...')

  useEffect(() => {
    if (!router.isReady) return

    const { code, state, error } = router.query

    if (error) {
      setStatus('error')
      setMessage('TikTok authorization was cancelled.')
      setTimeout(() => router.push('/settings?tab=Connections'), 2500)
      return
    }

    if (!code) {
      setStatus('error')
      setMessage('No authorization code received from TikTok.')
      setTimeout(() => router.push('/settings?tab=Connections'), 2500)
      return
    }

    // Verify state to prevent CSRF
    const savedState = sessionStorage.getItem('tiktok_oauth_state')
    if (state !== savedState) {
      setStatus('error')
      setMessage('Security check failed. Please try again.')
      setTimeout(() => router.push('/settings?tab=Connections'), 2500)
      return
    }

    // Exchange code for token
    async function exchange() {
      try {
        setMessage('Exchanging authorization code...')
        const res = await fetch('/api/auth/tiktok/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        })

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Token exchange failed')
        }

        const { access_token, open_id } = await res.json()

        setMessage('Fetching your TikTok profile...')

        // Fetch user info
        const userRes = await fetch('/api/auth/tiktok/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token, open_id }),
        })

        if (!userRes.ok) {
          const err = await userRes.json()
          throw new Error(err.error || 'Failed to fetch TikTok profile')
        }

        const userData = await userRes.json()

        // Save to Firebase via connectPlatform
        await connectPlatform('tk', {
          connected: true,
          accessToken: access_token,
          openId: open_id,
          channelName: userData.display_name || userData.username,
          channelId: open_id,
          followers: userData.follower_count || 0,
          profilePic: userData.avatar_url || '',
          likes: userData.likes_count || 0,
          videoCount: userData.video_count || 0,
        })

        setStatus('success')
        setMessage(`TikTok connected! Welcome, ${userData.display_name || userData.username}`)
        toast.success('TikTok connected successfully!')
        sessionStorage.removeItem('tiktok_oauth_state')
        setTimeout(() => router.push('/settings?tab=Connections'), 2000)
      } catch (err: any) {
        console.error('TikTok callback error:', err)
        setStatus('error')
        setMessage(err.message || 'Something went wrong. Please try again.')
        setTimeout(() => router.push('/settings?tab=Connections'), 3000)
      }
    }

    exchange()
  }, [router.isReady, router.query])

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a12',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{ textAlign: 'center', maxWidth: 360, padding: 32 }}>
        {/* TikTok logo */}
        <div style={{
          width: 64, height: 64, borderRadius: 16, margin: '0 auto 24px',
          background: 'linear-gradient(135deg, #010101, #1a1a1a)',
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28,
        }}>
          🎵
        </div>

        {status === 'loading' && (
          <>
            <div style={{
              width: 40, height: 40, borderRadius: '50%', margin: '0 auto 20px',
              border: '3px solid rgba(255,255,255,0.1)',
              borderTop: '3px solid #00d4ff',
              animation: 'spin 0.8s linear infinite',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </>
        )}

        {status === 'success' && (
          <div style={{
            width: 48, height: 48, borderRadius: '50%', margin: '0 auto 20px',
            background: 'rgba(0,255,136,0.15)', border: '2px solid #00ff88',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22,
          }}>✓</div>
        )}

        {status === 'error' && (
          <div style={{
            width: 48, height: 48, borderRadius: '50%', margin: '0 auto 20px',
            background: 'rgba(255,0,80,0.15)', border: '2px solid #ff0050',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22,
          }}>✕</div>
        )}

        <div style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
          {status === 'loading' ? 'Connecting TikTok' : status === 'success' ? 'Connected!' : 'Connection Failed'}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, lineHeight: 1.6 }}>
          {message}
        </div>
        {status !== 'loading' && (
          <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, marginTop: 16 }}>
            Redirecting you back...
          </div>
        )}
      </div>
    </div>
  )
}
