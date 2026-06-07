// pages/trends.tsx
import { apiPost, apiGet } from '../lib/api'
import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import DashboardLayout from '../components/layout/DashboardLayout'
import { withAuth } from '../lib/withAuth'
import { usePlatform, PLATFORMS } from '../contexts/PlatformContext'
import { AIBadge, Spinner, SectionHeader, EmptyState } from '../components/ui'

interface Trend {
  topic: string
  category: string
  viralityScore: number
  growth: string
  contentIdea: string
  format: string
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
      const res = await apiGet(`/api/trends?platform=${activePlt.name}`)
      setTrends(res.data.trends || [])
      setSummary(res.data.summary || '')
    } catch {
      setTrends([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [activePlatform])

  const categories = Array.from(new Set(trends.map(t => t.category)))

  return (
    <DashboardLayout title="Trends">
      <div className="p-6 space-y-6">

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold">🔥 Trend Discovery</h1>
            <p className="text-muted text-sm">Real-time trending topics powered by Gemini AI</p>
          </div>
          <div className="flex items-center gap-2">
            <AIBadge />
            <button onClick={load} disabled={loading}
              className="btn btn-ghost btn-sm gap-1.5">
              {loading ? <Spinner size={13} /> : '↻'} Refresh
            </button>
          </div>
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
          <div className="card border-cyan/20 bg-cyan/5">
            <div className="flex items-start gap-3">
              <div className="text-2xl">✦</div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-cyan mb-1">AI Trend Summary</div>
                <p className="text-sm text-white/80 leading-relaxed">{summary}</p>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="card flex flex-col items-center justify-center py-20">
            <div className="loading-dots flex justify-center mb-4"><span /><span /><span /></div>
            <p className="text-muted text-sm">Analyzing {activePlt.name} trends with Gemini AI...</p>
          </div>
        )}

        {!loading && trends.length > 0 && (
          <>
            {/* Top trends */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trends.slice(0, 6).map((t, i) => {
                const scoreColor = t.viralityScore >= 85 ? '#00ff88' :
                                   t.viralityScore >= 70 ? '#ffc740' : '#00f5ff'
                return (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                    className="card hover:border-white/10 transition-all duration-200 cursor-pointer
                               border-b-2" style={{ borderBottomColor: scoreColor }}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-surf3 flex items-center justify-center
                                      font-display text-xl" style={{ color: scoreColor }}>
                          {i + 1}
                        </div>
                        <div>
                          <div className="text-[10px] text-muted uppercase tracking-wider">{t.category}</div>
                          <div className="text-sm font-bold text-white leading-tight">{t.topic}</div>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="font-display text-2xl" style={{ color: scoreColor }}>{t.viralityScore}</div>
                        <div className="text-[9px] text-muted">Virality</div>
                      </div>
                    </div>

                    <div className="progress mb-3">
                      <motion.div className="progress-fill" style={{ background: scoreColor }}
                        initial={{ width: '0%' }} animate={{ width: `${t.viralityScore}%` }}
                        transition={{ duration: 0.8, delay: i * 0.07 }} />
                    </div>

                    <div className="text-[10px] font-bold text-green mb-2">{t.growth}</div>

                    <div className="bg-surf2 rounded-lg p-2.5 mb-2">
                      <div className="text-[10px] text-muted mb-1">💡 Content Idea</div>
                      <p className="text-xs text-white/80 leading-relaxed">{t.contentIdea}</p>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="badge-cyan text-[9px]">{t.format}</span>
                      <button className="text-xs text-cyan font-bold hover:underline">
                        Use this idea →
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </div>

            {/* Remaining as list */}
            {trends.length > 6 && (
              <div className="card">
                <SectionHeader title="More Trending Topics" />
                <div className="space-y-2">
                  {trends.slice(6).map((t, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 hover:bg-white/5
                                           rounded-xl transition-colors">
                      <div className="w-6 h-6 rounded-full bg-surf3 flex items-center justify-center
                                    text-xs font-bold text-muted">{i + 7}</div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-white">{t.topic}</div>
                        <div className="text-xs text-muted">{t.category} · {t.growth}</div>
                      </div>
                      <div className="text-sm font-display" style={{
                        color: t.viralityScore >= 85 ? '#00ff88' : t.viralityScore >= 70 ? '#ffc740' : '#00f5ff'
                      }}>
                        {t.viralityScore}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
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
