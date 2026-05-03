// pages/settings.tsx
import React, { useState } from 'react'
import { motion } from 'framer-motion'
import DashboardLayout from '../components/layout/DashboardLayout'
import { withAuth } from '../lib/withAuth'
import { usePlatform, PLATFORMS } from '../contexts/PlatformContext'
import { useAuth } from '../contexts/AuthContext'
import { Spinner } from '../components/ui'
import toast from 'react-hot-toast'
import { FiUser, FiLink, FiShield, FiBell, FiCheck } from 'react-icons/fi'

const TABS = ['Profile', 'Connections', 'Notifications', 'Security']

function SettingsPage() {
  const { profile, updateUserProfile, user } = useAuth()
  const { platformData, connectPlatform, disconnectPlatform, isConnected } = usePlatform()
  const [tab, setTab] = useState('Profile')
  const [saving, setSaving] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [form, setForm] = useState({
    firstName: profile?.firstName || '',
    lastName: profile?.lastName || '',
    displayName: profile?.displayName || '',
  })

  const saveProfile = async () => {
    setSaving(true)
    try {
      await updateUserProfile(form)
      toast.success('Profile updated!')
    } catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  const connectYouTube = () => {
    const google = (window as any).google
    if (!google?.accounts?.oauth2) {
      toast.error('Google Sign-In not loaded yet. Please refresh and try again.')
      return
    }

    setConnecting(true)

    const client = google.accounts.oauth2.initTokenClient({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      scope: [
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/youtube.upload',
        'https://www.googleapis.com/auth/yt-analytics.readonly',
      ].join(' '),
      callback: async (resp: any) => {
        if (resp.error) {
          toast.error(`Auth error: ${resp.error}`)
          setConnecting(false)
          return
        }
        if (!resp.access_token) {
          toast.error('No access token received')
          setConnecting(false)
          return
        }

        try {
          const res = await fetch('/api/analytics/youtube', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessToken: resp.access_token }),
          })

          if (!res.ok) {
            const err = await res.json()
            throw new Error(err.error || 'Failed to fetch channel data')
          }

          const data = await res.json()
          const channel = data.channel

          if (!channel) throw new Error('No channel data returned')

          // Save to Firebase — including channelId so dashboard can fetch videos
          await connectPlatform('yt', {
            connected: true,
            accessToken: resp.access_token,
            channelId: channel.id,           // ← critical: save the real channel ID
            channelName: channel.name,
            subscribers: channel.subscribers,
            views: channel.views,
            videoCount: channel.videos,
            profilePic: channel.thumbnail,
          })

          toast.success(`✅ YouTube connected! Welcome, ${channel.name}`)
        } catch (err: any) {
          toast.error(err.message || 'Could not fetch channel data')
        } finally {
          setConnecting(false)
        }
      },
      error_callback: (err: any) => {
        toast.error('Google auth cancelled')
        setConnecting(false)
      },
    })

    client.requestAccessToken()
  }

  const handleConnect = (code: string) => {
    if (code === 'yt') { connectYouTube(); return }
    toast(`${PLATFORMS.find(p => p.code === code)?.name} OAuth coming soon!`, { icon: '🚧' })
  }

  return (
    <DashboardLayout title="Settings">
      <div className="p-6 max-w-3xl">
        <h1 className="text-xl font-bold mb-6">⚙️ Settings</h1>

        {/* Tabs */}
        <div className="flex gap-1 bg-surf2 p-1 rounded-xl w-fit mb-6">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all
                         ${tab === t ? 'bg-white/10 text-white' : 'text-muted hover:text-white'}`}>
              {t}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {tab === 'Profile' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
            <div className="card">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan to-magenta
                              flex items-center justify-center text-black text-2xl font-display">
                  {profile?.firstName?.charAt(0) || 'C'}
                </div>
                <div>
                  <div className="font-bold text-white text-lg">{profile?.displayName}</div>
                  <div className="text-muted text-sm">{profile?.email}</div>
                  <div className="badge-cyan text-[10px] mt-1 capitalize">{profile?.plan} Plan</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="label">First Name</label>
                  <input className="inp" value={form.firstName}
                    onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Last Name</label>
                  <input className="inp" value={form.lastName}
                    onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
                </div>
              </div>
              <div className="mb-4">
                <label className="label">Display Name</label>
                <input className="inp" value={form.displayName}
                  onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} />
              </div>
              <div className="mb-4">
                <label className="label">Email</label>
                <input value={profile?.email || ''} disabled className="inp opacity-50 cursor-not-allowed" />
              </div>

              <button onClick={saveProfile} disabled={saving} className="btn btn-cyan gap-2">
                {saving ? <Spinner size={15} /> : <FiCheck size={15} />}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </motion.div>
        )}

        {/* Connections Tab */}
        {tab === 'Connections' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3" id="connect">
            <p className="text-muted text-sm mb-4">
              Connect your social accounts to unlock real analytics, SEO scanning, and AI optimization.
            </p>
            {PLATFORMS.map(p => {
              const conn = isConnected(p.code as any)
              const pd = platformData[p.code as any]
              return (
                <div key={p.code} className="card flex items-center gap-4 border-l-4"
                  style={{ borderLeftColor: conn ? p.color : 'transparent' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                    style={{ background: p.color + '20', color: p.color }}>
                    {p.icon}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-white">{p.name}</div>
                    {conn && pd?.channelName ? (
                      <div className="text-xs text-muted">
                        {pd.channelName} · {pd.subscribers
                          ? `${(pd.subscribers / 1000).toFixed(1)}K subscribers`
                          : 'Connected'}
                        {pd.channelId && (
                          <span className="ml-2 text-green text-[10px]">✓ ID saved</span>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-muted">Not connected</div>
                    )}
                  </div>
                  {conn ? (
                    <div className="flex items-center gap-2">
                      <span className="badge-green text-[10px]">✓ Connected</span>
                      <button onClick={() => disconnectPlatform(p.code as any)}
                        className="btn btn-ghost btn-sm text-red/70 hover:text-red">
                        Disconnect
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleConnect(p.code)}
                      disabled={connecting && p.code === 'yt'}
                      className="btn btn-ghost btn-sm gap-1.5"
                      style={{ borderColor: p.color + '40', color: p.color }}>
                      {connecting && p.code === 'yt'
                        ? <><Spinner size={12} /> Connecting...</>
                        : <><FiLink size={12} /> Connect</>
                      }
                    </button>
                  )}
                </div>
              )
            })}
            <div className="card bg-surf2/50 text-center py-5 text-xs text-muted">
              🔒 Your tokens are encrypted and stored securely. We never post on your behalf without permission.
            </div>
          </motion.div>
        )}

        {/* Notifications Tab */}
        {tab === 'Notifications' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card space-y-4">
            <h3 className="font-bold text-white">Notification Preferences</h3>
            {[
              { label: 'Weekly analytics report', desc: 'Get a weekly summary of your performance' },
              { label: 'Trending topics alert', desc: 'Notify when topics in your niche go viral' },
              { label: 'Keyword ranking changes', desc: 'Alert when your keyword rankings change' },
              { label: 'Competitor activity', desc: 'Notify when tracked competitors post new content' },
              { label: 'AI insight reports', desc: 'Daily AI-generated optimization suggestions' },
            ].map((n, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                <div>
                  <div className="text-sm font-medium text-white">{n.label}</div>
                  <div className="text-xs text-muted">{n.desc}</div>
                </div>
                <button className="w-12 h-6 rounded-full bg-cyan/30 border border-cyan/40 relative transition-all">
                  <div className="w-4 h-4 rounded-full bg-cyan absolute right-1 top-1" />
                </button>
              </div>
            ))}
          </motion.div>
        )}

        {/* Security Tab */}
        {tab === 'Security' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="card">
              <h3 className="font-bold text-white mb-4">Change Password</h3>
              <div className="space-y-3">
                <div><label className="label">Current Password</label><input type="password" className="inp" /></div>
                <div><label className="label">New Password</label><input type="password" className="inp" /></div>
                <div><label className="label">Confirm New Password</label><input type="password" className="inp" /></div>
                <button className="btn btn-cyan">Update Password</button>
              </div>
            </div>
            <div className="card border-red/20">
              <h3 className="font-bold text-red mb-2">Danger Zone</h3>
              <p className="text-muted text-sm mb-4">These actions are permanent and cannot be undone.</p>
              <button className="btn btn-ghost text-red border-red/20 hover:bg-red/10">Delete Account</button>
            </div>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default withAuth(SettingsPage)
