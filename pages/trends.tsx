// pages/trends.tsx
import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import DashboardLayout from '../components/layout/DashboardLayout'
import { withAuth } from '../lib/withAuth'
import { usePlatform, PLATFORMS } from '../contexts/PlatformContext'
import { Spinner, EmptyState } from '../components/ui'
import axios from 'axios'
import { FiPlay, FiExternalLink, FiEye } from 'react-icons/fi'

interface Trend {
  topic: string
  category: string
  viralityScore: number
  growth: string
  contentIdea: string
  format: string
  thumbnail?: string
  channelName?: string
  videoId?: string
  viewCount?: number
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return `${n}`
}

function TrendsPage() {
  const { activePlatform, setActivePlatform } = usePlatform()
  const activePlt = PLATFORMS.find(p => p.code === activePlatform)!
  const [trends, setTrends] = useState<Trend[]>([])
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`/api/trends?platform=${activePlt.name}`)
      setTrends(res.data.trends || [])
      setSummary(res.data.summary || '')
    } catch {
      setTrends([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [activePlatform])

  const isYouTube = activePlatform === 'yt'

  return (
    <DashboardLayout title="Trends">
      <div className="p-6 space-y-6">

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold">🔥 Trend Discovery</h1>
            <p className="text-muted text-sm">Real-time trending topics</p>
          </div>
          <button onClick={load} disabled={loading} className="btn btn-ghost btn-sm gap-1.5">
            {loading ? <Spinner size={13} /> : '↻'} Refresh
          </button>
        </div>

        {/* Platform switcher */}
        <div className="flex gap-2 flex-wrap">
          {PLATFORMS.map(p => (
            <button key={p.code}
              onClick={() => setActivePlatform(p.code as any)}
              className={`plt-chip ${activePlatform === p.code ? 'active' : ''}`}
              style={{ borderColor: activePlatform === p.code ? p.color + '66' : undefined }}>
              <span style={{ color: p.color }}>{p.icon}</span>
              <span className="text-sm">{p.name}</span>
            </button>
          ))}
        </div>

        {/* Summary */}
        {summary && !loading && (
          <div className="card border-white/10 bg-white/5">
            <div className="flex items-start gap-3">
              <div className="text-2xl">✦</div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-cyan mb-1">Trend Summary</div>
                <p className="text-sm text-white/80 leading-relaxed">{summary}</p>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="card flex flex-col items-center justify-center py-20">
            <div className="loading-dots flex justify-center mb-4"><span /><span /><span /></div>
            <p className="text-muted text-sm">Loading {activePlt.name} trends...</p>
          </div>
        )}

        {!loading && trends.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trends.map((t, i) => {
              const scoreColor = t.viralityScore >= 85 ? '#00ff88' :
                                 t.viralityScore >= 70 ? '#ffc740' : '#00f5ff'
              const views = typeof t.viewCount === 'number' ? t.viewCount : 0

              return (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="card hover:border-white/10 transition-all duration-200 cursor-pointer
                             border-b-2 p-0 overflow-hidden"
                  style={{ borderBottomColor: scoreColor }}>

                  {/* Thumbnail (YouTube only) */}
                  {isYouTube && t.thumbnail && (
                    <div className="relative w-full aspect-video bg-black/30 overflow-hidden">
                      <img src={t.thumbnail} alt={t.topic}
                        className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      {/* Rank badge */}
                      <div className="absolute top-2 left-2 w-7 h-7 rounded-full bg-black/70
                                    flex items-center justify-center text-xs font-bold"
                        style={{ color: scoreColor }}>
                        {i + 1}
                      </div>
                      {/* Views badge */}
                      {views > 0 && (
                        <div className="absolute bottom-2 right-2 flex items-center gap-1
                                      bg-black/70 px-2 py-0.5 rounded text-[10px] text-white">
                          <FiEye size={9} /> {formatNum(views)}
                        </div>
                      )}
                      {/* Play button */}
                      {t.videoId && (
                        <a href={`https://youtube.com/watch?v=${t.videoId}`}
                          target="_blank" rel="noopener noreferrer"
                          className="absolute inset-0 flex items-center justify-center opacity-0
                                    hover:opacity-100 transition-opacity"
                          onClick={e => e.stopPropagation()}>
                          <div className="w-12 h-12 rounded-full bg-red-600/90 flex items-center justify-center">
                            <FiPlay className="text-white ml-0.5" size={20} />
                          </div>
                        </a>
                      )}
                    </div>
                  )}

                  <div className="p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-2 gap-2">
                      <div className="flex-1 min-w-0">
                        {!isYouTube && (
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-5 h-5 rounded-full bg-surf3 flex items-center justify-center
                                          text-xs font-bold" style={{ color: scoreColor }}>{i + 1}</div>
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

                    {/* Progress bar */}
                    <div className="h-1 bg-white/10 rounded-full overflow-hidden mb-2">
                      <motion.div className="h-full rounded-full" style={{ background: scoreColor }}
                        initial={{ width: '0%' }} animate={{ width: `${t.viralityScore}%` }}
                        transition={{ duration: 0.8, delay: i * 0.06 }} />
                    </div>

                    <div className="text-[10px] font-bold text-green mb-3">{t.growth}</div>

                    {/* Content idea */}
                    <div className="bg-surf2 rounded-lg p-2.5 mb-3">
                      <div className="text-[10px] text-muted mb-1">💡 Content Idea</div>
                      <p className="text-xs text-white/80 leading-relaxed">{t.contentIdea}</p>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/5
                                      border border-white/10 text-muted">{t.format}</span>
                      <div className="flex items-center gap-2">
                        {t.videoId && (
                          <a href={`https://youtube.com/watch?v=${t.videoId}`}
                            target="_blank" rel="noopener noreferrer"
                            className="text-muted hover:text-cyan transition-colors">
                            <FiExternalLink size={12} />
                          </a>
                        )}
                        <button className="text-xs text-cyan font-bold hover:underline">
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
          <EmptyState icon="📊" title="No trends loaded"
            description="Click Refresh to load trending topics"
            action={{ label: 'Load Trends', onClick: load }} />
        )}
      </div>
    </DashboardLayout>
  )
}

export default withAuth(TrendsPage)
