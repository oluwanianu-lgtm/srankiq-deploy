// pages/2-keywords.tsx  (replace keywords.tsx)
import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import DashboardLayout from '../components/layout/DashboardLayout'
import { withAuth } from '../lib/withAuth'
import { usePlatform, PLATFORMS } from '../contexts/PlatformContext'
import { Spinner } from '../components/ui'
import axios from 'axios'
import toast from 'react-hot-toast'
import { FiSearch, FiPlus, FiTrash2, FiDownload, FiUsers, FiYoutube, FiExternalLink, FiArrowRight, FiStar } from 'react-icons/fi'
import { useAuth } from '../contexts/AuthContext'
import { saveKeywordSearch } from '../services/firestore'
import { useRouter } from 'next/router'

interface KeywordRow {
  keyword: string; videoCount: number; volume: string
  competition: string; rankingChance: number; trend: string; related?: string[]
}
interface TopChannel {
  channelId: string; channelTitle: string; thumbnail: string
  subscriberCount: number; viewCount: number; url: string; keyword: string
}

function formatNum(n: number): string {
  if (n >= 1e9) return `${(n/1e9).toFixed(1)}B`
  if (n >= 1e6) return `${(n/1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n/1e3).toFixed(1)}K`
  return `${n}`
}

function RankingBar({ value }: { value: number }) {
  const color = value >= 70 ? '#00ff88' : value >= 40 ? '#ffc740' : '#ff0090'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-bold w-8" style={{ color }}>{value}%</span>
    </div>
  )
}

function KeywordsPage() {
  const { activePlatform } = usePlatform()
  const { user } = useAuth()
  const router = useRouter()
  const activePlt = PLATFORMS.find(p => p.code === activePlatform)!
  const [input, setInput] = useState('')
  const [keywords, setKeywords] = useState<string[]>([])
  const [results, setResults] = useState<KeywordRow[]>([])
  const [relatedKeywords, setRelatedKeywords] = useState<KeywordRow[]>([])
  const [easyKeywords, setEasyKeywords] = useState<KeywordRow[]>([])
  const [topChannels, setTopChannels] = useState<TopChannel[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const MAX = 5

  useEffect(() => {
    const opt = router.query.optimize as string
    if (opt && !keywords.includes(opt)) setKeywords([opt])
  }, [router.query.optimize])

  useEffect(() => {
    const topic = router.query.topic as string
    if (topic && !keywords.includes(topic)) setKeywords([topic])
  }, [router.query.topic])

  const addKeyword = () => {
    const kw = input.trim()
    if (!kw) return
    if (keywords.includes(kw)) { toast.error('Already added'); return }
    if (keywords.length >= MAX) { toast.error(`Max ${MAX} keywords`); return }
    setKeywords(p => [...p, kw]); setInput('')
  }

  const analyze = async () => {
    if (!keywords.length) { toast.error('Add at least one keyword'); return }
    setLoading(true); setSearched(true)
    setResults([]); setRelatedKeywords([]); setEasyKeywords([]); setTopChannels([])
    try {
      const res = await axios.post('/api/keywords/analyze', { keywords, platform: activePlt.name })
      setResults(res.data.analysis || [])
      setRelatedKeywords(res.data.relatedKeywords || [])
      setEasyKeywords(res.data.easyKeywords || [])
      setTopChannels(res.data.topChannels || [])
      if (user) await saveKeywordSearch(user.uid, { keywords, platform: activePlt.name, results: res.data.analysis || [] }).catch(() => {})
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Keyword analysis failed')
    } finally { setLoading(false) }
  }

  const useInAITools = (kw: string) => router.push(`/ai-tools?topic=${encodeURIComponent(kw)}`)

  // Click channel → redirect to competitors page with channel auto-analyzed
  const analyzeChannel = (ch: TopChannel) => {
    router.push(`/competitors?channel=${encodeURIComponent(ch.channelTitle)}`)
  }

  const exportCSV = () => {
    const all = [...relatedKeywords, ...easyKeywords]
    if (!all.length) return
    const csv = [['Keyword','Videos','Volume','Competition','Ranking %','Trend'],
      ...all.map(r => [r.keyword, r.videoCount, r.volume, r.competition, r.rankingChance, r.trend])
    ].map(r => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = 'srankiq-keywords.csv'; a.click()
  }

  const volBadge = (v: string) => v === 'Very High' ? 'badge-green' : v === 'High' ? 'badge-cyan' : v === 'Medium' ? 'badge-gold' : 'badge-magenta'
  const compBadge = (c: string) => c === 'Easy' ? 'badge-green' : c === 'Medium' ? 'badge-gold' : 'badge-red'

  return (
    <DashboardLayout title="Keyword Research">
      <div className="p-6 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold">🔍 Keyword Research</h1>
            <p className="text-muted text-sm">Real YouTube keywords — click Use for AI Tools, click channels to analyze them</p>
          </div>
          {(relatedKeywords.length > 0 || easyKeywords.length > 0) && (
            <button onClick={exportCSV} className="btn btn-ghost btn-sm gap-1.5">
              <FiDownload size={13} /> Export CSV
            </button>
          )}
        </div>

        <div className="card">
          <label className="label mb-3">Enter Keywords to Analyze</label>
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={15} />
              <input className="inp pl-10" value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addKeyword() }}
                placeholder="Type a keyword and press Enter..."
                disabled={keywords.length >= MAX} />
            </div>
            <button onClick={addKeyword} disabled={keywords.length >= MAX} className="btn btn-ghost gap-1.5">
              <FiPlus size={15} /> Add
            </button>
            <button onClick={analyze} disabled={loading || !keywords.length} className="btn btn-cyan gap-1.5">
              {loading ? <Spinner size={15} /> : <FiSearch size={15} />}
              {loading ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>
          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {keywords.map(kw => (
                <div key={kw} className="flex items-center gap-1.5 px-3 py-1.5 bg-surf2 border border-cyan/30 rounded-full text-sm">
                  <span className="text-cyan">🔍</span><span>{kw}</span>
                  <button onClick={() => setKeywords(p => p.filter(k => k !== kw))} className="text-muted hover:text-red transition-colors">
                    <FiTrash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-muted">
            Add up to {MAX} keywords.
            {keywords.length > 0 && <span className="text-cyan ml-2">{MAX - keywords.length} remaining</span>}
          </p>
        </div>

        {loading && (
          <div className="card flex flex-col items-center justify-center py-16">
            <div className="loading-dots flex justify-center mb-4"><span /><span /><span /></div>
            <p className="text-muted text-sm">Fetching real YouTube keyword data...</p>
            <p className="text-xs text-muted/50 mt-1">Also generating easy-to-rank keyword opportunities...</p>
          </div>
        )}

        <AnimatePresence>
          {!loading && searched && (results.length > 0 || relatedKeywords.length > 0 || easyKeywords.length > 0) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

              {/* Your keywords */}
              {results.length > 0 && (
                <div className="card overflow-x-auto">
                  <h3 className="font-bold text-white mb-4">📊 Your Keywords — Ranking Potential</h3>
                  <table className="data-table">
                    <thead><tr><th>Keyword</th><th>Videos</th><th>Volume</th><th>Competition</th><th>Ranking Chance</th><th>Trend</th><th></th></tr></thead>
                    <tbody>
                      {results.map((r, i) => (
                        <motion.tr key={i} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                          <td className="font-semibold text-white">{r.keyword}</td>
                          <td className="text-muted text-sm">{formatNum(r.videoCount)}</td>
                          <td><span className={`badge ${volBadge(r.volume)}`}>{r.volume}</span></td>
                          <td><span className={`badge ${compBadge(r.competition)}`}>{r.competition}</span></td>
                          <td className="min-w-[140px]"><RankingBar value={r.rankingChance} /></td>
                          <td><span className={`text-sm font-semibold ${r.trend === 'Rising' ? 'text-green' : r.trend === 'Stable' ? 'text-cyan' : 'text-muted'}`}>
                            {r.trend === 'Rising' ? '↑' : r.trend === 'Declining' ? '↓' : '→'} {r.trend}
                          </span></td>
                          <td>
                            <button onClick={() => useInAITools(r.keyword)}
                              className="flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-lg bg-cyan/10 text-cyan border border-cyan/20 hover:bg-cyan/20 transition-colors font-semibold whitespace-nowrap">
                              Use <FiArrowRight size={9} />
                            </button>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Related keywords */}
              {relatedKeywords.length > 0 && (
                <div className="card overflow-x-auto">
                  <div className="mb-4">
                    <h3 className="font-bold text-white">🎯 {relatedKeywords.length} Related Keywords</h3>
                    <p className="text-xs text-muted mt-0.5">Click Use → AI Tools · Click channels → Competitor analysis</p>
                  </div>
                  <table className="data-table">
                    <thead><tr><th>#</th><th>Keyword</th><th>Videos</th><th>Volume</th><th>Competition</th><th>Ranking Chance</th><th></th></tr></thead>
                    <tbody>
                      {relatedKeywords.map((r, i) => (
                        <motion.tr key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                          <td className="text-muted text-sm w-8">{i + 1}</td>
                          <td className="font-medium text-white">{r.keyword}</td>
                          <td className="text-muted text-sm">{formatNum(r.videoCount)}</td>
                          <td><span className={`badge text-[10px] ${volBadge(r.volume)}`}>{r.volume}</span></td>
                          <td><span className={`badge text-[10px] ${compBadge(r.competition)}`}>{r.competition}</span></td>
                          <td className="min-w-[120px]"><RankingBar value={r.rankingChance} /></td>
                          <td>
                            <div className="flex gap-1.5">
                              <button onClick={() => {
                                if (!keywords.includes(r.keyword) && keywords.length < MAX) { setKeywords(p => [...p, r.keyword]); toast.success('Added') }
                                else if (keywords.length >= MAX) toast.error('Max reached')
                              }} className="text-[10px] px-2 py-1 rounded-full bg-surf2 border border-white/10 text-muted hover:text-white hover:border-white/20 transition-colors">
                                + Add
                              </button>
                              <button onClick={() => useInAITools(r.keyword)}
                                className="text-[10px] px-2 py-1 rounded-full bg-cyan/10 border border-cyan/20 text-cyan hover:bg-cyan/20 transition-colors font-semibold">
                                Use →
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Easy keywords */}
              {easyKeywords.length > 0 && (
                <div className="card overflow-x-auto">
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <FiStar size={16} className="text-gold" />
                      <h3 className="font-bold text-white">Best Keywords to Use</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold/20 text-gold border border-gold/30 font-semibold">
                        {easyKeywords.length} opportunities
                      </span>
                    </div>
                    <p className="text-xs text-muted">
                      These have significantly lower competition — ideal for building channel momentum and ranking faster than bigger channels.
                    </p>
                  </div>
                  <table className="data-table">
                    <thead><tr><th>#</th><th>Keyword</th><th>Videos</th><th>Volume</th><th>Competition</th><th>Ranking Chance</th><th></th></tr></thead>
                    <tbody>
                      {easyKeywords.map((r, i) => (
                        <motion.tr key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.02 }}
                          className={r.competition === 'Easy' ? 'bg-green/5' : r.competition === 'Medium' ? 'bg-gold/5' : ''}>
                          <td className="text-muted text-sm w-8">{i + 1}</td>
                          <td className="font-medium text-white">
                            {r.keyword}
                            {r.competition === 'Easy' && <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded bg-green/20 text-green">✓ Easy win</span>}
                            {r.competition === 'Medium' && r.rankingChance >= 50 && <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded bg-gold/20 text-gold">↗ Good shot</span>}
                          </td>
                          <td className="text-muted text-sm">{formatNum(r.videoCount)}</td>
                          <td><span className={`badge text-[10px] ${volBadge(r.volume)}`}>{r.volume}</span></td>
                          <td><span className={`badge text-[10px] ${compBadge(r.competition)}`}>{r.competition}</span></td>
                          <td className="min-w-[120px]"><RankingBar value={r.rankingChance} /></td>
                          <td>
                            <div className="flex gap-1.5">
                              <button onClick={() => {
                                if (!keywords.includes(r.keyword) && keywords.length < MAX) { setKeywords(p => [...p, r.keyword]); toast.success('Added') }
                                else if (keywords.length >= MAX) toast.error('Max reached')
                              }} className="text-[10px] px-2 py-1 rounded-full bg-surf2 border border-white/10 text-muted hover:text-white transition-colors">
                                + Add
                              </button>
                              <button onClick={() => useInAITools(r.keyword)}
                                className="text-[10px] px-2 py-1 rounded-full bg-cyan/10 border border-cyan/20 text-cyan hover:bg-cyan/20 transition-colors font-semibold">
                                Use →
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Top channels — clicking redirects to competitors */}
              {topChannels.length > 0 && (
                <div className="card">
                  <div className="mb-4">
                    <h3 className="font-bold text-white">🏆 Top Channels Using These Keywords</h3>
                    <p className="text-xs text-muted mt-0.5">Click any channel to open full competitor analysis →</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {topChannels.map((ch, i) => (
                      <motion.div key={ch.channelId} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => analyzeChannel(ch)}
                        className="flex items-center gap-3 p-3 bg-surf2 rounded-xl border border-white/5
                                  hover:border-cyan/20 hover:bg-cyan/5 transition-all cursor-pointer group">
                        <div className="relative flex-shrink-0">
                          {ch.thumbnail
                            ? <img src={ch.thumbnail} alt={ch.channelTitle} className="w-10 h-10 rounded-full object-cover border border-white/10" />
                            : <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan/20 to-magenta/20 flex items-center justify-center text-white font-bold">{ch.channelTitle?.charAt(0)}</div>
                          }
                          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center">
                            <FiYoutube size={8} className="text-white" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-white truncate group-hover:text-cyan transition-colors">{ch.channelTitle}</div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs text-cyan flex items-center gap-1"><FiUsers size={10} /> {formatNum(ch.subscriberCount)} subs</span>
                            <span className="text-xs text-muted">{formatNum(ch.viewCount)} views</span>
                          </div>
                          <div className="text-[10px] text-muted/60 mt-0.5">keyword: <span className="text-cyan/60">{ch.keyword}</span></div>
                        </div>
                        <div className="text-[10px] text-cyan font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          Analyze →
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {!loading && searched && results.length === 0 && relatedKeywords.length === 0 && (
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
