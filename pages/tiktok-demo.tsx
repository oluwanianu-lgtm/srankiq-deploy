// pages/tiktok-demo.tsx
// Demo page for TikTok app review — shows the full connect flow
import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'

type Step = 'home' | 'settings' | 'oauth' | 'permissions' | 'connecting' | 'connected'

export default function TikTokDemo() {
  const [step, setStep] = useState<Step>('home')
  const [progress, setProgress] = useState(0)
  const [dots, setDots] = useState('')

  // Animate connecting dots
  useEffect(() => {
    if (step !== 'connecting') return
    const i = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 400)
    return () => clearInterval(i)
  }, [step])

  // Auto-progress connecting → connected
  useEffect(() => {
    if (step !== 'connecting') return
    setProgress(0)
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(interval); setStep('connected'); return 100 }
        return p + 2
      })
    }, 60)
    return () => clearInterval(interval)
  }, [step])

  const reset = () => { setStep('home'); setProgress(0) }

  return (
    <>
      <Head>
        <title>SRankIQ — TikTok Integration Demo</title>
      </Head>
      <div style={{ minHeight: '100vh', background: '#0a0a12', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#e8e8e8' }}>

        {/* Top banner */}
        <div style={{ background: 'rgba(255,200,0,0.08)', borderBottom: '1px solid rgba(255,200,0,0.2)', padding: '10px 24px', fontSize: 12, color: 'rgba(255,200,0,0.8)', textAlign: 'center', letterSpacing: '0.05em' }}>
          🎬 TIKTOK APP REVIEW DEMO — This page demonstrates the TikTok Login Kit integration flow for SRankIQ
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, padding: '20px 24px 0', maxWidth: 700, margin: '0 auto' }}>
          {[
            { id: 'home', label: 'App' },
            { id: 'settings', label: 'Settings' },
            { id: 'oauth', label: 'TikTok Login' },
            { id: 'permissions', label: 'Permissions' },
            { id: 'connecting', label: 'Connecting' },
            { id: 'connected', label: 'Connected' },
          ].map((s, i, arr) => {
            const steps: Step[] = ['home', 'settings', 'oauth', 'permissions', 'connecting', 'connected']
            const currentIdx = steps.indexOf(step)
            const isActive = steps.indexOf(s.id as Step) === currentIdx
            const isDone = steps.indexOf(s.id as Step) < currentIdx
            return (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: isDone ? '#00d4ff' : isActive ? 'linear-gradient(135deg,#00d4ff,#7b2fff)' : 'rgba(255,255,255,0.08)',
                    border: isActive ? '2px solid #00d4ff' : isDone ? '2px solid #00d4ff' : '2px solid rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: isDone || isActive ? '#000' : 'rgba(255,255,255,0.3)',
                    transition: 'all 0.3s',
                  }}>
                    {isDone ? '✓' : i + 1}
                  </div>
                  <div style={{ fontSize: 9, color: isActive ? '#00d4ff' : isDone ? '#00d4ff' : 'rgba(255,255,255,0.25)', whiteSpace: 'nowrap', fontWeight: isActive ? 700 : 400 }}>
                    {s.label}
                  </div>
                </div>
                {i < arr.length - 1 && (
                  <div style={{ width: 40, height: 1, background: isDone ? '#00d4ff' : 'rgba(255,255,255,0.08)', margin: '0 4px 16px', transition: 'all 0.3s' }} />
                )}
              </div>
            )
          })}
        </div>

        {/* Main content */}
        <div style={{ maxWidth: 700, margin: '24px auto', padding: '0 24px 60px' }}>

          {/* ── STEP 1: SRankIQ Dashboard ── */}
          {step === 'home' && (
            <Screen title="SRankIQ Dashboard" subtitle="User is logged into SRankIQ and wants to connect TikTok">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'YouTube', color: '#ff0000', icon: '▶', status: 'Connected', sub: '12.4K subscribers' },
                  { label: 'TikTok', color: '#010101', icon: '🎵', status: 'Not Connected', sub: 'Click to connect' },
                  { label: 'Instagram', color: '#e1306c', icon: '📸', status: 'Not Connected', sub: 'Click to connect' },
                ].map(p => (
                  <div key={p.label} style={{
                    padding: 16, borderRadius: 12,
                    background: p.label === 'TikTok' ? 'rgba(0,212,255,0.06)' : 'rgba(255,255,255,0.04)',
                    border: p.label === 'TikTok' ? '1px solid rgba(0,212,255,0.2)' : '1px solid rgba(255,255,255,0.07)',
                  }}>
                    <div style={{ fontSize: 20, marginBottom: 8 }}>{p.icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{p.label}</div>
                    <div style={{ fontSize: 11, color: p.status === 'Connected' ? '#00ff88' : 'rgba(255,255,255,0.35)', marginBottom: 12 }}>{p.status}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{p.sub}</div>
                  </div>
                ))}
              </div>
              <Btn onClick={() => setStep('settings')}>Go to Settings → Connect TikTok</Btn>
            </Screen>
          )}

          {/* ── STEP 2: Settings Connections Tab ── */}
          {step === 'settings' && (
            <Screen title="Settings → Connections" subtitle="User clicks 'Connect' next to TikTok">
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 12 }}>
                Connect your social accounts to unlock real analytics and AI optimization.
              </div>
              {[
                { code: 'yt', label: 'YouTube', icon: '▶', color: '#ff0000', connected: true, info: 'MyChannel · 12.4K subscribers' },
                { code: 'tt', label: 'TikTok', icon: '🎵', color: '#010101', connected: false, info: 'Not connected' },
                { code: 'ig', label: 'Instagram', icon: '📸', color: '#e1306c', connected: false, info: 'Not connected' },
                { code: 'fb', label: 'Facebook', icon: 'f', color: '#1877f2', connected: false, info: 'Not connected' },
              ].map(p => (
                <div key={p.code} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px', borderRadius: 12, marginBottom: 8,
                  background: p.code === 'tt' ? 'rgba(0,212,255,0.05)' : 'rgba(255,255,255,0.03)',
                  border: p.code === 'tt' ? '1px solid rgba(0,212,255,0.25)' : '1px solid rgba(255,255,255,0.06)',
                  borderLeft: `4px solid ${p.connected ? p.color : p.code === 'tt' ? '#00d4ff' : 'transparent'}`,
                }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: p.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                    {p.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{p.label}</div>
                    <div style={{ fontSize: 11, color: p.connected ? '#00ff88' : 'rgba(255,255,255,0.35)' }}>{p.info}</div>
                  </div>
                  {p.connected ? (
                    <div style={{ fontSize: 11, color: '#00ff88', padding: '4px 10px', borderRadius: 20, background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.2)' }}>✓ Connected</div>
                  ) : p.code === 'tt' ? (
                    <button onClick={() => setStep('oauth')} style={{
                      padding: '7px 16px', borderRadius: 8, border: '1px solid rgba(0,212,255,0.4)',
                      background: 'rgba(0,212,255,0.1)', color: '#00d4ff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    }}>
                      🔗 Connect
                    </button>
                  ) : (
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', padding: '4px 10px', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20 }}>Connect</div>
                  )}
                </div>
              ))}
              <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
                🔒 Tokens are encrypted and stored securely. We never post on your behalf.
              </div>
            </Screen>
          )}

          {/* ── STEP 3: TikTok OAuth Page ── */}
          {step === 'oauth' && (
            <Screen title="TikTok Login — OAuth Screen" subtitle="User is redirected to TikTok to log in (tiktok.com/v2/auth/authorize)">
              <div style={{
                background: '#fff', borderRadius: 16, padding: 32, maxWidth: 360, margin: '0 auto',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              }}>
                {/* TikTok branding */}
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>🎵</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#010101', marginBottom: 4 }}>TikTok</div>
                  <div style={{ fontSize: 13, color: '#666' }}>Log in to continue to SRankIQ</div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: '#999', marginBottom: 6, fontWeight: 600 }}>PHONE / EMAIL / USERNAME</div>
                  <div style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, color: '#333', background: '#f9f9f9' }}>
                    user@example.com
                  </div>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, color: '#999', marginBottom: 6, fontWeight: 600 }}>PASSWORD</div>
                  <div style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, color: '#333', background: '#f9f9f9' }}>
                    ••••••••••
                  </div>
                </div>

                <button onClick={() => setStep('permissions')} style={{
                  width: '100%', padding: '12px', borderRadius: 8, border: 'none',
                  background: '#fe2c55', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                }}>
                  Log in
                </button>

                <div style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: '#999' }}>
                  By continuing, you agree to TikTok's Terms of Service and Privacy Policy
                </div>
              </div>
            </Screen>
          )}

          {/* ── STEP 4: Permissions Screen ── */}
          {step === 'permissions' && (
            <Screen title="TikTok Permissions" subtitle="TikTok shows the user what SRankIQ is requesting access to">
              <div style={{
                background: '#fff', borderRadius: 16, padding: 28, maxWidth: 360, margin: '0 auto',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              }}>
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>🎵</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#010101' }}>SRankIQ wants to access your TikTok account</div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, color: '#666', fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Permissions requested</div>
                  {[
                    { icon: '👤', title: 'Basic user info', desc: 'Your TikTok username, display name, and profile picture' },
                    { icon: '🎬', title: 'Video list', desc: 'View your public videos and their performance metrics' },
                  ].map((p, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: i === 0 ? '1px solid #f0f0f0' : 'none' }}>
                      <div style={{ fontSize: 20, flexShrink: 0 }}>{p.icon}</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#010101', marginBottom: 2 }}>{p.title}</div>
                        <div style={{ fontSize: 11, color: '#666' }}>{p.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ fontSize: 11, color: '#999', marginBottom: 16, padding: '10px 12px', background: '#f9f9f9', borderRadius: 8 }}>
                  SRankIQ will not post on your behalf or access private messages.
                </div>

                <button onClick={() => setStep('connecting')} style={{
                  width: '100%', padding: '12px', borderRadius: 8, border: 'none',
                  background: '#fe2c55', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 8,
                }}>
                  Authorize
                </button>
                <button onClick={() => setStep('settings')} style={{
                  width: '100%', padding: '12px', borderRadius: 8, border: '1px solid #ddd',
                  background: '#fff', color: '#333', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}>
                  Cancel
                </button>
              </div>
            </Screen>
          )}

          {/* ── STEP 5: Connecting ── */}
          {step === 'connecting' && (
            <Screen title="srankiq.com/auth/tiktok/callback" subtitle="User is redirected back to SRankIQ — token is exchanged, profile is fetched">
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 24 }}>🎵</div>

                {/* Progress ring */}
                <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 24px' }}>
                  <svg width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
                    <circle cx="40" cy="40" r="34" fill="none" stroke="#00d4ff" strokeWidth="6"
                      strokeDasharray={`${2 * Math.PI * 34}`}
                      strokeDashoffset={`${2 * Math.PI * 34 * (1 - progress / 100)}`}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 0.1s linear' }}
                    />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#00d4ff' }}>
                    {progress}%
                  </div>
                </div>

                <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 8 }}>
                  Connecting TikTok{dots}
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
                  {progress < 33 ? 'Exchanging authorization code...' : progress < 66 ? 'Fetching your TikTok profile...' : 'Saving to your account...'}
                </div>
              </div>
            </Screen>
          )}

          {/* ── STEP 6: Connected! ── */}
          {step === 'connected' && (
            <Screen title="TikTok Connected — SRankIQ Dashboard" subtitle="Success! TikTok data is now displayed in the SRankIQ dashboard">
              {/* Success banner */}
              <div style={{ padding: '16px 20px', borderRadius: 12, background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,255,136,0.15)', border: '2px solid #00ff88', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>✓</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#00ff88' }}>TikTok Connected Successfully!</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>@srankiq_demo · TikTok data is now syncing</div>
                </div>
              </div>

              {/* TikTok stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
                {[
                  { label: 'Followers', value: '24.8K' },
                  { label: 'Total Likes', value: '183K' },
                  { label: 'Videos', value: '47' },
                  { label: 'Avg Views', value: '12.4K' },
                ].map(s => (
                  <div key={s.label} style={{ padding: '14px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#00d4ff', marginBottom: 4 }}>{s.value}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Recent videos */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Recent TikTok Videos</div>
                {[
                  { title: 'How I grew my channel to 10K in 30 days', views: '48.2K', likes: '3.1K', date: '2 days ago' },
                  { title: 'Best YouTube SEO tricks that actually work', views: '31.7K', likes: '2.4K', date: '5 days ago' },
                  { title: 'I analyzed 100 viral videos — here\'s what I found', views: '22.9K', likes: '1.8K', date: '1 week ago' },
                ].map((v, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 8, background: 'linear-gradient(135deg,#fe2c55,#7b2fff)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🎵</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: '#fff', fontWeight: 600, marginBottom: 4, lineHeight: 1.4 }}>{v.title}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{v.views} views · {v.likes} likes · {v.date}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <Btn onClick={reset}>↩ Restart Demo</Btn>
                <Link href="/settings" style={{ flex: 1 }}>
                  <button style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer' }}>
                    Go to Real Settings
                  </button>
                </Link>
              </div>
            </Screen>
          )}

          {/* Scope info box */}
          <div style={{ marginTop: 20, padding: '16px 20px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', fontSize: 12 }}>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 10 }}>Integration details</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, color: 'rgba(255,255,255,0.4)' }}>
              <div>📦 <strong style={{ color: 'rgba(255,255,255,0.6)' }}>Product:</strong> Login Kit + Display API</div>
              <div>🔑 <strong style={{ color: 'rgba(255,255,255,0.6)' }}>Scopes:</strong> user.info.basic, video.list</div>
              <div>🔄 <strong style={{ color: 'rgba(255,255,255,0.6)' }}>Redirect URI:</strong> srankiq.com/auth/tiktok/callback</div>
              <div>🌐 <strong style={{ color: 'rgba(255,255,255,0.6)' }}>Platform:</strong> Web</div>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}

function Screen({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ marginBottom: 16, padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ fontSize: 11, color: '#00d4ff', fontWeight: 700, marginBottom: 2, fontFamily: 'monospace' }}>{title}</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{subtitle}</div>
      </div>
      <div style={{ padding: '20px', background: 'rgba(255,255,255,0.025)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)' }}>
        {children}
      </div>
    </div>
  )
}

function Btn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, padding: '12px 20px', borderRadius: 10, border: 'none',
      background: 'linear-gradient(135deg, #00d4ff, #7b2fff)',
      color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
    }}>
      {children}
    </button>
  )
}
