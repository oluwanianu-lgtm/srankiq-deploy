// pages/competitors.tsx
import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import DashboardLayout from '../components/layout/DashboardLayout'
import { withAuth } from '../lib/withAuth'
import { usePlatform, PLATFORMS } from '../contexts/PlatformContext'
import { AIBadge, Spinner, EmptyState } from '../components/ui'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { saveCompetitor, getCompetitors, deleteCompetitor } from '../services/firestore'
import {
  FiPlus, FiTrash2, FiRefreshCw, FiSearch, FiYoutube,
  FiUsers, FiEye, FiThumbsUp, FiMessageSquare, FiTrendingUp,
  FiDollarSign, FiExternalLink, FiBarChart2, FiChevronDown, FiChevronUp
} from 'react-icons/fi'

function formatNum(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return `${n}`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const diff = Math.floor((Date.now() - d.getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return `${diff} days ago`
  if (diff < 30) return `${Math.floor(diff / 7)}w ago`
  return `${Math.floor(diff / 30)}mo ago`
}

function SEOBadge({ score }: { score: number }) {
  const color = score >= 75 ? '#00ff88' : score >= 50 ? '#ffc740' : '#ff0090'
  const label = score >= 75 ? 'Great' : score >= 50 ? 'Good' : 'Needs Work'
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2"
        style={{ borderColor: color, color }}>
        {score}
      </div>
      <span className="text-xs" style={{ color }}>{label}</span>
    </div>
  )
}

function VideoCard({ video, index }: { video: any; index: number }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      className="bg-surf2 rounded-xl border border-white/5 hover:border-white/10 transition-all overflow-hidden">

      <div className="flex gap-4 p-4">
        {/* Rank */}
        <div className="w-6 h-6 rounded-full bg-cyan/10 border border-cyan/20 flex items-center
                       justify-center text-xs font-bold text-cyan flex-shrink-0 mt-1">
          {index + 1}
        </div>

        {/* Thumbnail */}
        <div className="relative flex-shrink-0 w-36 h-20 rounded-lg overflow-hidden bg-black/30">
          <img src={video.thumbnail} alt={video.title}
            className="w-full h-full object-cover" />
          {video.duration && (
            <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px]
                           px-1.5 py-0.5 rounded font-mono">{video.duration}</span>
          )}
          <div className="absolute top-1 left-1">
            <span className="text-[9px] bg-black/70 text-white px-1.5 py-0.5 rounded">
              {formatDate(video.publishedAt)}
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white line-clamp-2 mb-2 leading-snug">
            {video.title}
          </div>
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 mb-2">
            <div className="text-center p-1.5 bg-surf3 rounded-lg">
              <div className="text-sm font-bold text-cyan">{video.viewsFormatted}</div>
              <div className="text-[9px] text-muted">Views</div>
            </div>
            <div className="text-center p-1.5 bg-surf3 rounded-lg">
              <div className="text-sm font-bold text-green">{video.likesFormatted}</div>
              <div className="text-[9px] text-muted">Likes</div>
            </div>
            <div className="text-center p-1.5 bg-surf3 rounded-lg">
              <div className="text-sm font-bold text-gold">{video.commentsFormatted}</div>
              <div className="text-[9px] text-muted">Comments</div>
            </div>
          </div>
          <SEOBadge score={video.seoScore} />
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 flex-shrink-0 items-end">
          <a href={video.url} target="_blank" rel="noopener noreferrer">
            <button className="btn btn-ghost btn-sm gap-1 text-xs">
              <FiExternalLink size={11} /> Watch
            </button>
          </a>
          <button
            onClick={() => setExpanded(!expanded)}
            className="btn btn-cyan btn-sm gap-1 text-xs">
            <FiBarChart2 size={11} />
            {expanded ? 'Hide' : 'Analyze'}
            {expanded ? <FiChevronUp size={10} /> : <FiChevronDown size={10} />}
          </button>
        </div>
      </div>

      {/* Expanded analysis */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden">
            <div className="px-4 pb-4 pt-0 border-t border-white/5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                <div className="p-3 bg-surf3 rounded-xl text-center">
                  <div className="w-7 h-7 rounded-full bg-cyan/10 flex items-center justify-center mx-auto mb-1">
                    <FiThumbsUp size={13} className="text-cyan" />
                  </div>
                  <div className="text-base font-bold text-cyan">{video.likesFormatted}</div>
                  <div className="text-[10px] text-muted">Likes on video</div>
                </div>
                <div className="p-3 bg-surf3 rounded-xl text-center">
                  <div className="w-7 h-7 rounded-full bg-green/10 flex items-center justify-center mx-auto mb-1">
                    <FiUsers size={13} className="text-green" />
                  </div>
                  <div className="text-base font-bold text-green">{video.estimatedSubsGained}</div>
                  <div className="text-[10px] text-muted">Est. subs gained</div>
                </div>
                <div className="p-3 bg-surf3 rounded-xl text-center">
                  <div className="w-7 h-7 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-1">
                    <FiDollarSign size={13} className="text-gold" />
                  </div>
                  <div className="text-base font-bold text-gold">{video.estimatedRevenue}</div>
                  <div className="text-[10px] text-muted">Est. revenue</div>
                </div>
                <div className="p-3 bg-surf3 rounded-xl text-center">
                  <div className="w-7 h-7 rounded-full bg-magenta/10 flex items-center justify-center mx-auto mb-1">
                    <FiMessageSquare size={13} className="text-magenta" />
                  </div>
                  <div className="text-base font-bold text-magenta">{video.commentsFormatted}</div>
                  <div className="text-[10px] text-muted">Comments</div>
                </div>
              </div>

              {/* Engagement rate */}
              <div className="mt-3 p-3 bg-surf3 rounded-xl">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-muted">Engagement Rate</span>
                  <span className="text-xs font-bold text-cyan">
                    {video.views > 0 ? ((video.likes / video.views) * 100).toFixed(2) : 0}%
                  </span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-cyan to-green rounded-full"
                    style={{ width: `${Math.min(100, (video.likes / Math.max(video.views, 1)) * 2000)}%` }} />
                </div>
              </div>

              {/* Tags */}
              {video.tags?.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs text-muted mb-1.5">Top Tags</div>
                  <div className="flex flex-wrap gap-1.5">
                    {video.tags.map((tag: string, i: number) => (
                      <span key={i} className="text-[10px] px-2 py-1 bg-surf3 border border-white/10
                                              rounded-full text-muted">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function CompetitorsPage() {
  const { activePlatform } = usePlatform()
  const { user } = useAuth()
  const activePlt = PLATFORMS.find(p => p.code === activePlatform)!

  const [savedCompetitors, setSavedCompetitors] = useState<any[]>([])
  const [newName, setNewName] = useState('')
  const [niche, setNiche] = useState('')
  const [analysis, setAnalysis] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState('')

  useEffect(() => {
    if (user) loadSaved()
  }, [user])

  const loadSaved = async () => {
    if (!user) return
    const data = await getCompetitors(user.uid)
    setSavedCompetitors(data)
  }

  const analyze = async (name: string, save = true) => {
    setAnalyzing(name)
    setLoading(true)
    setAnalysis(null)
    try {
      const res = await axios.post('/api/competitors/analyze', {
        channelName: name,
        platform: activePlt.name,
        niche: niche || 'general',
      })
      setAnalysis(res.data)
      if (save && user) {
        await saveCompetitor(user.uid, { name, platform: activePlt.name, data: res.data })
        await loadSaved()
        toast.success(`${name} added to saved competitors`)
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Analysis failed. Try again.')
    } finally {
      setLoading(false)
      setAnalyzing('')
    }
  }

  const remove = async (id: string) => {
    if (!user) return
    await deleteCompetitor(user.uid, id)
    await loadSaved()
    toast.success('Competitor removed')
  }

  return (
    <DashboardLayout title="Competitors">
      <div className="p-6 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold">👥 Competitor Intelligence</h1>
            <p className="text-muted text-sm">Real YouTube data — channel stats, trending videos, revenue estimates</p>
          </div>
          <span className="badge-cyan text-[10px]">YouTube API</span>
        </div>

        {/* Add competitor */}
        <div className="card">
          <h3 className="font-bold text-white mb-4">Analyze a Competitor</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div className="md:col-span-2">
              <label className="label">Channel / Account Name</label>
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={14} />
                <input className="inp pl-9" value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && newName) { analyze(newName); setNewName('') } }}
                  placeholder="e.g. MrBeast, MKBHD, Gary Vee..." />
              </div>
            </div>
            <div>
              <label className="label">Niche (optional)</label>
              <input className="inp" value={niche} onChange={e => setNiche(e.target.value)}
                placeholder="e.g. tech, finance, fitness" />
            </div>
          </div>
          <button
            onClick={() => { if (newName) { analyze(newName); setNewName('') } else toast.error('Enter a channel name') }}
            disabled={loading}
            className="btn btn-cyan gap-2">
            {loading ? <Spinner size={15} /> : <FiPlus size={15} />}
            {loading ? 'Analyzing...' : 'Analyze Competitor'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Saved list */}
          <div className="card lg:col-span-1">
            <h3 className="font-bold text-white mb-4">Saved ({savedCompetitors.length})</h3>
            {savedCompetitors.length === 0 ? (
              <p className="text-muted text-sm text-center py-8">No competitors saved yet</p>
            ) : (
              <div className="space-y-2">
                {savedCompetitors.map((c: any) => (
                  <div key={c.id}
                    className="flex items-center gap-2 p-2.5 bg-surf2 rounded-xl
                              border border-white/5 hover:border-white/10 transition-colors cursor-pointer"
                    onClick={() => analyze(c.name, false)}>
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan/20 to-magenta/20
                                  flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                      {c.name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-white truncate">{c.name}</div>
                      <div className="text-[10px] text-muted">{c.platform}</div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={e => { e.stopPropagation(); analyze(c.name, false) }}
                        className="w-6 h-6 rounded hover:bg-white/10 flex items-center justify-center text-muted hover:text-cyan">
                        {analyzing === c.name ? <Spinner size={10} /> : <FiRefreshCw size={10} />}
                      </button>
                      <button onClick={e => { e.stopPropagation(); remove(c.id) }}
                        className="w-6 h-6 rounded hover:bg-white/10 flex items-center justify-center text-muted hover:text-red">
                        <FiTrash2 size={10} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Main analysis panel */}
          <div className="lg:col-span-3">
            {loading && (
              <div className="card flex flex-col items-center justify-center py-20">
                <div className="loading-dots flex justify-center mb-4"><span /><span /><span /></div>
                <p className="text-muted text-sm">Fetching real YouTube data for {analyzing}...</p>
                <p className="text-xs text-muted/50 mt-1">Getting channel stats, top videos, and engagement</p>
              </div>
            )}

            {!loading && analysis && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">

                {/* Channel Header */}
                <div className="card">
                  <div className="flex items-center gap-4 mb-5">
                    {analysis.thumbnail ? (
                      <img src={analysis.thumbnail} alt={analysis.name}
                        className="w-16 h-16 rounded-2xl object-cover border border-white/10" />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan/20 to-magenta/20
                                    flex items-center justify-center text-2xl font-display text-white">
                        {analysis.name?.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-xl font-bold text-white">{analysis.name}</h2>
                        <FiYoutube className="text-red-400" size={16} />
                      </div>
                      <a href={analysis.channelUrl} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-cyan hover:underline flex items-center gap-1">
                        <FiExternalLink size={10} /> View Channel
                      </a>
                    </div>
                    <AIBadge />
                  </div>

                  {/* Real Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {[
                      { label: 'Subscribers', value: analysis.subscriberCountFormatted, icon: <FiUsers size={13} />, color: 'text-cyan' },
                      { label: 'Total Views', value: analysis.totalViewsFormatted, icon: <FiEye size={13} />, color: 'text-green' },
                      { label: 'Videos', value: analysis.videoCount, icon: <FiYoutube size={13} />, color: 'text-red-400' },
                      { label: 'Avg Views', value: analysis.avgViewsFormatted, icon: <FiTrendingUp size={13} />, color: 'text-gold' },
                      { label: 'New Subs (28d)', value: analysis.newSubsLast28Days, icon: <FiUsers size={13} />, color: 'text-magenta' },
                      { label: 'Est. Revenue/mo', value: analysis.estimatedMonthlyRevenue, icon: <FiDollarSign size={13} />, color: 'text-gold' },
                    ].map(s => (
                      <div key={s.label} className="bg-surf2 rounded-xl p-3 text-center">
                        <div className={`flex justify-center mb-1 ${s.color}`}>{s.icon}</div>
                        <div className={`text-sm font-bold ${s.color}`}>{s.value || '—'}</div>
                        <div className="text-[9px] text-muted mt-0.5 leading-tight">{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Channel SEO Score */}
                  <div className="mt-4 p-3 bg-surf2 rounded-xl flex items-center gap-4">
                    <div>
                      <div className="text-xs text-muted mb-1">Channel SEO Score</div>
                      <SEOBadge score={analysis.channelSEOScore} />
                    </div>
                    <div className="flex-1">
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-1000 bg-gradient-to-r from-cyan to-green"
                          style={{ width: `${analysis.channelSEOScore}%` }} />
                      </div>
                    </div>
                    <div className="text-2xl font-display" style={{
                      color: analysis.channelSEOScore >= 75 ? '#00ff88' : analysis.channelSEOScore >= 50 ? '#ffc740' : '#ff0090'
                    }}>
                      {analysis.channelSEOScore}/100
                    </div>
                  </div>
                </div>

                {/* Trending Videos */}
                {analysis.trendingVideos?.length > 0 && (
                  <div className="card">
                    <div className="flex items-center gap-3 mb-4">
                      <h3 className="font-bold text-white">🔥 Top {analysis.trendingVideos.length} Trending Videos</h3>
                      <span className="badge-red text-[10px]">Real YouTube Data</span>
                    </div>
                    <div className="space-y-3">
                      {analysis.trendingVideos.map((video: any, i: number) => (
                        <VideoCard key={video.id} video={video} index={i} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Strategy + Keywords */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analysis.contentStrategy && (
                    <div className="card">
                      <h4 className="font-bold text-white mb-3 text-sm flex items-center gap-2">
                        📋 Content Strategy <AIBadge />
                      </h4>
                      <p className="text-sm text-white/70 leading-relaxed">{analysis.contentStrategy}</p>
                    </div>
                  )}

                  {analysis.rankingKeywords?.length > 0 && (
                    <div className="card">
                      <h4 className="font-bold text-white mb-3 text-sm">🔑 Ranking Keywords</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {analysis.rankingKeywords.map((kw: string, i: number) => (
                          <span key={i} className="px-2 py-1 bg-surf2 border border-white/10
                                                   rounded-full text-xs text-white/70">{kw}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {analysis.strengths?.length > 0 && (
                    <div className="card">
                      <h4 className="font-bold text-green mb-3 text-sm">✅ Strengths</h4>
                      <ul className="space-y-1.5">
                        {analysis.strengths.map((s: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-white/70">
                            <span className="text-green mt-0.5">→</span> {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {analysis.opportunities?.length > 0 && (
                    <div className="card">
                      <h4 className="font-bold text-cyan mb-3 text-sm">💡 Your Opportunities</h4>
                      <ul className="space-y-1.5">
                        {analysis.opportunities.map((o: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-white/70">
                            <span className="text-cyan mt-0.5">→</span> {o}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

              </motion.div>
            )}

            {!loading && !analysis && (
              <EmptyState icon="👥" title="Search for a competitor"
                description="Enter any YouTube channel name above to get real stats, trending videos, and AI-powered analysis" />
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default withAuth(CompetitorsPage)
