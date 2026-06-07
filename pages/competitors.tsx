// pages/competitors.tsx
import { apiPost, apiGet } from '../lib/api'
import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import DashboardLayout from '../components/layout/DashboardLayout'
import { withAuth } from '../lib/withAuth'
import { usePlatform, PLATFORMS } from '../contexts/PlatformContext'
import { AIBadge, Spinner, EmptyState } from '../components/ui'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { saveCompetitor, getCompetitors, deleteCompetitor } from '../services/firestore'
import { FiPlus, FiTrash2, FiRefreshCw, FiSearch } from 'react-icons/fi'

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
      const res = await apiPost('/api/competitors/analyze', {
        channelName: name,
        platform: activePlt.name,
        niche: niche || 'general',
      })
      setAnalysis(res.data)
      if (save && user) {
        await saveCompetitor(user.uid, { name, platform: activePlt.name, data: res.data })
        await loadSaved()
        toast.success(`${name} added to competitors`)
      }
    } catch (err: any) {
      toast.error('Analysis failed. Try again.')
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
            <p className="text-muted text-sm">AI-powered competitor analysis for {activePlt.name}</p>
          </div>
          <AIBadge />
        </div>

        {/* Add competitor */}
        <div className="card">
          <h3 className="font-bold text-white mb-4">Analyze a Competitor</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div className="md:col-span-2">
              <label className="label">Channel / Account Name</label>
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={14} />
                <input className="inp pl-9" value={newName} onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. MrBeast, MKBHD, Gary Vee..." />
              </div>
            </div>
            <div>
              <label className="label">Niche (optional)</label>
              <input className="inp" value={niche} onChange={e => setNiche(e.target.value)}
                placeholder="e.g. tech, finance, fitness" />
            </div>
          </div>
          <button onClick={() => { if (newName) { analyze(newName); setNewName('') } else toast.error('Enter a name') }}
            disabled={loading}
            className="btn btn-cyan gap-2">
            {loading ? <Spinner size={15} /> : <FiPlus size={15} />}
            {loading ? 'Analyzing...' : 'Analyze Competitor'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Saved list */}
          <div className="card">
            <h3 className="font-bold text-white mb-4">Saved Competitors ({savedCompetitors.length})</h3>
            {savedCompetitors.length === 0 ? (
              <p className="text-muted text-sm text-center py-8">No competitors saved yet</p>
            ) : (
              <div className="space-y-2">
                {savedCompetitors.map((c: any) => (
                  <div key={c.id} className="flex items-center gap-3 p-3 bg-surf2 rounded-xl
                                            border border-white/5 hover:border-white/10 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan/20 to-magenta/20
                                  flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {c.name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{c.name}</div>
                      <div className="text-xs text-muted">{c.platform}</div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => analyze(c.name, false)}
                        className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-muted hover:text-cyan">
                        {analyzing === c.name ? <Spinner size={12} /> : <FiRefreshCw size={12} />}
                      </button>
                      <button onClick={() => remove(c.id)}
                        className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-muted hover:text-red">
                        <FiTrash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Analysis */}
          <div className="lg:col-span-2">
            {loading && (
              <div className="card flex flex-col items-center justify-center py-20">
                <div className="loading-dots flex justify-center mb-4"><span /><span /><span /></div>
                <p className="text-muted text-sm">Loading...</p>
              </div>
            )}

            {!loading && analysis && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                {/* Header */}
                <div className="card">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan/20 to-magenta/20
                                  flex items-center justify-center text-2xl font-display text-white">
                      {analysis.name?.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">{analysis.name}</h2>
                      <div className="text-muted text-sm">{analysis.platform}</div>
                    </div>
                    <AIBadge />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { l: 'Est. Subscribers', v: analysis.estimatedSubscribers },
                      { l: 'Avg Views', v: analysis.avgViews },
                      { l: 'Engagement', v: analysis.engagementRate },
                    ].map(s => (
                      <div key={s.l} className="bg-surf2 rounded-xl p-3 text-center">
                        <div className="text-lg font-display text-cyan">{s.v || '—'}</div>
                        <div className="text-[10px] text-muted">{s.l}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Strategy */}
                  <div className="card">
                    <h4 className="font-bold text-white mb-3 text-sm">📋 Content Strategy</h4>
                    <p className="text-sm text-white/70 leading-relaxed">{analysis.contentStrategy}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {analysis.topContentTypes?.map((t: string, i: number) => (
                        <span key={i} className="badge-cyan text-[10px]">{t}</span>
                      ))}
                    </div>
                  </div>

                  {/* Keywords */}
                  <div className="card">
                    <h4 className="font-bold text-white mb-3 text-sm">🔑 Ranking Keywords</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.rankingKeywords?.map((kw: string, i: number) => (
                        <span key={i} className="px-2 py-1 bg-surf2 border border-white/10
                                                 rounded-full text-xs text-white/70">{kw}</span>
                      ))}
                    </div>
                  </div>

                  {/* Strengths */}
                  <div className="card">
                    <h4 className="font-bold text-green mb-3 text-sm">✅ Strengths</h4>
                    <ul className="space-y-1.5">
                      {analysis.strengths?.map((s: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-white/70">
                          <span className="text-green mt-0.5">→</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Opportunities */}
                  <div className="card">
                    <h4 className="font-bold text-cyan mb-3 text-sm">💡 Your Opportunities</h4>
                    <ul className="space-y-1.5">
                      {analysis.opportunities?.map((o: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-white/70">
                          <span className="text-cyan mt-0.5">→</span> {o}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}

            {!loading && !analysis && (
              <EmptyState icon="👥" title="Select a competitor"
                description="Enter a channel name above to get AI-powered competitor analysis" />
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default withAuth(CompetitorsPage)
