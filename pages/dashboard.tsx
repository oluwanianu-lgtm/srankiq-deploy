// pages/dashboard.tsx
import { apiPost, apiGet } from '../lib/api'
import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import DashboardLayout from '../components/layout/DashboardLayout'
import { StatCard, SectionHeader, AIBadge, EmptyState, Skeleton, RankBadge } from '../components/ui'
import { withAuth } from '../lib/withAuth'
import { useAuth } from '../contexts/AuthContext'
import { usePlatform, PLATFORMS } from '../contexts/PlatformContext'
import { FiTrendingUp, FiYoutube, FiLink, FiPlay } from 'react-icons/fi'
import Link from 'next/link'
import { useRouter } from 'next/router'
import VideoEditList from '../components/VideoEditList'
import toast from 'react-hot-toast'

const fmtN = (n: number) =>
  n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : String(n || 0)

const VIDEO_TABS = [
  { key: 'videos', label: 'Videos' },
  { key: 'shorts', label: 'Shorts' },
  { key: 'live', label: 'Live' },
  { key: 'playlists', label: 'Playlists' },
] as const
type VideoTab = typeof VIDEO_TABS[number]['key']

function DashboardPage() {
  const { profile } = useAuth()
  const { activePlatform, setActivePlatform, platformData, isConnected, connectPlatform } = usePlatform()
  const router = useRouter()
  const activePlt = PLATFORMS.find(p => p.code === activePlatform)!
  const pData = platformData[activePlatform]
  const connected = isConnected(activePlatform)

  const [insights, setInsights] = useState<any[]>([])
  const [trends, setTrends] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [channel, setChannel] = useState<any>(null)
  const [videos, setVideos] = useState<any[]>([])
  const [videoTab, setVideoTab] = useState<VideoTab>('videos')
  const [niche, setNiche] = useState('')
  const [editingNiche, setEditingNiche] = useState(false)

  // Auto-detect niche from the most common tag across the user's videos
  useEffect(() => {
    if (niche || !videos.length) return
    const freq: Record<string, number> = {}
    videos.forEach(v => (v.tags || []).forEach((t: string) => {
      const k = t.toLowerCase().trim()
      if (k.length > 2 && k.length < 30) freq[k] = (freq[k] || 0) + 1
    }))
    const top = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]
    if (top) setNiche(top[0])
    else if (channel?.name) setNiche(channel.name)
  }, [videos, channel]) // eslint-disable-line

  const ytToken = (pData as any)?.accessToken
  const [ytLoading, setYtLoading] = useState(false)

  // Lazy-loaded content per tab
  const [tabData, setTabData] = useState<Record<string, any[]>>({})
  const [tabLoading, setTabLoading] = useState<string>('')

  const loadTab = async (tab: VideoTab) => {
    if (!ytToken || tabData[tab]) return // cached
    setTabLoading(tab)
    try {
      const type = tab === 'shorts' ? 'videos' : tab // shorts come from the same uploads call
      const res = await apiPost('/api/videos/content', { accessToken: ytToken, type })
      // videos+shorts share the uploads response; cache both off one call
      if (tab === 'videos' || tab === 'shorts') {
        setTabData(d => ({ ...d, videos: res.data.items || [], shorts: res.data.items || [] }))
        if (!videos.length) setVideos(res.data.items || [])
      } else {
        setTabData(d => ({ ...d, [tab]: res.data.items || [] }))
      }
    } catch (e: any) {
      if (e?.response?.data?.error === 'TOKEN_EXPIRED') toast.error('Session expired — reconnect YouTube in Settings')
    } finally { setTabLoading('') }
  }

  // Load the active tab when it changes (and on first connect)
  useEffect(() => {
    if (connected && ytToken) loadTab(videoTab)
  }, [videoTab, connected, ytToken]) // eslint-disable-line

  const currentItems = tabData[videoTab] || []
  const filteredVideos = (videoTab === 'shorts'
    ? currentItems.filter((v: any) => v.durationSec > 0 && v.durationSec <= 60)
    : videoTab === 'videos'
    ? currentItems.filter((v: any) => v.durationSec > 60)
    : currentItems)
  const realAvgViews = videos.length
    ? Math.round(videos.reduce((s, v) => s + (v.views || 0), 0) / videos.length) : 0
  const realEngagement = videos.length
    ? (videos.reduce((s, v) => s + ((v.likes + v.comments) / Math.max(1, v.views)), 0) / videos.length * 100) : 0

  const greeting = (() => {
    const h = new Date().getHours()
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
  })()

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [insRes, trendRes] = await Promise.all([
          apiPost('/api/ai/insights', {
            platform: activePlt.name,
            subscribers: pData?.subscribers,
            views: pData?.views,
          }).catch(() => ({ data: { insights: [] } })),
          apiGet(`/api/trends?platform=${activePlt.name}${niche ? `&q=${encodeURIComponent(niche)}` : ''}`)
            .catch(() => ({ data: { trends: [] } })),
        ])
        setInsights(insRes.data.insights?.slice(0, 4) || [])
        setTrends(trendRes.data.trends?.slice(0, 5) || [])

        // Real connected-channel identity + uploads
        if (ytToken) {
          setYtLoading(true)
          apiPost('/api/analytics/youtube', { accessToken: ytToken })
            .then(r => { setChannel(r.data.channel) })
            .catch(() => {})
            .finally(() => setYtLoading(false))
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [activePlatform, connected, ytToken, niche])

  return (
    <DashboardLayout title="Dashboard">
      <div className="p-6 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {greeting}, {profile?.firstName || 'Creator'} 👋
            </h1>
            <p className="text-muted text-sm mt-1">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Platform Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {PLATFORMS.map(p => {
            const pd = platformData[p.code]
            const conn = isConnected(p.code as any)
            return (
              <motion.div key={p.code}
                whileHover={{ y: -2 }}
                onClick={() => { if (conn) { setActivePlatform(p.code as any) } else { router.push('/settings') } }}
                className={`card cursor-pointer border-b-2 transition-all
                           ${activePlatform === p.code ? 'border-white/30 bg-white/10' : 'border-transparent hover:border-white/10'}`}
                style={{ borderBottomColor: activePlatform === p.code ? p.color : undefined }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold" style={{ color: p.color }}>{p.icon}</span>
                  {conn && <span className="badge-green text-[9px]">Live</span>}
                </div>
                <div className="text-xs text-muted mb-1">{p.name}</div>
                <div className="text-xl font-display" style={{ color: p.color }}>
                  {conn && pd?.subscribers ? `${(pd.subscribers / 1000).toFixed(1)}K` : '—'}
                </div>
                {!conn && (
                  <button onClick={(ev) => { ev.stopPropagation(); router.push('/settings') }}
                    className="text-[10px] text-cyan mt-1 font-bold hover:underline">
                    Connect →
                  </button>
                )}
              </motion.div>
            )
          })}
        </div>


        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard label="Subscribers" loading={loading}
            value={connected && channel ? fmtN(channel.subscribers) : '—'} color="#00f5ff" />
          <StatCard label="Total Views" loading={loading}
            value={connected && channel ? fmtN(channel.views) : '—'} color="#00ff88" />
          <StatCard label="Videos" loading={loading}
            value={connected && channel ? String(channel.videos) : '—'} color="#ffc740" />
          <StatCard label="Avg Views / Video" loading={loading}
            value={connected && videos.length ? fmtN(realAvgViews) : '—'} color="#ff0090" />
          <StatCard label="Avg Engagement" loading={loading}
            value={connected && videos.length ? `${realEngagement.toFixed(1)}%` : '—'} color="#b4ff00" />
        </div>

        {/* Connect CTA if not connected */}
        {!connected && (
          <div className="card border-cyan/20 bg-cyan/5">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-cyan/20 flex items-center justify-center">
                <FiLink className="text-cyan" size={18} />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-white">Connect {activePlt.name} to see real data</div>
                <div className="text-sm text-muted">Link your account to get live subscriber counts, views, and analytics</div>
              </div>
              <Link href="/settings">
                <button className="btn btn-cyan btn-sm">Connect Now →</button>
              </Link>
            </div>
          </div>
        )}

        {/* ── Connected channel box (real identity) ── */}
        {connected && channel && (
          <div className="card relative overflow-hidden border-b-2" style={{ borderBottomColor: '#ff0000' }}>
            <div className="flex items-center gap-4">
              {channel.thumbnail ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={channel.thumbnail} alt={channel.name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-white/10" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-surf3 flex items-center justify-center text-2xl">📺</div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white truncate">{channel.name}</h2>
                  <span className="badge-green text-[9px] flex items-center gap-1">● LIVE</span>
                </div>
                <div className="text-sm text-muted">
                  {channel.customUrl ? channel.customUrl : ''} · {fmtN(channel.subscribers)} subscribers · {channel.videos} videos
                </div>
              </div>
              <a href={channel.customUrl ? `https://youtube.com/${channel.customUrl}` : `https://youtube.com/channel/${channel.id}`}
                target="_blank" rel="noopener noreferrer"
                className="btn btn-ghost btn-sm hidden sm:flex">View channel ↗</a>
            </div>

            {/* YouTube-style tab row */}
            <div className="flex items-center gap-1 mt-4 border-b border-white/8 -mx-5 px-5">
              {VIDEO_TABS.map(t => (
                <button key={t.key} onClick={() => setVideoTab(t.key)}
                  className={`px-4 py-2 text-sm font-semibold transition-colors relative
                    ${videoTab === t.key ? 'text-white' : 'text-muted hover:text-white/80'}`}>
                  {t.label}
                  {videoTab === t.key && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full" />
                  )}
                </button>
              ))}
            </div>

            {/* Filtered content — full editor list (My Videos experience inline) */}
            <div className="pt-4">
              {tabLoading === videoTab ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="loading-dots flex justify-center mb-3"><span /><span /><span /></div>
                  <p className="text-muted text-sm">Loading {videoTab}...</p>
                </div>
              ) : (
                <>
                  {(videoTab === 'videos' || videoTab === 'shorts') && (
                    <VideoEditList videos={filteredVideos} accessToken={ytToken}
                      onVideoUpdated={(uv) => {
                        setVideos(vs => vs.map(x => x.id === uv.id ? { ...x, ...uv } : x))
                        setTabData(d => ({
                          ...d,
                          videos: (d.videos || []).map((x: any) => x.id === uv.id ? { ...x, ...uv } : x),
                          shorts: (d.shorts || []).map((x: any) => x.id === uv.id ? { ...x, ...uv } : x),
                        }))
                      }} />
                  )}

                  {videoTab === 'live' && (
                    filteredVideos.length > 0 ? (
                      <VideoEditList videos={filteredVideos} accessToken={ytToken} />
                    ) : (
                      <div className="text-center py-8 text-muted text-sm">No live streams found on this channel.</div>
                    )
                  )}

                  {videoTab === 'playlists' && (
                    filteredVideos.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {filteredVideos.map((p: any) => (
                          <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer"
                            className="group rounded-xl overflow-hidden bg-surf2 hover:bg-surf3 transition-colors">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            {p.thumbnail && <img src={p.thumbnail} alt="" className="w-full aspect-video object-cover" />}
                            <div className="p-2.5">
                              <div className="text-sm text-white line-clamp-2 group-hover:text-cyan transition-colors">{p.title}</div>
                              <div className="text-xs text-muted mt-1">{p.itemCount} videos</div>
                            </div>
                          </a>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted text-sm">No playlists found on this channel.</div>
                    )
                  )}
                </>
              )}
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  )
}

export default withAuth(DashboardPage)
