// pages/keywords.tsx — Keyword Intelligence
import { apiPost } from '../lib/api'
import React, { useState } from 'react'
import { useRouter } from 'next/router'
import { motion, AnimatePresence } from 'framer-motion'
import DashboardLayout from '../components/layout/DashboardLayout'
import { withAuth } from '../lib/withAuth'
import { usePlatform, PLATFORMS } from '../contexts/PlatformContext'
import { Spinner, EmptyState } from '../components/ui'
import toast from 'react-hot-toast'
import { FiPlus, FiSearch, FiDownload, FiTrash2, FiChevronDown, FiExternalLink, FiUpload } from 'react-icons/fi'

interface TopVideo {
  id: string; title: string; channel: string; thumbnail: string
  views: number; likes: number; age: string; url: string
}
interface KwResult {
  keyword: string; volume: string; avgTopViews: number
  competition: string; competingVideos: number; rankingChance: number
  trend: string; freshness: number; avgEngagement: number; idealLength: string
  verdict: { emoji: string; label: string; detail: string }
  related: string[]; topVideos: TopVideo[]; titleIdeas: string[]
}

const fmt = (n: number) =>
  n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : String(n)

const VOLUME_COLOR: Record<string, string> = {
  'Very High': '#00ff88', 'High': '#b4ff00', 'Medium': '#ffc740', 'Low': '#6060a0',
}
const COMP_COLOR: Record<string, string> = {
  'Easy': '#00ff88', 'Medium': '#ffc740', 'Hard': '#ff8040', 'Very Hard': '#ff3366',
}

function ScoreRingBig({ score }: { score: number }) {
  const color = score >= 70 ? '#00ff88' : score >= 45 ? '#ffc740' : '#ff3366'
  const r = 30, c = 2 * Math.PI * r
  return (
    <div className="relative w-[76px] h-[76px] flex-shrink-0">
      <svg width="76" height="76" className="-rotate-90">
        <circle cx="38" cy="38" r={r} stroke="rgba(255,255,255,0.07)" strokeWidth="6" fill="none" />
        <motion.circle cx="38" cy="38" r={r} stroke={color} strokeWidth="6" fill="none"
          strokeLinecap="round" strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (score / 100) * c }}
          transition={{ duration: 1 }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-xl" style={{ color }}>{score}%</span>
      </div>
    </div>
  )
}

function KeywordsPage() {
  const router = useRouter()
  const { activePlatform, setActivePlatform } = usePlatform()
  const activePlt = PLATFORMS.find(p => p.code === activePlatform)!
  const [input, setInput] = useState('')
  const [keywords, setKeywords] = useState<string[]>([])
  const [results, setResults] = useState<KwResult[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  // Header search bar lands here with ?q=
  React.useEffect(() => {
    const q = router.query.q
    if (typeof q === 'string' && q.trim()) {
      const kw = q.trim().toLowerCase()
      setKeywords([kw])
      analyze([kw])
      router.replace('/keywords', undefined, { shallow: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.query.q])

  const addKeyword = (raw?: string) => {
    const kw = (raw ?? input).trim().toLowerCase()
    if (!kw) return
    if (keywords.includes(kw)) { toast('Already added', { icon: '👀' }); return }
    if (keywords.length >= 10) { toast.error('Maximum 10 keywords'); return }
    setKeywords(k => [...k, kw])
    setInput('')
  }

  const analyze = async (list?: string[]) => {
    const kws = list || keywords
    if (!kws.length) { toast.error('Add at least one keyword'); return }
    setLoading(true)
    setResults([])
    try {
      const res = await apiPost('/api/keywords/analyze', { keywords: kws, platform: activePlt.name })
      setResults((res.data.analysis || []).filter((x: any) => x && x.keyword))
      if (res.data.analysis?.length) setExpanded(res.data.analysis[0].keyword)
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Analysis failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const useInUpload = (title: string) => {
    sessionStorage.setItem('srankiq_upload_prefill', JSON.stringify({
      title, platform: activePlatform, tags: keywords.join(', '),
    }))
    toast.success('Loaded into Smart Upload!')
    router.push('/upload')
  }

  const exportCSV = () => {
    if (!results.length) return
    const header = 'Keyword,Volume,Avg Top Views,Competition,Competing Videos,Ranking %,Trend,Freshness %,Engagement %,Verdict'
    const rows = results.map(r =>
      [r.keyword, r.volume, r.avgTopViews, r.competition, r.competingVideos,
       r.rankingChance, r.trend, r.freshness, r.avgEngagement, r.verdict.label].join(','))
    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `srankiq-keywords-${Date.now()}.csv`
    a.click()
  }

  const best = results.length
    ? results.reduce((a, b) => (a.rankingChance >= b.rankingChance ? a : b))
    : null

  return (
    <DashboardLayout title="Keyword Research">
      <div className="p-6 space-y-6 max-w-6xl">

        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold">🔍 Keyword Intelligence</h1>
            <p className="text-muted text-sm">Real search data, real competition, real opportunities</p>
          </div>
          {results.length > 0 && (
            <button onClick={exportCSV} className="btn btn-ghost btn-sm gap-1.5">
              <FiDownload size={13} /> Export CSV
            </button>
          )}
        </div>

        {/* INPUT */}
        <div className="card">
          <div className="label mb-2">Enter keywords to analyze</div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={15} />
              <input className="inp pl-9" placeholder="Type a keyword and press Enter..."
                value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addKeyword()} />
            </div>
            <button onClick={() => addKeyword()} className="btn btn-ghost gap-1.5">
              <FiPlus size={14} /> Add
            </button>
            <button onClick={() => analyze()} disabled={loading || !keywords.length}
              className="btn btn-cyan gap-1.5 px-6">
              {loading ? <Spinner size={14} /> : <FiSearch size={14} />} Analyze
            </button>
          </div>
          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {keywords.map(kw => (
                <span key={kw} className="badge-cyan flex items-center gap-1.5 text-xs px-2.5 py-1">
                  {kw}
                  <FiTrash2 size={11} className="cursor-pointer opacity-60 hover:opacity-100"
                    onClick={() => setKeywords(k => k.filter(x => x !== kw))} />
                </span>
              ))}
            </div>
          )}
          <p className="text-xs text-muted mt-3">
            Up to 10 keywords. Live search data for {activePlt.name} ranking analysis.
          </p>
        </div>

        {loading && (
          <div className="card flex flex-col items-center justify-center py-20">
            <div className="loading-dots flex justify-center mb-4"><span /><span /><span /></div>
            <p className="text-muted text-sm">Loading...</p>
          </div>
        )}

        {/* BEST OPPORTUNITY BANNER */}
        {!loading && best && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="card border-green/25 bg-green/5 flex items-center gap-4">
            <div className="text-3xl">{best.verdict?.emoji || '📊'}</div>
            <div className="flex-1">
              <div className="text-xs font-bold uppercase tracking-wider text-green mb-0.5">
                Best Opportunity
              </div>
              <div className="text-sm text-white">
                <b>"{best.keyword}"</b> — {best.rankingChance}% ranking chance · {best.volume} traffic · {best.competition} competition
              </div>
            </div>
            <button onClick={() => setExpanded(best.keyword)} className="btn btn-ghost btn-sm">
              View details
            </button>
          </motion.div>
        )}

        {/* RESULTS */}
        {!loading && results.map((r, i) => {
          const open = expanded === r.keyword
          return (
            <motion.div key={r.keyword} initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className="card">

              {/* Header row */}
              <div className="flex items-center gap-4 cursor-pointer"
                onClick={() => setExpanded(open ? null : r.keyword)}>
                <ScoreRingBig score={r.rankingChance} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-bold text-white text-lg">{r.keyword}</span>
                    <span className="text-base">{r.verdict?.emoji || '📊'}</span>
                    <span className="text-xs text-muted">{r.verdict?.label || 'Analyzed'}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="badge text-[10px] border"
                      style={{ color: VOLUME_COLOR[r.volume], borderColor: VOLUME_COLOR[r.volume] + '40', background: VOLUME_COLOR[r.volume] + '10' }}>
                      {r.volume} traffic
                    </span>
                    <span className="badge text-[10px] border"
                      style={{ color: COMP_COLOR[r.competition], borderColor: COMP_COLOR[r.competition] + '40', background: COMP_COLOR[r.competition] + '10' }}>
                      {r.competition} competition
                    </span>
                    <span className={`badge text-[10px] ${r.trend === 'Rising' ? 'badge-green' : r.trend === 'Stable' ? 'badge-gold' : 'badge-red'}`}>
                      {r.trend === 'Rising' ? '↗' : r.trend === 'Stable' ? '→' : '↘'} {r.trend}
                    </span>
                  </div>
                </div>
                <FiChevronDown size={18}
                  className={`text-muted transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
              </div>

              {/* Expanded detail */}
              <AnimatePresence>
                {open && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
                    className="overflow-hidden">
                    <div className="pt-5 mt-5 border-t border-white/5 space-y-5">

                      <p className="text-sm text-white/70">{r.verdict?.detail || ''}</p>

                      {/* Metric grid */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {[
                          { label: 'Avg views (top 10)', value: fmt(r.avgTopViews || 0) },
                          { label: 'Competing videos', value: fmt(r.competingVideos || 0) },
                          { label: 'Freshness', value: `${r.freshness ?? 0}% new` },
                          { label: 'Engagement rate', value: `${r.avgEngagement ?? 0}%` },
                          { label: 'Ideal length', value: r.idealLength || '—' },
                        ].map(m => (
                          <div key={m.label} className="bg-surf2 rounded-xl p-3">
                            <div className="font-display text-lg text-white">{m.value}</div>
                            <div className="text-[10px] text-muted uppercase tracking-wider">{m.label}</div>
                          </div>
                        ))}
                      </div>

                      {/* Top ranking videos */}
                      {(r.topVideos?.length ?? 0) > 0 && (
                        <div>
                          <div className="text-xs font-bold uppercase tracking-wider text-muted mb-2">
                            Who's ranking right now
                          </div>
                          <div className="space-y-2">
                            {(r.topVideos || []).map((v, vi) => (
                              <a key={v.id} href={v.url} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors group">
                                <span className="text-xs font-bold text-muted w-4">{vi + 1}</span>
                                {v.thumbnail && (
                                  /* eslint-disable-next-line @next/next/no-img-element */
                                  <img src={v.thumbnail} alt="" className="w-24 aspect-video object-cover rounded-lg flex-shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm text-white truncate group-hover:text-cyan transition-colors">{v.title}</div>
                                  <div className="text-xs text-muted">{v.channel} · {fmt(v.views)} views · {v.age}</div>
                                </div>
                                <FiExternalLink size={13} className="text-muted flex-shrink-0" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* AI title ideas */}
                      {(r.titleIdeas?.length ?? 0) > 0 && (
                        <div>
                          <div className="text-xs font-bold uppercase tracking-wider text-muted mb-2">
                            ✦ Title ideas to beat them
                          </div>
                          <div className="space-y-2">
                            {(r.titleIdeas || []).map((t, ti) => (
                              <div key={ti} className="flex items-center gap-3 bg-surf2 rounded-xl p-3">
                                <span className="text-sm text-white/85 flex-1">{t}</span>
                                <button onClick={() => useInUpload(t)}
                                  className="btn btn-cyan btn-sm gap-1 flex-shrink-0">
                                  <FiUpload size={11} /> Use
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Related keywords */}
                      {(r.related?.length ?? 0) > 0 && (
                        <div>
                          <div className="text-xs font-bold uppercase tracking-wider text-muted mb-2">
                            What people also search
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {(r.related || []).map(rel => (
                              <button key={rel} onClick={() => addKeyword(rel)}
                                className="badge-cyan text-xs px-2.5 py-1 hover:bg-cyan/20 transition-colors">
                                + {rel}
                              </button>
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
        })}

        {!loading && results.length === 0 && (
          <EmptyState icon="🔍" title="No analysis yet"
            description="Add keywords above and click Analyze to see real ranking data"
            action={{ label: 'Analyze', onClick: () => analyze() }} />
        )}
      </div>
    </DashboardLayout>
  )
}

export default withAuth(KeywordsPage)
