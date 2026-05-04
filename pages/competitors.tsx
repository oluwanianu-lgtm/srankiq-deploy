// pages/2-competitors.tsx  (replace competitors.tsx)
import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import DashboardLayout from '../components/layout/DashboardLayout'
import { withAuth } from '../lib/withAuth'
import { usePlatform, PLATFORMS } from '../contexts/PlatformContext'
import { AIBadge, Spinner, EmptyState } from '../components/ui'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { saveCompetitor, getCompetitors, deleteCompetitor } from '../services/firestore'
import { useRouter } from 'next/router'
import {
  FiPlus, FiTrash2, FiRefreshCw, FiSearch, FiYoutube,
  FiUsers, FiEye, FiThumbsUp, FiMessageSquare, FiTrendingUp,
  FiDollarSign, FiExternalLink, FiBarChart2, FiChevronDown, FiChevronUp,
  FiCalendar, FiCopy, FiCheck, FiZap
} from 'react-icons/fi'

function formatNum(n: number): string {
  if (n >= 1_000_000_000) return `${(n/1e9).toFixed(1)}B`
  if (n >= 1_000_000) return `${(n/1e6).toFixed(1)}M`
  if (n >= 1_000) return `${(n/1e3).toFixed(1)}K`
  return `${n}`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const diff = Math.floor((Date.now() - d.getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return `${diff}d ago`
  if (diff < 30) return `${Math.floor(diff/7)}w ago`
  return `${Math.floor(diff/30)}mo ago`
}

function SEOBadge({ score }: { score: number }) {
  const color = score >= 75 ? '#00ff88' : score >= 50 ? '#ffc740' : '#ff0090'
  const label = score >= 75 ? 'Great' : score >= 50 ? 'Good' : 'Needs Work'
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 flex-shrink-0"
        style={{ borderColor: color, color }}>{score}</div>
      <span className="text-[10px]" style={{ color }}>{label}</span>
    </div>
  )
}

// ── Laser Scanner Animation ──────────────────────────────────────
const CLONE_PHASES = [
  'Analyzing content strategy...',
  'Extracting ranking keywords...',
  'Mapping video formats & styles...',
  'Building channel blueprint...',
  'Generating upload schedule...',
  'Finalizing clone package...',
]

function LaserScanner({ phase, total }: { phase: number; total: number }) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-surf2 border border-cyan/20 p-6">
      {/* Laser line */}
      <motion.div
        key={phase}
        className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan to-transparent"
        style={{ top: '50%' }}
        initial={{ x: '-100%', opacity: 0 }}
        animate={{ x: '100%', opacity: [0, 1, 1, 0] }}
        transition={{ duration: 1.2, ease: 'easeInOut' }}
      />
      {/* Glow effect */}
      <motion.div
        key={`glow-${phase}`}
        className="absolute left-0 right-0 h-8 bg-gradient-to-r from-transparent via-cyan/10 to-transparent"
        style={{ top: 'calc(50% - 16px)' }}
        initial={{ x: '-100%' }}
        animate={{ x: '100%' }}
        transition={{ duration: 1.2, ease: 'easeInOut' }}
      />
      <div className="relative z-10 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-cyan/20 border border-cyan/40 flex items-center justify-center">
            <FiZap size={14} className="text-cyan" />
          </div>
          <span className="text-sm font-bold text-cyan">Cloning Channel</span>
        </div>
        <p className="text-sm text-white/80 mb-4">{CLONE_PHASES[phase] || 'Processing...'}</p>
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-3">
          {CLONE_PHASES.map((_, i) => (
            <div key={i} className={`w-2 h-2 rounded-full transition-all duration-300 ${
              i < phase ? 'bg-cyan' : i === phase ? 'bg-cyan animate-pulse' : 'bg-white/20'
            }`} />
          ))}
        </div>
        <div className="text-xs text-muted">{phase + 1} of {total} phases</div>
        {/* Progress bar */}
        <div className="mt-3 h-1 bg-white/10 rounded-full overflow-hidden">
          <motion.div className="h-full bg-gradient-to-r from-cyan to-green rounded-full"
            animate={{ width: `${((phase + 1) / total) * 100}%` }}
            transition={{ duration: 0.5 }} />
        </div>
      </div>
    </div>
  )
}

// ── Clone Success Modal ──────────────────────────────────────────
function CloneSuccessModal({ blueprint, channelName, onCheck, onClose }:
  { blueprint: any; channelName: string; onCheck: () => void; onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        className="bg-surf border border-white/10 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
        {/* Success checkmark */}
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
          className="w-20 h-20 rounded-full bg-green/20 border-4 border-green flex items-center
                    justify-center mx-auto mb-5">
          <FiCheck size={36} className="text-green" />
        </motion.div>
        <h2 className="text-2xl font-bold text-white mb-2">Channel Cloned! 🎉</h2>
        <p className="text-muted text-sm mb-2">
          Your blueprint for <span className="text-cyan font-semibold">{channelName}</span> is ready.
        </p>
        <div className="text-xs text-muted mb-6 p-3 bg-surf2 rounded-xl border border-white/5">
          <div className="text-white font-semibold mb-1">📋 Blueprint includes:</div>
          Channel name · Tags · Content pillars · Video formats · Upload schedule · Title formulas · Growth tips
        </div>
        <button onClick={onCheck}
          className="btn btn-cyan w-full justify-center gap-2 mb-3 text-base py-3">
          <FiCheck size={16} /> View in Get Inspiration →
        </button>
        <button onClick={onClose} className="text-xs text-muted hover:text-white transition-colors">
          Stay here
        </button>
      </motion.div>
    </motion.div>
  )
}

// ── Video Card ───────────────────────────────────────────────────
function VideoCard({ video, index }: { video: any; index: number }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="bg-surf2 rounded-xl border border-white/5 hover:border-white/10 transition-all overflow-hidden">
      <div className="flex gap-3 p-3">
        <div className="w-6 h-6 rounded-full bg-cyan/10 border border-cyan/20 flex items-center
                       justify-center text-xs font-bold text-cyan flex-shrink-0 mt-1">{index + 1}</div>
        <div className="relative flex-shrink-0 w-32 h-[72px] rounded-lg overflow-hidden bg-black/30">
          {video.thumbnail && <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />}
          {video.duration && (
            <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[9px] px-1 py-0.5 rounded font-mono">{video.duration}</span>
          )}
          <span className="absolute top-1 left-1 text-[8px] bg-black/70 text-white px-1 py-0.5 rounded">{formatDate(video.publishedAt)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white line-clamp-2 mb-1.5 leading-snug">{video.title}</div>
          <div className="grid grid-cols-3 gap-1.5 mb-1.5">
            {[
              { val: video.viewsFormatted, label: 'Views', color: 'text-cyan' },
              { val: video.likesFormatted, label: 'Likes', color: 'text-green' },
              { val: video.commentsFormatted, label: 'Comments', color: 'text-gold' },
            ].map(s => (
              <div key={s.label} className="text-center p-1 bg-surf3 rounded-lg">
                <div className={`text-xs font-bold ${s.color}`}>{s.val}</div>
                <div className="text-[8px] text-muted">{s.label}</div>
              </div>
            ))}
          </div>
          <SEOBadge score={video.seoScore} />
        </div>
        <div className="flex flex-col gap-1.5 flex-shrink-0 items-end justify-center">
          <a href={video.url} target="_blank" rel="noopener noreferrer">
            <button className="btn btn-ghost btn-sm gap-1 text-xs py-1"><FiExternalLink size={10} /> Watch</button>
          </a>
          <button onClick={() => setExpanded(!expanded)} className="btn btn-cyan btn-sm gap-1 text-xs py-1">
            <FiBarChart2 size={10} />
            {expanded ? 'Hide' : 'Analyze'}
            {expanded ? <FiChevronUp size={9} /> : <FiChevronDown size={9} />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="px-3 pb-3 border-t border-white/5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
                {[
                  { icon: <FiThumbsUp size={12} className="text-cyan" />, val: video.likesFormatted, label: 'Likes', color: 'text-cyan', bg: 'bg-cyan/10' },
                  { icon: <FiUsers size={12} className="text-green" />, val: video.estimatedSubsGained, label: 'Est. Subs Gained', color: 'text-green', bg: 'bg-green/10' },
                  { icon: <FiDollarSign size={12} className="text-gold" />, val: video.estimatedRevenue, label: 'Est. Revenue', color: 'text-gold', bg: 'bg-gold/10' },
                  { icon: <FiMessageSquare size={12} className="text-magenta" />, val: video.commentsFormatted, label: 'Comments', color: 'text-magenta', bg: 'bg-magenta/10' },
                ].map(s => (
                  <div key={s.label} className="p-2.5 bg-surf3 rounded-xl text-center">
                    <div className={`w-6 h-6 rounded-full ${s.bg} flex items-center justify-center mx-auto mb-1`}>{s.icon}</div>
                    <div className={`text-sm font-bold ${s.color}`}>{s.val}</div>
                    <div className="text-[9px] text-muted">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="mt-2 p-2.5 bg-surf3 rounded-xl">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-muted">Engagement Rate</span>
                  <span className="text-[10px] font-bold text-cyan">
                    {video.views > 0 ? ((video.likes / video.views) * 100).toFixed(2) : 0}%
                  </span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-cyan to-green rounded-full"
                    style={{ width: `${Math.min(100, (video.likes / Math.max(video.views, 1)) * 2000)}%` }} />
                </div>
              </div>
              {video.tags?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {video.tags.map((tag: string, i: number) => (
                    <span key={i} className="text-[9px] px-1.5 py-0.5 bg-surf3 border border-white/10 rounded-full text-muted">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

const DATE_RANGES = [
  { label: 'All Time', value: 'all' },
  { label: 'This Month', value: 'month' },
  { label: 'This Week', value: 'week' },
  { label: 'Today', value: 'today' },
]

function filterByDate(videos: any[], range: string): any[] {
  if (range === 'all' || !videos?.length) return videos
  const cutoffs: Record<string, number> = { today: 86400000, week: 7*86400000, month: 30*86400000 }
  const cutoff = cutoffs[range]
  if (!cutoff) return videos
  const filtered = videos.filter(v => (Date.now() - new Date(v.publishedAt).getTime()) <= cutoff)
  return filtered.length > 0 ? filtered : videos
}

// ── Main Page ────────────────────────────────────────────────────
function CompetitorsPage() {
  const { activePlatform } = usePlatform()
  const { user } = useAuth()
  const router = useRouter()
  const activePlt = PLATFORMS.find(p => p.code === activePlatform)!
  const resultsRef = useRef<HTMLDivElement>(null)

  const [savedCompetitors, setSavedCompetitors] = useState<any[]>([])
  const [newName, setNewName] = useState('')
  const [niche, setNiche] = useState('')
  const [analysis, setAnalysis] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState('')
  const [dateRange, setDateRange] = useState('all')

  // Similar channels
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)

  // Clone state
  const [cloning, setCloning] = useState(false)
  const [clonePhase, setClonePhase] = useState(0)
  const [cloneBlueprint, setCloneBlueprint] = useState<any>(null)
  const [showCloneSuccess, setShowCloneSuccess] = useState(false)

  // Read channel from query param (from keywords page redirect)
  useEffect(() => {
    const ch = router.query.channel as string
    if (ch) { analyze(ch) }
  }, [router.query.channel])

  useEffect(() => { if (user) loadSaved() }, [user])

  const loadSaved = async () => {
    if (!user) return
    const data = await getCompetitors(user.uid)
    setSavedCompetitors(data)
  }

  const analyze = async (name: string, save = true) => {
    setAnalyzing(name)
    setLoading(true)
    setAnalysis(null)
    setSuggestions([])
    setCloneBlueprint(null)
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
        toast.success(`${name} saved`)
      }
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300)
      loadSuggestions(res.data)
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Analysis failed. Try again.')
    } finally {
      setLoading(false)
      setAnalyzing('')
    }
  }

  const loadSuggestions = async (data: any) => {
    setLoadingSuggestions(true)
    try {
      const keywords = data.rankingKeywords?.slice(0, 4).join(' ') || data.name
      const res = await axios.post('/api/competitors/2-suggestions', {
        channelName: data.name,
        keywords,
        niche: niche || 'general',
        excludeId: data.channelId,
      })
      setSuggestions(res.data.suggestions || [])
    } catch { setSuggestions([]) } finally { setLoadingSuggestions(false) }
  }

  const startClone = async () => {
    if (!analysis) return
    setCloning(true)
    setClonePhase(0)
    setCloneBlueprint(null)

    // Animate through phases
    for (let i = 0; i < CLONE_PHASES.length - 1; i++) {
      await new Promise(r => setTimeout(r, 900))
      setClonePhase(i + 1)
    }

    try {
      const res = await axios.post('/api/competitors/3-clone', {
        channelName: analysis.name,
        channelData: analysis,
      })
      setCloneBlueprint(res.data.blueprint)
      await new Promise(r => setTimeout(r, 500))
      setCloning(false)
      setShowCloneSuccess(true)
    } catch {
      setCloning(false)
      toast.error('Clone failed. Try again.')
    }
  }

  const handleCloneCheck = () => {
    if (!cloneBlueprint) return
    setShowCloneSuccess(false)
    const msg = encodeURIComponent(
      `I just cloned the channel "${analysis?.name}". Here is my complete channel blueprint:\n\n` +
      `📌 Channel Name: ${cloneBlueprint.channelName?.primary}\n` +
      `🎯 Niche: ${cloneBlueprint.niche}\n` +
      `👥 Target Audience: ${cloneBlueprint.targetAudience}\n` +
      `📅 Upload Schedule: ${cloneBlueprint.uploadSchedule}\n` +
      `🏷️ Channel Tags: ${cloneBlueprint.channelTags?.join(', ')}\n` +
      `🎬 Video Formats: ${cloneBlueprint.videoFormats?.map((f: any) => f.format).join(', ')}\n\n` +
      `Help me plan my first 30 days of content based on this blueprint.`
    )
    router.push(`/inspiration?msg=${msg}`)
  }

  const remove = async (id: string) => {
    if (!user) return
    await deleteCompetitor(user.uid, id)
    await loadSaved()
    toast.success('Removed')
  }

  const filteredVideos = analysis?.trendingVideos
    ? filterByDate(analysis.trendingVideos, dateRange)
    : []

  return (
    <DashboardLayout title="Competitors">
      <div className="p-6 space-y-6">

        {/* Clone Success Modal */}
        <AnimatePresence>
          {showCloneSuccess && cloneBlueprint && (
            <CloneSuccessModal
              blueprint={cloneBlueprint}
              channelName={analysis?.name || ''}
              onCheck={handleCloneCheck}
              onClose={() => setShowCloneSuccess(false)}
            />
          )}
        </AnimatePresence>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold">👥 Competitor Intelligence</h1>
            <p className="text-muted text-sm">Real YouTube data — stats, trending videos, revenue estimates</p>
          </div>
        </div>

        {/* Search */}
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
                  placeholder="e.g. MrBeast, MKBHD, @veritasium..." />
              </div>
            </div>
            <div>
              <label className="label">Niche (optional)</label>
              <input className="inp" value={niche} onChange={e => setNiche(e.target.value)}
                placeholder="e.g. tech, finance, fitness" />
            </div>
          </div>
          <button onClick={() => { if (newName) { analyze(newName); setNewName('') } else toast.error('Enter a channel name') }}
            disabled={loading} className="btn btn-cyan gap-2">
            {loading ? <Spinner size={15} /> : <FiPlus size={15} />}
            {loading ? 'Analyzing...' : 'Analyze Competitor'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Saved */}
          <div className="card lg:col-span-1 h-fit">
            <h3 className="font-bold text-white mb-3">Saved ({savedCompetitors.length})</h3>
            {savedCompetitors.length === 0 ? (
              <p className="text-muted text-sm text-center py-6">No competitors saved yet</p>
            ) : (
              <div className="space-y-2">
                {savedCompetitors.map((c: any) => (
                  <div key={c.id}
                    className="flex items-center gap-2 p-2.5 bg-surf2 rounded-xl border border-white/5
                              hover:border-white/10 transition-colors cursor-pointer"
                    onClick={() => analyze(c.name, false)}>
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan/20 to-magenta/20
                                  flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                      {c.name?.charAt(0)?.toUpperCase()}
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

          {/* Main results */}
          <div className="lg:col-span-3 space-y-5" ref={resultsRef}>

            {loading && (
              <div className="card flex flex-col items-center justify-center py-20">
                <div className="loading-dots flex justify-center mb-4"><span /><span /><span /></div>
                <p className="text-muted text-sm">Fetching real YouTube data for {analyzing}...</p>
              </div>
            )}

            {/* Clone laser scanner */}
            {cloning && (
              <LaserScanner phase={clonePhase} total={CLONE_PHASES.length} />
            )}

            {!loading && !cloning && analysis && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">

                {/* Channel Header */}
                <div className="card">
                  <div className="flex items-center gap-4 mb-4">
                    {analysis.thumbnail ? (
                      <img src={analysis.thumbnail} alt={analysis.name}
                        className="w-14 h-14 rounded-xl object-cover border border-white/10 flex-shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan/20 to-magenta/20
                                    flex items-center justify-center text-2xl font-display text-white flex-shrink-0">
                        {analysis.name?.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h2 className="text-lg font-bold text-white truncate">{analysis.name}</h2>
                        <FiYoutube className="text-red-400 flex-shrink-0" size={14} />
                      </div>
                      <a href={analysis.channelUrl} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-cyan hover:underline flex items-center gap-1">
                        <FiExternalLink size={10} /> View Channel
                      </a>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <AIBadge />
                      {/* CLONE BUTTON */}
                      <button onClick={startClone}
                        className="btn btn-sm gap-1.5 font-bold text-xs px-3 py-2
                                  bg-gradient-to-r from-magenta/20 to-cyan/20 border border-cyan/30
                                  text-cyan hover:from-magenta/30 hover:to-cyan/30 transition-all">
                        <FiZap size={12} /> Clone Channel
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
                    {[
                      { label: 'Subscribers', value: analysis.subscriberCountFormatted, color: 'text-cyan' },
                      { label: 'Total Views', value: analysis.totalViewsFormatted, color: 'text-green' },
                      { label: 'Videos', value: analysis.videoCount, color: 'text-red-400' },
                      { label: 'Avg Views', value: analysis.avgViewsFormatted, color: 'text-gold' },
                      { label: 'New Subs (28d)', value: analysis.newSubsLast28Days, color: 'text-magenta' },
                      { label: 'Est. Revenue/mo', value: analysis.estimatedMonthlyRevenue, color: 'text-gold' },
                    ].map(s => (
                      <div key={s.label} className="bg-surf2 rounded-xl p-2.5 text-center">
                        <div className={`text-sm font-bold ${s.color}`}>{s.value || '—'}</div>
                        <div className="text-[9px] text-muted mt-0.5 leading-tight">{s.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 bg-surf2 rounded-xl flex items-center gap-3">
                    <div className="text-xs text-muted whitespace-nowrap">SEO Score</div>
                    <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-cyan to-green"
                        style={{ width: `${analysis.channelSEOScore}%` }} />
                    </div>
                    <SEOBadge score={analysis.channelSEOScore} />
                    <div className="text-lg font-display font-bold flex-shrink-0" style={{
                      color: analysis.channelSEOScore >= 75 ? '#00ff88' : analysis.channelSEOScore >= 50 ? '#ffc740' : '#ff0090'
                    }}>{analysis.channelSEOScore}/100</div>
                  </div>
                </div>

                {/* Trending Videos */}
                {analysis.trendingVideos?.length > 0 && (
                  <div className="card">
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                      <h3 className="font-bold text-white">🔥 Top {filteredVideos.length} Videos</h3>
                      <div className="flex items-center gap-1.5">
                        <FiCalendar size={12} className="text-muted" />
                        {DATE_RANGES.map(r => (
                          <button key={r.value} onClick={() => setDateRange(r.value)}
                            className={`text-[10px] px-2.5 py-1 rounded-full font-semibold transition-all border ${
                              dateRange === r.value
                                ? 'bg-cyan/20 text-cyan border-cyan/40'
                                : 'bg-white/5 text-muted border-white/10 hover:border-white/20 hover:text-white'
                            }`}>
                            {r.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3">
                      {filteredVideos.slice(0, 5).map((video: any, i: number) => (
                        <VideoCard key={video.id || i} video={video} index={i} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Strategy */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analysis.contentStrategy && (
                    <div className="card">
                      <h4 className="font-bold text-white mb-3 text-sm flex items-center gap-2">📋 Content Strategy <AIBadge /></h4>
                      <p className="text-sm text-white/70 leading-relaxed">{analysis.contentStrategy}</p>
                    </div>
                  )}
                  {analysis.rankingKeywords?.length > 0 && (
                    <div className="card">
                      <h4 className="font-bold text-white mb-3 text-sm">🔑 Ranking Keywords</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {analysis.rankingKeywords.map((kw: string, i: number) => (
                          <span key={i} className="px-2 py-1 bg-surf2 border border-white/10 rounded-full text-xs text-white/70">{kw}</span>
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

                {/* Similar Channels — real YouTube data */}
                <div className="card">
                  <div className="flex items-center gap-3 mb-4">
                    <h3 className="font-bold text-white">🤝 Similar Channels to Track</h3>
                    {loadingSuggestions && <Spinner size={13} />}
                  </div>
                  {suggestions.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {suggestions.map((ch: any, i: number) => (
                        <motion.button key={i}
                          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.06 }}
                          onClick={() => analyze(ch.name || ch, false)}
                          className="flex items-center gap-3 p-3 bg-surf2 rounded-xl border border-white/5
                                    hover:border-cyan/20 hover:bg-cyan/5 transition-all text-left group">
                          <div className="relative flex-shrink-0">
                            {ch.thumbnail ? (
                              <img src={ch.thumbnail} alt={ch.name}
                                className="w-10 h-10 rounded-full object-cover border border-white/10" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan/20 to-magenta/20
                                            flex items-center justify-center text-white font-bold text-sm">
                                {(ch.name || ch).charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center">
                              <FiYoutube size={8} className="text-white" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-white truncate group-hover:text-cyan transition-colors">
                              {ch.name || ch}
                            </div>
                            {ch.subscriberCount > 0 && (
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-cyan flex items-center gap-1">
                                  <FiUsers size={9} /> {formatNum(ch.subscriberCount)} subs
                                </span>
                                {ch.videoCount > 0 && (
                                  <span className="text-xs text-muted">{ch.videoCount} videos</span>
                                )}
                              </div>
                            )}
                            <div className="text-[10px] text-muted mt-0.5">Click to analyze →</div>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  ) : !loadingSuggestions ? (
                    <p className="text-muted text-sm text-center py-4">
                      Analyze a competitor to see similar channel suggestions
                    </p>
                  ) : (
                    <div className="flex justify-center py-6">
                      <div className="loading-dots flex"><span /><span /><span /></div>
                    </div>
                  )}
                </div>

              </motion.div>
            )}

            {!loading && !cloning && !analysis && (
              <EmptyState icon="👥" title="Search for a competitor"
                description="Enter any YouTube channel name — get real stats, trending videos, SEO scores, revenue, and clone their strategy" />
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default withAuth(CompetitorsPage)
