// pages/trends.tsx
import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import DashboardLayout from '../components/layout/DashboardLayout'
import { withAuth } from '../lib/withAuth'
import { usePlatform, PLATFORMS } from '../contexts/PlatformContext'
import { Spinner, EmptyState } from '../components/ui'
import axios from 'axios'
import { FiPlay, FiExternalLink, FiEye, FiSearch, FiX } from 'react-icons/fi'
import { useRouter } from 'next/router'
import toast from 'react-hot-toast'

interface Trend {
  topic: string; category: string; viralityScore: number; growth: string
  contentIdea: string; format: string; thumbnail?: string; channelName?: string
  videoId?: string; videoUrl?: string; viewCount?: number
}

const CATEGORIES = ['All', 'Gaming', 'Music', 'Tech', 'Sports', 'News', 'Education', 'Entertainment', 'Comedy', 'Film', 'Fashion', 'Science', 'Food', 'Travel']

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n/1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n/1_000).toFixed(1)}K`
  return `${n}`
}

function TrendsPage() {
  const { activePlatform, setActivePlatform } = usePlatform()
  const activePlt = PLATFORMS.find(p => p.code === activePlatform)!
  const router = useRouter()

  const [trends, setTrends] = useState<Trend[]>([])
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [nicheInput, setNicheInput] = useState('')
  const [activeNiche, setActiveNiche] = useState('')

  const load = async (cat?: string, niche?: string) => {
    setLoading(true)
    try {
      const params: any = { platform: activePlt.name }
      if (cat && cat !== 'All') params.category = cat
      if (niche) params.niche = niche
      const res = await axios.get('/api/trends', { params })
      setTrends(res.data.trends || [])
      setSummary(res.data.summary || '')
    } catch {
      setTrends([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(selectedCategory, activeNiche) }, [activePlatform])

  const applyCategory = (cat: string) => {
    setSelectedCategory(cat)
    load(cat, activeNiche)
  }

  const applyNiche = () => {
    const n = nicheInput.trim()
    setActiveNiche(n)
    load(selectedCategory, n)
  }

  const clearNiche = () => {
    setNicheInput('')
    setActiveNiche('')
    load(selectedCategory, '')
  }

  // "Use idea" → redirect to Get Inspiration with video URL + auto-message
  const useIdea = (trend: Trend) => {
    if (!trend.videoId && !trend.videoUrl) {
      // No video link — just send the topic
      const msg = encodeURIComponent(`I want to get idea from this topic: "${trend.topic}". Help me create a similar video concept.`)
      router.push(`/inspiration?msg=${msg}`)
      return
    }
    const videoUrl = trend.videoUrl || `https://youtube.com/watch?v=${trend.videoId}`
    const msg = encodeURIComponent(`I want to get idea from this video: ${videoUrl}. Help me create a similar video concept for my channel.`)
    router.push(`/inspiration?msg=${msg}`)
  }

  const isYouTube = activePlatform === 'yt'

  return (
    <DashboardLayout title="Trends">
      <div className="p-6 space-y-5">

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold">🔥 Trend Discovery</h1>
            <p className="text-muted text-sm">Real-time trending topics</p>
          </div>
          <button onClick={() => load(selectedCategory, activeNiche)} disabled={loading}
            className="btn btn-ghost btn-sm gap-1.5">
            {loading ? <Spinner size={13} /> : '↻'} Refresh
          </button>
        </div>

        {/* Platform switcher */}
        <div className="flex gap-2 flex-wrap">
          {PLATFORMS.map(p => (
            <button key={p.code} onClick={() => setActivePlatform(p.code as any)}
              className={`plt-chip ${activePlatform === p.code ? 'active' : ''}`}
              style={{ borderColor: activePlatform === p.code ? p.color + '66' : undefined }}>
              <span style={{ color: p.color }}>{p.icon}</span>
              <span className="text-sm">{p.name}</span>
            </button>
          ))}
        </div>

        {/* Category + Niche filters — YouTube only */}
        {isYouTube && (
          <div className="card space-y-3">
            {/* Category chips */}
            <div>
              <label className="text-xs font-bold text-muted uppercase tracking-wider mb-2 block">Category</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => applyCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                      selectedCategory === cat
                        ? 'bg-cyan/20 text-cyan border-cyan/40'
                        : 'bg-white/5 text-muted border-white/10 hover:border-white/20 hover:text-white'
                    }`}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Niche keyword search */}
            <div>
              <label className="text-xs font-bold text-muted uppercase tracking-wider mb-2 block">Filter by Niche / Keyword</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={13} />
                  <input className="inp pl-9 py-2 text-sm" value={nicheInput}
                    onChange={e => setNicheInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') applyNiche() }}
                    placeholder="e.g. finance, fitness, cooking, AI..." />
                </div>
                <button onClick={applyNiche} className="btn btn-cyan btn-sm">Filter</button>
                {activeNiche && (
                  <button onClick={clearNiche} className="btn btn-ghost btn-sm gap-1">
                    <FiX size={13} /> Clear
                  </button>
                )}
              </div>
              {activeNiche && (
                <p className="text-xs text-cyan mt-1.5">
                  Filtering by: <span className="font-semibold">"{activeNiche}"</span>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Summary */}
        {summary && !loading && (
          <div className="card border-white/10 bg-white/5">
            <div className="flex items-start gap-3">
              <div className="text-2xl">✦</div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-cyan mb-1">Trend Summary</div>
                <p className="text-sm text-white/80">{summary}</p>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="card flex flex-col items-center justify-center py-20">
            <div className="loading-dots flex justify-center mb-4"><span /><span /><span /></div>
            <p className="text-muted text-sm">Loading {activePlt.name} trends{selectedCategory !== 'All' ? ` — ${selectedCategory}` : ''}...</p>
          </div>
        )}

        {!loading && trends.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trends.map((t, i) => {
              const scoreColor = t.viralityScore >= 85 ? '#00ff88' : t.viralityScore >= 70 ? '#ffc740' : '#00f5ff'
              const views = typeof t.viewCount === 'number' ? t.viewCount : 0
              return (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="card hover:border-white/10 transition-all duration-200 border-b-2 p-0 overflow-hidden"
                  style={{ borderBottomColor: scoreColor }}>

                  {/* Thumbnail */}
                  {isYouTube && t.thumbnail && (
                    <div className="relative w-full aspect-video bg-black/30 overflow-hidden">
                      <img src={t.thumbnail} alt={t.topic} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute top-2 left-2 w-7 h-7 rounded-full bg-black/70
                                    flex items-center justify-center text-xs font-bold" style={{ color: scoreColor }}>
                        {i + 1}
                      </div>
                      {views > 0 && (
                        <div className="absolute bottom-2 right-2 flex items-center gap-1
                                      bg-black/70 px-2 py-0.5 rounded text-[10px] text-white">
                          <FiEye size={9} /> {formatNum(views)}
                        </div>
                      )}
                      {t.videoId && (
                        <a href={`https://youtube.com/watch?v=${t.videoId}`} target="_blank" rel="noopener noreferrer"
                          className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                          onClick={e => e.stopPropagation()}>
                          <div className="w-12 h-12 rounded-full bg-red-600/90 flex items-center justify-center">
                            <FiPlay className="text-white ml-0.5" size={20} />
                          </div>
                        </a>
                      )}
                    </div>
                  )}

                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2 gap-2">
                      <div className="flex-1 min-w-0">
                        {!isYouTube && (
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-5 h-5 rounded-full bg-surf3 flex items-center justify-center text-xs font-bold" style={{ color: scoreColor }}>{i + 1}</div>
                            <div className="text-[10px] text-muted uppercase tracking-wider">{t.category}</div>
                          </div>
                        )}
                        <div className="text-sm font-bold text-white line-clamp-2 leading-tight">{t.topic}</div>
                        {isYouTube && t.channelName && (
                          <div className="text-[10px] text-muted mt-0.5 truncate">{t.channelName}</div>
                        )}
                      </div>
                      <div className="text-center flex-shrink-0">
                        <div className="font-display text-xl" style={{ color: scoreColor }}>{t.viralityScore}</div>
                        <div className="text-[9px] text-muted">Virality</div>
                      </div>
                    </div>

                    <div className="h-1 bg-white/10 rounded-full overflow-hidden mb-2">
                      <motion.div className="h-full rounded-full" style={{ background: scoreColor }}
                        initial={{ width: '0%' }} animate={{ width: `${t.viralityScore}%` }}
                        transition={{ duration: 0.8, delay: i * 0.05 }} />
                    </div>

                    <div className="text-[10px] font-bold text-green mb-3">{t.growth}</div>

                    <div className="bg-surf2 rounded-lg p-2.5 mb-3">
                      <div className="text-[10px] text-muted mb-1">💡 Content Idea</div>
                      <p className="text-xs text-white/80 leading-relaxed">{t.contentIdea}</p>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-muted">{t.format}</span>
                      <div className="flex items-center gap-2">
                        {t.videoId && (
                          <a href={`https://youtube.com/watch?v=${t.videoId}`} target="_blank" rel="noopener noreferrer"
                            className="text-muted hover:text-cyan transition-colors">
                            <FiExternalLink size={12} />
                          </a>
                        )}
                        {/* Use idea → Get Inspiration */}
                        <button onClick={() => useIdea(t)}
                          className="text-xs text-cyan font-bold hover:underline flex items-center gap-1">
                          Use idea →
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}

        {!loading && trends.length === 0 && (
          <EmptyState icon="📊" title="No trends found"
            description="Try a different category or clear the niche filter"
            action={{ label: 'Reset Filters', onClick: () => { setSelectedCategory('All'); clearNiche() } }} />
        )}
      </div>
    </DashboardLayout>
  )
}

export default withAuth(TrendsPage)
