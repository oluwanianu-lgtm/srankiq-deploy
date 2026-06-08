// pages/niche-finder.tsx — Niche Finder: real opportunity analysis from YouTube data
import { apiPost } from '../lib/api'
import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import DashboardLayout from '../components/layout/DashboardLayout'
import { withAuth } from '../lib/withAuth'
import { Spinner, EmptyState } from '../components/ui'
import toast from 'react-hot-toast'
import { FiSearch, FiExternalLink, FiChevronDown, FiTrendingUp, FiUsers, FiEye } from 'react-icons/fi'

interface NicheTopVideo {
  id: string; title: string; channel: string; channelSubs: number
  views: number; publishedAt: string; thumbnail: string; url: string; tags?: string[]
}
interface NicheResult {
  seed: string; totalResults: number; sampleSize: number
  avgViews: number; medianViews: number; avgChannelSubs: number
  freshVideos: number; smallChannelWins: number
  competitionScore: number; demandScore: number; opportunityScore: number
  verdict: string; topVideos: NicheTopVideo[]
}

const fmt = (n: number) =>
  n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : String(n || 0)

const scoreColor = (s: number) => s >= 70 ? '#00ff88' : s >= 50 ? '#b4ff00' : s >= 35 ? '#ffc740' : '#ff3366'
const compColor = (s: number) => s >= 70 ? '#ff3366' : s >= 45 ? '#ffc740' : '#00ff88' // high competition = red

const POPULAR = ['gregorian chant', 'faceless youtube', 'ai automation', 'personal finance', 'true crime', 'meditation music']

function ScoreRing({ value, label, color }: { value: number; label: string; color: string }) {
  const r = 26, c = 2 * Math.PI * r
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#ffffff14" strokeWidth="6" />
        <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (value / 100) * c} />
        <text x="32" y="32" transform="rotate(90 32 32)" textAnchor="middle" dominantBaseline="central"
          fill="#fff" fontSize="15" fontWeight="700">{value}</text>
      </svg>
      <span className="text-[10px] text-muted uppercase tracking-wider">{label}</span>
    </div>
  )
}

function NicheFinderPage() {
  const [seed, setSeed] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<NicheResult[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)

  const run = async (term?: string) => {
    const q = (term ?? seed).trim()
    if (!q) { toast.error('Enter a niche or topic'); return }
    if (term) setSeed(term)
    setLoading(true); setSearched(true); setResults([])
    try {
      const res = await apiPost('/api/niche/analyze', { seed: q, region: 'US' })
      const r: NicheResult[] = res.data.results || []
      if (r.length === 0) toast.error('No data found — try a broader term')
      setResults(r)
      if (r.length) setExpanded(r[0].seed)
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Analysis failed — try again')
    } finally { setLoading(false) }
  }

  const best = results[0]

  return (
    <DashboardLayout title="Niche Finder">
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-display text-white">Niche Finder</h1>
          <p className="text-sm text-muted mt-1">
            Find low-competition, high-demand niches. Every score is computed from live YouTube data — real view counts, channel sizes, and upload activity.
          </p>
        </div>

        {/* Search */}
        <div className="card">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
              <input className="inp pl-9" placeholder="Enter a niche or topic, e.g. 'gregorian chant'"
                value={seed} onChange={e => setSeed(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') run() }} />
            </div>
            <button onClick={() => run()} disabled={loading} className="btn btn-cyan gap-1.5 px-6">
              {loading ? <Spinner size={15} /> : <FiSearch size={15} />} {loading ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>
          {!searched && (
            <div className="flex flex-wrap gap-2 mt-3">
              {POPULAR.map(p => (
                <button key={p} onClick={() => run(p)} className="badge-cyan text-[11px] cursor-pointer hover:brightness-125">{p}</button>
              ))}
            </div>
          )}
        </div>

        {loading && (
          <div className="card flex flex-col items-center justify-center py-16">
            <div className="loading-dots flex justify-center mb-4"><span /><span /><span /></div>
            <p className="text-muted text-sm">Pulling live YouTube data for each sub-niche…</p>
            <p className="text-muted text-[11px] mt-1">Analyzing view counts, channel sizes, and upload activity.</p>
          </div>
        )}

        {/* Best opportunity banner */}
        {!loading && best && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="card border-2" style={{ borderColor: scoreColor(best.opportunityScore) + '66' }}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted">Best opportunity found</div>
                <div className="text-xl font-bold text-white mt-1">{best.seed}</div>
                <div className="text-sm mt-1" style={{ color: scoreColor(best.opportunityScore) }}>{best.verdict}</div>
              </div>
              <ScoreRing value={best.opportunityScore} label="Opportunity" color={scoreColor(best.opportunityScore)} />
            </div>
          </motion.div>
        )}

        {/* Results */}
        {!loading && results.map(r => {
          const open = expanded === r.seed
          return (
            <div key={r.seed} className="card">
              <button onClick={() => setExpanded(open ? null : r.seed)} className="w-full flex items-center gap-4 text-left">
                <div className="flex-1 min-w-0">
                  <div className="text-base font-bold text-white">{r.seed}</div>
                  <div className="text-xs mt-0.5" style={{ color: scoreColor(r.opportunityScore) }}>{r.verdict}</div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-muted">
                    <span className="flex items-center gap-1"><FiEye size={11} /> {fmt(r.avgViews)} avg views</span>
                    <span className="flex items-center gap-1"><FiUsers size={11} /> {fmt(r.avgChannelSubs)} avg subs</span>
                    <span className="flex items-center gap-1"><FiTrendingUp size={11} /> {r.freshVideos}/{r.sampleSize} fresh (90d)</span>
                    {r.smallChannelWins > 0 && <span className="text-green">★ {r.smallChannelWins} small-channel wins</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <ScoreRing value={r.opportunityScore} label="Opp." color={scoreColor(r.opportunityScore)} />
                  <FiChevronDown size={18} className={`text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
                </div>
              </button>

              <AnimatePresence>
                {open && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="pt-5 mt-5 border-t border-white/8 space-y-5">
                      {/* Score breakdown */}
                      <div className="flex items-center justify-around bg-surf2 rounded-xl py-4">
                        <ScoreRing value={r.demandScore} label="Demand" color={scoreColor(r.demandScore)} />
                        <ScoreRing value={r.competitionScore} label="Competition" color={compColor(r.competitionScore)} />
                        <ScoreRing value={r.opportunityScore} label="Opportunity" color={scoreColor(r.opportunityScore)} />
                      </div>

                      {/* Real metric grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {[
                          ['Total videos', fmt(r.totalResults)],
                          ['Avg views (top)', fmt(r.avgViews)],
                          ['Median views', fmt(r.medianViews)],
                          ['Avg channel subs', fmt(r.avgChannelSubs)],
                          ['Fresh uploads (90d)', `${r.freshVideos} of ${r.sampleSize}`],
                          ['Small-channel wins', String(r.smallChannelWins)],
                        ].map(([label, val]) => (
                          <div key={label} className="bg-surf2 rounded-lg p-3">
                            <div className="text-[10px] text-muted uppercase tracking-wider">{label}</div>
                            <div className="text-lg font-bold text-white mt-0.5">{val}</div>
                          </div>
                        ))}
                      </div>

                      {/* Real ranking videos */}
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2">Who's ranking right now</div>
                        <div className="space-y-2">
                          {r.topVideos.map((v, i) => (
                            <div key={v.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors group">
                              <span className="text-xs font-bold text-muted w-4">{i + 1}</span>
                              {v.thumbnail && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={v.thumbnail} alt="" onClick={() => window.open(v.url, '_blank')}
                                  className="w-24 aspect-video object-cover rounded-lg flex-shrink-0 cursor-pointer" />
                              )}
                              <div className="flex-1 min-w-0">
                                <div onClick={() => window.open(v.url, '_blank')}
                                  className="text-sm text-white truncate group-hover:text-cyan transition-colors cursor-pointer">{v.title}</div>
                                <div className="text-xs text-muted">
                                  {v.channel} · {fmt(v.channelSubs)} subs · {fmt(v.views)} views
                                  {v.channelSubs > 0 && v.channelSubs < 50000 && (
                                    <span className="text-green"> · small channel ✦</span>
                                  )}
                                </div>
                              </div>
                              <a href={v.url} target="_blank" rel="noopener noreferrer"
                                className="text-muted hover:text-white flex-shrink-0"><FiExternalLink size={13} /></a>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}

        {!loading && searched && results.length === 0 && (
          <EmptyState icon="🔍" title="No niche data found" description="Try a broader or more popular topic." />
        )}
        {!searched && !loading && (
          <EmptyState icon="🧭" title="Find your next niche"
            description="Enter a topic above. SRankIQ analyzes related sub-niches using live YouTube data and ranks them by real opportunity." />
        )}
      </div>
    </DashboardLayout>
  )
}

export default withAuth(NicheFinderPage)
