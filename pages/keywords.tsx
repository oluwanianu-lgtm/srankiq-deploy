// pages/keywords.tsx
import { apiPost, apiGet } from '../lib/api'
import React, { useState } from 'react'
import { motion } from 'framer-motion'
import DashboardLayout from '../components/layout/DashboardLayout'
import { withAuth } from '../lib/withAuth'
import { usePlatform, PLATFORMS } from '../contexts/PlatformContext'
import { RankBadge, AIBadge, Spinner, SectionHeader } from '../components/ui'
import { KeywordRankingChart } from '../components/charts/AnalyticsChart'
import toast from 'react-hot-toast'
import { FiSearch, FiTrendingUp, FiPlus, FiTrash2, FiDownload } from 'react-icons/fi'
import { useAuth } from '../contexts/AuthContext'
import { saveKeywordSearch } from '../services/firestore'

interface KeywordResult {
  keyword: string
  volume: string
  competition: string
  rankingChance: number
  trend: string
  related: string[]
}

function KeywordsPage() {
  const { activePlatform } = usePlatform()
  const { user } = useAuth()
  const activePlt = PLATFORMS.find(p => p.code === activePlatform)!

  const [input, setInput] = useState('')
  const [keywords, setKeywords] = useState<string[]>([])
  const [results, setResults] = useState<KeywordResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const addKeyword = () => {
    const kw = input.trim()
    if (!kw) return
    if (keywords.includes(kw)) { toast.error('Keyword already added'); return }
    if (keywords.length >= 10) { toast.error('Max 10 keywords at once'); return }
    setKeywords(prev => [...prev, kw])
    setInput('')
  }

  const removeKeyword = (kw: string) => setKeywords(prev => prev.filter(k => k !== kw))

  const analyze = async () => {
    if (!keywords.length) { toast.error('Add at least one keyword'); return }
    setLoading(true)
    setSearched(true)
    try {
      const res = await apiPost('/api/keywords/analyze', {
        keywords,
        platform: activePlt.name,
      })
      setResults(res.data.analysis || [])
      // Save to Firestore
      if (user) {
        await saveKeywordSearch(user.uid, {
          keywords,
          platform: activePlt.name,
          results: res.data.analysis || [],
        }).catch(() => {})
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Keyword analysis failed')
    } finally {
      setLoading(false)
    }
  }

  const exportCSV = () => {
    if (!results.length) return
    const csv = [
      ['Keyword', 'Volume', 'Competition', 'Ranking Chance %', 'Trend'],
      ...results.map(r => [r.keyword, r.volume, r.competition, r.rankingChance, r.trend])
    ].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'srankiq-keywords.csv'; a.click()
  }

  const chartData = results.map(r => ({ keyword: r.keyword, ranking: r.rankingChance }))

  return (
    <DashboardLayout title="Keyword Research">
      <div className="p-6 space-y-6">

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold">🔍 Keyword Research</h1>
            <p className="text-muted text-sm">Analyze ranking potential for {activePlt.name} keywords</p>
          </div>
          {results.length > 0 && (
            <button onClick={exportCSV} className="btn btn-ghost btn-sm gap-1.5">
              <FiDownload size={13} /> Export CSV
            </button>
          )}
        </div>

        {/* Search Input */}
        <div className="card">
          <label className="label mb-3">Enter Keywords to Analyze</label>
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={15} />
              <input
                className="inp pl-10"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addKeyword() }}
                placeholder="Type a keyword and press Enter or click Add..."
              />
            </div>
            <button onClick={addKeyword} className="btn btn-ghost gap-1.5">
              <FiPlus size={15} /> Add
            </button>
            <button onClick={analyze} disabled={loading || !keywords.length}
              className="btn btn-cyan gap-1.5">
              {loading ? <Spinner size={15} /> : <FiSearch size={15} />}
              {loading ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>

          {/* Keyword chips */}
          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {keywords.map(kw => (
                <div key={kw} className="flex items-center gap-1.5 px-3 py-1.5 bg-surf2
                                        border border-white/10 rounded-full text-sm">
                  <span>{kw}</span>
                  <button onClick={() => removeKeyword(kw)}
                    className="text-muted hover:text-red transition-colors">
                    <FiTrash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-muted mt-3">
            Add up to 10 keywords. Powered by Gemini AI for {activePlt.name} ranking analysis.
          </p>
        </div>

        {/* Results */}
        {loading && (
          <div className="card flex flex-col items-center justify-center py-16">
            <div className="loading-dots flex justify-center mb-4"><span /><span /><span /></div>
            <p className="text-muted text-sm">Analyzing keyword ranking potential with Gemini AI...</p>
          </div>
        )}

        {!loading && searched && results.length > 0 && (
          <>
            {/* Chart */}
            <div className="card">
              <SectionHeader title="📊 Ranking Potential Overview" subtitle="Higher % = better chance of ranking" />
              <KeywordRankingChart data={chartData} height={Math.max(150, results.length * 35)} />
            </div>

            {/* Table */}
            <div className="card overflow-x-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white">Detailed Analysis</h3>
                <AIBadge />
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Keyword</th>
                    <th>Search Volume</th>
                    <th>Competition</th>
                    <th>Ranking %</th>
                    <th>Trend</th>
                    <th>Related Keywords</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <motion.tr key={i} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}>
                      <td className="font-semibold text-white">{r.keyword}</td>
                      <td>
                        <span className={`badge ${
                          r.volume === 'Very High' ? 'badge-green' :
                          r.volume === 'High' ? 'badge-cyan' :
                          r.volume === 'Medium' ? 'badge-gold' : 'badge-magenta'
                        }`}>{r.volume}</span>
                      </td>
                      <td>
                        <span className={`badge ${
                          r.competition === 'Easy' ? 'badge-green' :
                          r.competition === 'Medium' ? 'badge-gold' : 'badge-red'
                        }`}>{r.competition}</span>
                      </td>
                      <td>
                        <RankBadge value={r.rankingChance} />
                      </td>
                      <td>
                        <span className={`text-sm font-semibold ${
                          r.trend === 'Rising' ? 'text-green' :
                          r.trend === 'Stable' ? 'text-cyan' : 'text-muted'
                        }`}>
                          {r.trend === 'Rising' ? '↑' : r.trend === 'Declining' ? '↓' : '→'} {r.trend}
                        </span>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {r.related?.slice(0, 3).map(kw => (
                            <button key={kw} onClick={() => { setKeywords(p => [...p, kw]); }}
                              className="text-[10px] px-2 py-0.5 rounded-full bg-surf2
                                        border border-white/10 text-muted hover:text-white
                                        hover:border-white/20 transition-colors">
                              + {kw}
                            </button>
                          ))}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="card text-center py-12">
            <div className="text-4xl mb-3">🤔</div>
            <p className="text-muted">No results returned. Try different keywords.</p>
          </div>
        )}

      </div>
    </DashboardLayout>
  )
}

export default withAuth(KeywordsPage)
