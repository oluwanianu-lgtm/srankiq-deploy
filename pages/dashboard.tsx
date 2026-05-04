// pages/dashboard.tsx
import React, { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import DashboardLayout from '../components/layout/DashboardLayout'
import { AIBadge, EmptyState, Skeleton } from '../components/ui'
import { withAuth } from '../lib/withAuth'
import { useAuth } from '../contexts/AuthContext'
import { usePlatform, PLATFORMS } from '../contexts/PlatformContext'
import axios from 'axios'
import {
  FiYoutube, FiLink, FiPlay, FiEye, FiThumbsUp, FiExternalLink,
  FiTrendingUp, FiChevronDown, FiChevronUp, FiEdit3, FiCheck, FiX
} from 'react-icons/fi'
import Link from 'next/link'
import { useRouter } from 'next/router'
import toast from 'react-hot-toast'

function formatNum(n: number) {
  if (n >= 1_000_000) return `${(n/1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n/1_000).toFixed(1)}K`
  return `${n}`
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const diff = Math.floor((Date.now() - d.getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return `${diff} days ago`
  if (diff < 30) return `${Math.floor(diff/7)}w ago`
  if (diff < 365) return `${Math.floor(diff/30)}mo ago`
  return `${Math.floor(diff/365)}y ago`
}

function VideoOptimizePanel({ video, onClose }: { video: any; onClose: () => void }) {
  const [loading, setLoading] = useState(true)
  const [suggestions, setSuggestions] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await axios.post('/api/ai/optimize-video', {
          title: video.title,
          description: video.description,
          tags: video.tags,
          views: video.views,
          likes: video.likes,
        })
        setSuggestions(res.data)
      } catch {
        setSuggestions(null)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [video.id])

  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
      <div className="mt-3 p-4 bg-surf3 rounded-xl border border-cyan/10 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-cyan flex items-center gap-2">
            ✦ AI Optimization Suggestions
          </h4>
          <button onClick={onClose} className="text-muted hover:text-white">
            <FiX size={14} />
          </button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-8 bg-white/5 rounded animate-pulse" />)}
          </div>
        ) : suggestions ? (
          <div className="space-y-3">
            {/* SEO Score */}
            <div className="flex items-center gap-3 p-2.5 bg-surf2 rounded-lg">
              <div className="text-xs text-muted">Current SEO Score</div>
              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-cyan to-green"
                  style={{ width: `${suggestions.seoScore}%` }} />
              </div>
              <div className="text-sm font-bold" style={{
                color: suggestions.seoScore >= 75 ? '#00ff88' : suggestions.seoScore >= 50 ? '#ffc740' : '#ff0090'
              }}>{suggestions.seoScore}/100</div>
            </div>

            {/* Suggested Keywords */}
            {suggestions.suggestedKeywords?.length > 0 && (
              <div>
                <div className="text-xs text-muted mb-2 font-semibold uppercase tracking-wider">
                  Suggested Keywords to Add
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.suggestedKeywords.map((kw: string, i: number) => (
                    <button key={i}
                      onClick={() => {
                        navigator.clipboard.writeText(kw)
                        toast.success(`Copied "${kw}"`)
                      }}
                      className="text-[10px] px-2.5 py-1 rounded-full bg-cyan/10 text-cyan
                                border border-cyan/20 hover:bg-cyan/20 transition-colors">
                      + {kw}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested Title */}
            {suggestions.suggestedTitle && (
              <div>
                <div className="text-xs text-muted mb-1.5 font-semibold uppercase tracking-wider">Better Title</div>
                <div className="p-2.5 bg-surf2 rounded-lg text-sm text-white/80 border border-white/5">
                  {suggestions.suggestedTitle}
                  <button onClick={() => { navigator.clipboard.writeText(suggestions.suggestedTitle); toast.success('Title copied!') }}
                    className="ml-2 text-cyan text-xs hover:underline">Copy</button>
                </div>
                <div className="text-[10px] text-muted mt-1">{suggestions.suggestedTitle?.length} chars
                  {suggestions.suggestedTitle?.length >= 55 && suggestions.suggestedTitle?.length <= 70
                    ? <span className="text-green ml-1">✓ Optimal length</span>
                    : <span className="text-gold ml-1">Aim for 55–70 chars</span>}
                </div>
              </div>
            )}

            {/* Suggested Description snippet */}
            {suggestions.descriptionTip && (
              <div>
                <div className="text-xs text-muted mb-1.5 font-semibold uppercase tracking-wider">Description Tip</div>
                <p className="text-xs text-white/70 leading-relaxed p-2.5 bg-surf2 rounded-lg border border-white/5">
                  {suggestions.descriptionTip}
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 pt-1">
              <button onClick={() => router.push(`/ai-tools?topic=${encodeURIComponent(video.title)}`)}
                className="btn btn-cyan btn-sm gap-1.5 flex-1 justify-center">
                <FiTrendingUp size={12} /> Generate New Titles
              </button>
              <button onClick={() => router.push(`/keywords?optimize=${encodeURIComponent(video.title)}`)}
                className="btn btn-ghost btn-sm gap-1.5 flex-1 justify-center">
                🔍 Find Keywords
              </button>
            </div>
          </div>
        ) : (
          <p className="text-muted text-sm">Could not load suggestions. Try again.</p>
        )}
      </div>
    </motion.div>
  )
}

function DashboardPage() {
  const { profile } = useAuth()
  const { activePlatform, platformData, isConnected } = usePlatform()
  const activePlt = PLATFORMS.find(p => p.code === activePlatform)!
  const pData = platformData[activePlatform]
  const connected = isConnected(activePlatform)

  const [videos, setVideos] = useState<any[]>([])
  const [channelInfo, setChannelInfo] = useState<any>(null)
  const [loadingVideos, setLoadingVideos] = useState(false)
  const [insights, setInsights] = useState<any[]>([])
  const [loadingInsights, setLoadingInsights] = useState(false)
  const [expandedVideo, setExpandedVideo] = useState<string | null>(null)

  const greeting = (() => {
    const h = new Date().getHours()
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
  })()

  useEffect(() => {
    if (activePlatform === 'yt' && connected) {
      loadUserVideos()
      loadInsights()
    }
  }, [activePlatform, connected])

  const loadUserVideos = async () => {
    setLoadingVideos(true)
    try {
      const ytData = platformData['yt']
      if (!ytData?.channelId && !ytData?.accessToken) {
        setLoadingVideos(false)
        return
      }
      const res = await axios.post('/api/youtube/my-videos', {
        channelId: ytData?.channelId,
        accessToken: ytData?.accessToken,
      })
      setVideos(res.data.videos || [])
      setChannelInfo(res.data.channel || null)
    } catch {
      // silent
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
              <motion.div key={p.code} whileHover={{ y: -2 }}
                className={`card cursor-pointer border-b-2 transition-all
                           ${activePlatform === p.code ? 'border-white/30 bg-white/10' : 'border-transparent hover:border-white/10'}`}
                style={{ borderBottomColor: activePlatform === p.code ? p.color : undefined }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold" style={{ color: p.color }}>{p.icon}</span>
                  {conn && <span className="badge-green text-[9px]">Live</span>}
                </div>
                {/* Channel thumbnail if connected */}
                {conn && pd?.profilePic && p.code === 'yt' && (
                  <a href={pd?.channelUrl || '#'} target="_blank" rel="noopener noreferrer">
                    <img src={pd.profilePic} alt="Channel"
                      className="w-8 h-8 rounded-full border border-white/20 mb-1.5 hover:ring-2 hover:ring-cyan transition-all" />
                  </a>
                )}
                <div className="text-xs text-muted mb-1">{p.name}</div>
                <div className="text-xl font-display" style={{ color: p.color }}>
                  {conn && pd?.subscribers ? formatNum(pd.subscribers) : '—'}
                </div>
                {!conn && (
                  <Link href="/settings">
                    <button className="text-[10px] text-cyan mt-1 font-bold hover:underline">Connect →</button>
                  </Link>
                )}
              </motion.div>
            )
          })}
        </div>

        {/* Real channel stats */}
        {connected && channelInfo && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Subscribers', value: formatNum(channelInfo.subscriberCount || 0), color: 'text-cyan' },
              { label: 'Total Views', value: formatNum(channelInfo.viewCount || 0), color: 'text-green' },
              { label: 'Total Videos', value: channelInfo.videoCount || 0, color: 'text-gold' },
              { label: 'Avg Views', value: videos.length > 0 ? formatNum(Math.round(videos.reduce((a, v) => a + v.views, 0) / videos.length)) : '—', color: 'text-magenta' },
            ].map(s => (
              <div key={s.label} className="card text-center">
                <div className={`text-2xl font-display ${s.color}`}>{s.value}</div>
                <div className="text-xs text-muted mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Connect CTA */}
        {!connected && (
          <div className="card border-cyan/20 bg-cyan/5">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-cyan/20 flex items-center justify-center">
                <FiLink className="text-cyan" size={18} />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-white">Connect {activePlt.name} to see your channel</div>
                <div className="text-sm text-muted">Link your account to see all your videos and get AI optimization tips</div>
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
                  <div className="text-xs text-muted">Click Optimize to get AI keyword suggestions & title improvements</div>
                </div>
              </div>
              {channelInfo?.title && (
                <a href={channelInfo.channelUrl} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-muted bg-surf2 px-3 py-1 rounded-full border border-white/10 hover:text-cyan hover:border-cyan/20 transition-colors">
                  {channelInfo.title} ↗
                </a>
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
                    </div>
                  </div>
                ))}
              </div>
            ) : videos.length > 0 ? (
              <div className="space-y-3">
                {videos.map((video, i) => (
                  <motion.div key={video.id}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="p-3 bg-surf2 rounded-xl border border-white/5 hover:border-white/10 transition-all">

                    <div className="flex gap-4 group">
                      {/* Thumbnail */}
                      <div className="relative flex-shrink-0 w-32 h-20 rounded-lg overflow-hidden bg-black/30">
                        <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
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
                          <span className="flex items-center gap-1"><FiEye size={11} /> {formatNum(video.views)}</span>
                          <span className="flex items-center gap-1"><FiThumbsUp size={11} /> {formatNum(video.likes)}</span>
                          <span>{formatDate(video.publishedAt)}</span>
                        </div>
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
                        <button
                          onClick={() => setExpandedVideo(expandedVideo === video.id ? null : video.id)}
                          className="btn btn-cyan btn-sm gap-1.5 whitespace-nowrap">
                          <FiTrendingUp size={11} /> Optimize
                          {expandedVideo === video.id ? <FiChevronUp size={10} /> : <FiChevronDown size={10} />}
                        </button>
                        <a href={video.url} target="_blank" rel="noopener noreferrer">
                          <button className="btn btn-ghost btn-sm gap-1.5 text-xs">
                            <FiExternalLink size={11} /> View
                          </button>
                        </a>
                      </div>
                    </div>

                    {/* Optimize Panel */}
                    <AnimatePresence>
                      {expandedVideo === video.id && (
                        <VideoOptimizePanel
                          video={video}
                          onClose={() => setExpandedVideo(null)}
                        />
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            ) : (
              <EmptyState icon="📹" title="No videos found"
                description="We couldn't load your channel videos. Make sure YouTube is connected in Settings." />
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
                <div className="text-xs text-muted">Personalized growth recommendations</div>
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
