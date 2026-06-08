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
  const { activePlatform, platformData, isConnected, connectPlatform } = usePlatform()
  const activePlt = PLATFORMS.find(p => p.code === activePlatform)!
  const pData = platformData[activePlatform]
  const connected = isConnected(activePlatform)

  const [insights, setInsights] = useState<any[]>([])
  const [trends, setTrends] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [channel, setChannel] = useState<any>(null)
  const [videos, setVideos] = useState<any[]>([])
  const [videoTab, setVideoTab] = useState<VideoTab>('videos')

  const ytToken = (pData as any)?.accessToken
  const [ytLoading, setYtLoading] = useState(false)
  const [sugVideo, setSugVideo] = useState<any>(null)
  const [sugData, setSugData] = useState<any>(null)
  const [sugLoading, setSugLoading] = useState(false)

  const openSuggest = async (v: any) => {
    setSugVideo(v); setSugData(null); setSugLoading(true)
    try {
      const res = await apiPost('/api/videos/suggest', { title: v.title, description: v.description || '', tags: v.tags || [] })
      setSugData(res.data)
    } catch { /* show what we can */ } finally { setSugLoading(false) }
  }
  const filteredVideos = (videos || []).filter(v =>
    videoTab === 'shorts' ? v.isShort : videoTab === 'videos' ? !v.isShort : false
  )
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
          apiGet(`/api/trends?platform=${activePlt.name}`)
            .catch(() => ({ data: { trends: [] } })),
        ])
        setInsights(insRes.data.insights?.slice(0, 4) || [])
        setTrends(trendRes.data.trends?.slice(0, 5) || [])

        // Real connected-channel identity + uploads
        if (ytToken) {
          setYtLoading(true)
          apiPost('/api/analytics/youtube', { accessToken: ytToken })
            .then(r => { setChannel(r.data.channel); setVideos(r.data.videos || []) })
            .catch(() => {})
            .finally(() => setYtLoading(false))
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [activePlatform, connected, ytToken])

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

            {/* Filtered content */}
            <div className="pt-4">
              {(videoTab === 'videos' || videoTab === 'shorts') && (
                filteredVideos.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredVideos.slice(0, 6).map(v => (
                      <button key={v.id} onClick={() => openSuggest(v)}
                        className="group rounded-xl overflow-hidden bg-surf2 hover:bg-surf3 transition-colors text-left">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={v.thumbnail} alt="" className="w-full aspect-video object-cover" />
                        <div className="p-2.5">
                          <div className="text-sm text-white line-clamp-2 group-hover:text-cyan transition-colors">{v.title}</div>
                          <div className="text-xs text-muted mt-1">{fmtN(v.views)} views · {fmtN(v.likes)} likes</div>
                          <div className="text-[10px] text-cyan mt-1">Tap for SEO fixes →</div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted text-sm">
                    No {videoTab} found on this channel yet.
                  </div>
                )
              )}
              {videoTab === 'live' && (
                <div className="text-center py-8 text-muted text-sm">
                  Live streams appear here when you go live on YouTube.
                </div>
              )}
              {videoTab === 'playlists' && (
                <div className="text-center py-8 text-muted text-sm">
                  Playlist management is coming soon.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Platform Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {PLATFORMS.map(p => {
            const pd = platformData[p.code]
            const conn = isConnected(p.code as any)
            return (
              <motion.div key={p.code}
                whileHover={{ y: -2 }}
                onClick={() => {/* switch platform */}}
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
                  <button className="text-[10px] text-cyan mt-1 font-bold hover:underline">
                    Connect →
                  </button>
                )}
              </motion.div>
            )
          })}
        </div>

        {/* ── Video SEO suggestion modal ── */}
        {sugVideo && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSugVideo(null)}>
            <div className="card max-w-lg w-full max-h-[85vh] overflow-y-auto border-cyan/20"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="min-w-0">
                  <div className="text-xs text-muted uppercase tracking-wider mb-1">SEO Suggestions</div>
                  <div className="text-sm font-bold text-white">{sugVideo.title}</div>
                </div>
                <button onClick={() => setSugVideo(null)} className="text-muted hover:text-white text-lg">✕</button>
              </div>

              {sugLoading && (
                <div className="text-center py-10 text-muted text-sm">
                  <div className="loading-dots flex justify-center mb-2"><span /><span /><span /></div>
                  Analyzing this video...
                </div>
              )}

              {!sugLoading && sugData && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-surf2 rounded-xl p-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted">SEO Health</span>
                    <span className="font-display text-lg"
                      style={{ color: sugData.score >= 70 ? '#00ff88' : sugData.score >= 45 ? '#ffc740' : '#ff3366' }}>
                      {sugData.score}/100
                    </span>
                  </div>

                  {sugData.fixes?.length > 0 ? (
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2">🔧 What to fix</div>
                      <ul className="space-y-2">
                        {sugData.fixes.map((f: any, i: number) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className={`badge text-[8px] mt-0.5 ${f.severity === 'high' ? 'badge-red' : f.severity === 'medium' ? 'badge-gold' : 'badge-cyan'}`}>{f.severity}</span>
                            <div>
                              <div className="text-xs font-semibold text-white">{f.label}</div>
                              <div className="text-[11px] text-muted">{f.detail}</div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="text-xs text-green">✓ Well optimized — no major issues.</div>
                  )}

                  {sugData.suggestedTitles?.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2">✦ Better titles</div>
                      <ul className="space-y-1">
                        {sugData.suggestedTitles.map((t: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-white/80">
                            <span className="text-cyan mt-0.5">→</span> {t}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {sugData.suggestedTags?.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2">Recommended tags</div>
                      <div className="flex flex-wrap gap-1.5">
                        {sugData.suggestedTags.map((t: string) => (
                          <span key={t}
                            onClick={() => { navigator.clipboard.writeText(t); toast.success(`Copied "${t}"`) }}
                            className="badge-green text-[10px] cursor-pointer hover:brightness-125">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  <Link href="/videos">
                    <button className="btn btn-cyan w-full justify-center">Edit & save to YouTube in My Videos →</button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

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

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="card lg:col-span-2">
            <SectionHeader title="📊 Your Top Videos" subtitle="By views — real data from your channel" />
            {connected && videos.length > 0 ? (
              <div className="space-y-2.5 mt-2">
                {[...videos].sort((a, b) => b.views - a.views).slice(0, 6).map((v, i) => {
                  const max = Math.max(...videos.map(x => x.views), 1)
                  return (
                    <div key={v.id} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-muted w-4">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white truncate mb-1">{v.title}</div>
                        <div className="h-2 rounded-full bg-surf3 overflow-hidden">
                          <div className="h-full rounded-full"
                            style={{ width: `${(v.views / max) * 100}%`, background: 'linear-gradient(90deg,#00f5ff,#00ff88)' }} />
                        </div>
                      </div>
                      <span className="text-xs text-muted w-16 text-right">{fmtN(v.views)}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <EmptyState
                icon={ytLoading ? '⏳' : connected ? '🔄' : '📊'}
                title={ytLoading ? 'Loading your videos...' : connected && !ytToken ? 'Reconnect YouTube'
                       : connected ? 'No videos found' : 'Connect YouTube'}
                description={ytLoading ? 'Fetching real performance data'
                       : connected && !ytToken ? 'Your session expired — reconnect YouTube in Settings to refresh data'
                       : connected ? 'Upload videos and they will appear here'
                       : 'Link your channel to see real video stats'} />
            )}
          </div>
          <div className="card">
            <SectionHeader title="🔥 Trending Now"
              action={<Link href="/trends"><span className="text-xs text-cyan cursor-pointer">See All →</span></Link>} />
            {loading ? (
              <div className="space-y-3">
                {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : trends.length > 0 ? (
              <div className="space-y-2">
                {trends.map((t, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/5 transition-colors">
                    <div className="w-6 h-6 rounded-full bg-surf3 flex items-center justify-center
                                  text-xs font-bold text-cyan flex-shrink-0">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">{t.topic}</div>
                      <div className="text-xs text-muted">{t.growth}</div>
                    </div>
                    <div className="text-xs font-bold" style={{ color: t.viralityScore >= 80 ? '#00ff88' : '#ffc740' }}>
                      🔥 {t.viralityScore}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon="📊" title="Loading trends..." description="Fetching real-time data" />
            )}
          </div>
        </div>

        {/* AI Insights */}
        <div className="card">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan/20 to-magenta/20
                          border border-cyan/20 flex items-center justify-center text-cyan font-bold">✦</div>
            <div>
              <div className="font-bold text-white">AI {activePlt.name} Insights</div>
              <div className="text-xs text-muted">Updated in real-time</div>
            </div>
            <AIBadge />
          </div>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : insights.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {insights.map((ins, i) => (
                <div key={i} className="p-4 bg-surf2 rounded-xl border border-white/5">
                  <div className="flex items-start gap-2 mb-1.5">
                    <div className={`badge mt-0.5 flex-shrink-0 ${
                      ins.priority === 'high' ? 'badge-red' : ins.priority === 'medium' ? 'badge-gold' : 'badge-cyan'
                    }`}>{ins.priority}</div>
                    <div className="text-sm font-semibold text-white">{ins.title}</div>
                  </div>
                  <p className="text-xs text-muted leading-relaxed">{ins.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted text-sm">
              <div className="loading-dots flex justify-center mb-2"><span /><span /><span /></div>
              Generating AI insights for {activePlt.name}...
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  )
}

export default withAuth(DashboardPage)
