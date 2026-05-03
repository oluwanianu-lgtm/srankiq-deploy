// pages/dashboard.tsx
import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import DashboardLayout from '../components/layout/DashboardLayout'
import { StatCard, SectionHeader, AIBadge, EmptyState, Skeleton } from '../components/ui'
import { withAuth } from '../lib/withAuth'
import { useAuth } from '../contexts/AuthContext'
import { usePlatform, PLATFORMS } from '../contexts/PlatformContext'
import axios from 'axios'
import { FiYoutube, FiLink, FiPlay, FiEye, FiThumbsUp, FiExternalLink, FiTrendingUp } from 'react-icons/fi'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface ChannelVideo {
  id: string
  title: string
  thumbnail: string
  views: number
  likes: number
  publishedAt: string
  duration: string
  url: string
}

function DashboardPage() {
  const { profile } = useAuth()
  const { activePlatform, platformData, isConnected } = usePlatform()
  const activePlt = PLATFORMS.find(p => p.code === activePlatform)!
  const pData = platformData[activePlatform]
  const connected = isConnected(activePlatform)

  const [videos, setVideos] = useState<ChannelVideo[]>([])
  const [channelInfo, setChannelInfo] = useState<any>(null)
  const [loadingVideos, setLoadingVideos] = useState(false)
  const [insights, setInsights] = useState<any[]>([])
  const [loadingInsights, setLoadingInsights] = useState(false)

  const greeting = (() => {
    const h = new Date().getHours()
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
  })()

  const formatNum = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return `${n}`
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    const diff = Math.floor((Date.now() - d.getTime()) / 86400000)
    if (diff === 0) return 'Today'
    if (diff === 1) return 'Yesterday'
    if (diff < 7) return `${diff} days ago`
    if (diff < 30) return `${Math.floor(diff / 7)}w ago`
    if (diff < 365) return `${Math.floor(diff / 30)}mo ago`
    return `${Math.floor(diff / 365)}y ago`
  }

  useEffect(() => {
    if (activePlatform === 'youtube' && connected) {
      loadUserVideos()
      loadInsights()
    }
  }, [activePlatform, connected])

  const loadUserVideos = async () => {
    setLoadingVideos(true)
    try {
      const res = await axios.get('/api/youtube/my-videos')
      setVideos(res.data.videos || [])
      setChannelInfo(res.data.channel || null)
    } catch {
      // silently fail
    } finally {
      setLoadingVideos(false)
    }
  }

  const loadInsights = async () => {
    setLoadingInsights(true)
    try {
      const res = await axios.post('/api/ai/insights', {
        platform: activePlt.name,
        subscribers: pData?.subscribers,
        views: pData?.views,
      }).catch(() => ({ data: { insights: [] } }))
      setInsights(res.data.insights?.slice(0, 4) || [])
    } finally {
      setLoadingInsights(false)
    }
  }

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
          <div className="flex gap-2">
            <Link href="/keywords">
              <button className="btn btn-ghost btn-sm gap-1.5">🔍 Keyword Research</button>
            </Link>
            <Link href="/ai-tools">
              <button className="btn btn-cyan btn-sm gap-1.5">✦ AI Generate</button>
            </Link>
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
                  <Link href="/settings">
                    <button className="text-[10px] text-cyan mt-1 font-bold hover:underline">
                      Connect →
                    </button>
                  </Link>
                )}
              </motion.div>
            )
          })}
        </div>

        {/* Real Stats from channel */}
        {connected && channelInfo && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="card text-center">
              <div className="text-2xl font-display text-cyan">{formatNum(channelInfo.subscriberCount || 0)}</div>
              <div className="text-xs text-muted mt-1">Subscribers</div>
            </div>
            <div className="card text-center">
              <div className="text-2xl font-display text-green">{formatNum(channelInfo.viewCount || 0)}</div>
              <div className="text-xs text-muted mt-1">Total Views</div>
            </div>
            <div className="card text-center">
              <div className="text-2xl font-display text-gold">{channelInfo.videoCount || 0}</div>
              <div className="text-xs text-muted mt-1">Total Videos</div>
            </div>
            <div className="card text-center">
              <div className="text-2xl font-display text-magenta">
                {videos.length > 0 ? formatNum(Math.round(videos.reduce((a, v) => a + v.views, 0) / videos.length)) : '—'}
              </div>
              <div className="text-xs text-muted mt-1">Avg Views / Video</div>
            </div>
          </div>
        )}

        {/* Connect CTA if not connected */}
        {!connected && (
          <div className="card border-cyan/20 bg-cyan/5">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-cyan/20 flex items-center justify-center">
                <FiLink className="text-cyan" size={18} />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-white">Connect {activePlt.name} to see your channel</div>
                <div className="text-sm text-muted">Link your account to see your videos, views, and get AI optimization tips</div>
              </div>
              <Link href="/settings">
                <button className="btn btn-cyan btn-sm">Connect Now →</button>
              </Link>
            </div>
          </div>
        )}

        {/* My Channel Videos */}
        {connected && (
          <div className="card">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red/20 flex items-center justify-center">
                  <FiYoutube className="text-red-400" size={16} />
                </div>
                <div>
                  <div className="font-bold text-white">My Channel Videos</div>
                  <div className="text-xs text-muted">Your latest uploads — click Optimize to improve ranking</div>
                </div>
              </div>
              {channelInfo?.title && (
                <span className="text-xs text-muted bg-surf2 px-3 py-1 rounded-full border border-white/10">
                  {channelInfo.title}
                </span>
              )}
            </div>

            {loadingVideos ? (
              <div className="space-y-3">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="flex gap-4 p-3 bg-surf2 rounded-xl animate-pulse">
                    <div className="w-32 h-20 bg-white/5 rounded-lg flex-shrink-0" />
                    <div className="flex-1 space-y-2 pt-1">
                      <div className="h-4 bg-white/5 rounded w-3/4" />
                      <div className="h-3 bg-white/5 rounded w-1/2" />
                      <div className="h-3 bg-white/5 rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : videos.length > 0 ? (
              <div className="space-y-3">
                {videos.map((video, i) => (
                  <motion.div key={video.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex gap-4 p-3 bg-surf2 rounded-xl border border-white/5
                              hover:border-white/10 transition-all group">
                    {/* Thumbnail */}
                    <div className="relative flex-shrink-0 w-32 h-20 rounded-lg overflow-hidden bg-black/30">
                      <img src={video.thumbnail} alt={video.title}
                        className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100
                                    transition-opacity flex items-center justify-center">
                        <FiPlay className="text-white" size={20} />
                      </div>
                      {video.duration && (
                        <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px]
                                       px-1.5 py-0.5 rounded font-mono">{video.duration}</span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white truncate mb-1 group-hover:text-cyan transition-colors">
                        {video.title}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted mb-2">
                        <span className="flex items-center gap-1">
                          <FiEye size={11} /> {formatNum(video.views)} views
                        </span>
                        <span className="flex items-center gap-1">
                          <FiThumbsUp size={11} /> {formatNum(video.likes)}
                        </span>
                        <span>{formatDate(video.publishedAt)}</span>
                      </div>
                      {/* Engagement bar */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-cyan to-green"
                            style={{ width: `${Math.min(100, (video.likes / Math.max(video.views, 1)) * 500)}%` }} />
                        </div>
                        <span className="text-[10px] text-muted">
                          {video.views > 0 ? ((video.likes / video.views) * 100).toFixed(1) : 0}% engagement
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 flex-shrink-0 items-end justify-center">
                      <Link href={`/keywords?optimize=${encodeURIComponent(video.title)}`}>
                        <button className="btn btn-cyan btn-sm gap-1.5 whitespace-nowrap">
                          <FiTrendingUp size={11} /> Optimize
                        </button>
                      </Link>
                      <a href={video.url} target="_blank" rel="noopener noreferrer">
                        <button className="btn btn-ghost btn-sm gap-1.5 text-xs">
                          <FiExternalLink size={11} /> View
                        </button>
                      </a>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <EmptyState icon="📹" title="No videos found"
                description="We couldn't find any videos on your channel. Upload your first video to get started." />
            )}
          </div>
        )}

        {/* AI Insights */}
        {connected && (
          <div className="card">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan/20 to-magenta/20
                            border border-cyan/20 flex items-center justify-center text-cyan font-bold">✦</div>
              <div>
                <div className="font-bold text-white">AI Channel Insights</div>
                <div className="text-xs text-muted">Powered by Gemini AI — personalized recommendations</div>
              </div>
              <AIBadge />
            </div>
            {loadingInsights ? (
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
                Generating AI insights...
              </div>
            )}
          </div>
        )}

      </div>
    </DashboardLayout>
  )
}

export default withAuth(DashboardPage)
