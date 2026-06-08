// pages/ai-tools.tsx
import { apiPost, apiGet } from '../lib/api'
import React, { useState } from 'react'
import { motion } from 'framer-motion'
import DashboardLayout from '../components/layout/DashboardLayout'
import { withAuth } from '../lib/withAuth'
import { usePlatform, PLATFORMS } from '../contexts/PlatformContext'
import { AIBadge, ScoreRing, Spinner, TabBar } from '../components/ui'
import toast from 'react-hot-toast'
import { FiCopy, FiRefreshCw, FiZap, FiType, FiHash, FiAlignLeft, FiCheckCircle } from 'react-icons/fi'

type Tool = 'titles' | 'description' | 'hashtags' | 'seo' | 'ideas' | 'thumb'

// Section-scoped scanning animation: green line sweeps upward inside the panel
function SeoLaser() {
  const [pct, setPct] = React.useState(0)
  React.useEffect(() => {
    const iv = setInterval(() => setPct(p => (p >= 99 ? 99 : p + 1)), 60)
    return () => clearInterval(iv)
  }, [])
  return (
    <div className="relative h-72 rounded-xl overflow-hidden border border-green/20"
      style={{ background: 'repeating-linear-gradient(0deg, rgba(0,255,136,0.04) 0 1px, transparent 1px 24px), repeating-linear-gradient(90deg, rgba(0,255,136,0.04) 0 1px, transparent 1px 24px)' }}>
      {/* corner brackets */}
      {(['top-2 left-2 border-t-2 border-l-2', 'top-2 right-2 border-t-2 border-r-2',
         'bottom-2 left-2 border-b-2 border-l-2', 'bottom-2 right-2 border-b-2 border-r-2'] as string[]).map((c, i) => (
        <div key={i} className={`absolute w-5 h-5 border-green/60 ${c}`} />
      ))}
      {/* sweeping green line, bottom → top */}
      <motion.div
        className="absolute left-0 right-0 h-[2px]"
        style={{ background: '#00ff88', boxShadow: '0 0 18px 4px rgba(0,255,136,0.55)' }}
        initial={{ top: '100%' }}
        animate={{ top: ['100%', '0%'] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-display text-5xl text-green" style={{ textShadow: '0 0 24px rgba(0,255,136,0.5)' }}>
          {pct}%
        </div>
        <div className="text-xs text-green/80 uppercase tracking-[0.3em] mt-2">Scanning SEO</div>
      </div>
    </div>
  )
}

function AIToolsPage() {
  const { activePlatform } = usePlatform()
  const activePlt = PLATFORMS.find(p => p.code === activePlatform)!
  const [tool, setTool] = useState<Tool>('titles')

  // Shared inputs
  const [topic, setTopic] = useState('')
  const [keywords, setKeywords] = useState('')
  const [tone, setTone] = useState('engaging')

  // SEO inputs
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDesc, setSeoDesc] = useState('')
  const [seoTags, setSeoTags] = useState('')

  // Results — kept per tab so switching between Description/SEO/etc preserves each
  const [resultsMap, setResultsMap] = useState<Record<string, any>>({})
  const results = resultsMap[tool]
  const setResults = (val: any) => setResultsMap(m => ({ ...m, [tool]: val }))
  const [loading, setLoading] = useState(false)

  const copy = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard!')
  }

  const runTool = async () => {
    if (!topic && tool !== 'seo') { toast.error(tool === 'thumb' ? 'Enter your video title' : 'Please enter a topic'); return }
    if (tool === 'seo' && !seoTitle) { toast.error('Please enter a title for SEO analysis'); return }
    setLoading(true)
    setResults(null)
    try {
      let res
      const kwArr = keywords.split(',').map(k => k.trim()).filter(Boolean)
      switch (tool) {
        case 'titles':
          res = await apiPost('/api/ai/titles', { topic, platform: activePlt.name, keywords: kwArr, style: tone })
          break
        case 'description':
          res = await apiPost('/api/ai/description', { title: topic, platform: activePlt.name, keywords: kwArr, tone })
          break
        case 'hashtags':
          res = await apiPost('/api/ai/hashtags', { topic, platform: activePlt.name, count: 25 })
          break
        case 'seo':
          res = await apiPost('/api/ai/seo', {
            title: seoTitle, description: seoDesc, platform: activePlt.name,
            tags: seoTags.split(',').map(t => t.trim()).filter(Boolean)
          })
          break
        case 'thumb':
          res = await apiPost('/api/ai/thumbnail', { title: topic, style: tone, platform: activePlt.name })
          break
        case 'ideas':
          res = await apiPost('/api/ai/ideas', { niche: topic, platform: activePlt.name, count: 8, audience: 'general' })
          break
      }
      setResults(res?.data)
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'AI generation failed')
    } finally {
      setLoading(false)
    }
  }

  const TABS = [
    { label: '📝 Titles', value: 'titles' },
    { label: '📄 Description', value: 'description' },
    { label: '#️⃣ Hashtags', value: 'hashtags' },
    { label: '🔬 SEO Scan', value: 'seo' },
    { label: '🖼️ Thumbnails', value: 'thumb' },
    { label: '💡 Content Ideas', value: 'ideas' },
  ]

  return (
    <DashboardLayout title="AI Tools">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan/20 to-magenta/20
                        border border-cyan/20 flex items-center justify-center text-cyan text-xl">✦</div>
          <div>
            <h1 className="text-xl font-bold">AI Content Tools</h1>
            <p className="text-muted text-sm">Powered by SRankIQ AI</p>
          </div>
          <AIBadge />
        </div>

        <TabBar tabs={TABS} active={tool} onChange={v => setTool(v as Tool)} />

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Input Panel */}
          <div className="card space-y-4">
            <h3 className="font-bold text-white flex items-center gap-2">
              <FiZap size={16} className="text-cyan" /> Input
            </h3>

            {tool === 'seo' ? (
              <>
                <div>
                  <label className="label">Title *</label>
                  <input className="inp" value={seoTitle} onChange={e => setSeoTitle(e.target.value)}
                    placeholder="Your video/post title..." />
                </div>
                <div>
                  <label className="label">Description</label>
                  <textarea className="inp min-h-24 resize-none" value={seoDesc}
                    onChange={e => setSeoDesc(e.target.value)} placeholder="Your description..." />
                </div>
                <div>
                  <label className="label">Tags (comma separated)</label>
                  <input className="inp" value={seoTags} onChange={e => setSeoTags(e.target.value)}
                    placeholder="tag1, tag2, tag3..." />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="label">
                    {tool === 'ideas' ? 'Your Niche' : tool === 'description' ? 'Video/Post Title' : 'Topic or Keyword'} *
                  </label>
                  <input className="inp" value={topic} onChange={e => setTopic(e.target.value)}
                    placeholder={
                      tool === 'ideas' ? 'e.g. personal finance, fitness, cooking...' :
                      tool === 'description' ? 'e.g. How to invest $1000 in 2026' :
                      'e.g. how to make money online'
                    } />
                </div>
                <div>
                  <label className="label">Keywords (optional, comma separated)</label>
                  <input className="inp" value={keywords} onChange={e => setKeywords(e.target.value)}
                    placeholder="keyword1, keyword2, keyword3..." />
                </div>
                <div>
                  <label className="label">Tone / Style</label>
                  <select className="inp bg-surf2" value={tone} onChange={e => setTone(e.target.value)}>
                    <option value="engaging">Engaging & Entertaining</option>
                    <option value="professional">Professional & Authoritative</option>
                    <option value="educational">Educational & Informative</option>
                    <option value="conversational">Conversational & Friendly</option>
                    <option value="viral">Viral & Click-worthy</option>
                    <option value="storytelling">Storytelling & Narrative</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="label">Platform</label>
              <div className="flex items-center gap-2 p-3 bg-surf2 rounded-lg border border-white/10">
                <span style={{ color: activePlt.color }}>{activePlt.icon}</span>
                <span className="text-sm font-semibold">{activePlt.name}</span>
                <span className="text-xs text-muted ml-auto">Switch in sidebar</span>
              </div>
            </div>

            <button onClick={runTool} disabled={loading}
              className="btn btn-cyan w-full justify-center gap-2">
              {loading ? <Spinner size={16} /> : <FiZap size={15} />}
              {loading
                ? (tool === 'seo' ? 'Scanning...' : tool === 'thumb' ? 'Designing...' : 'Generating...')
                : (tool === 'seo' ? '🔬 Scan SEO →' : tool === 'thumb' ? '🖼️ Generate Thumbnail →' : 'Generate with AI →')}
            </button>
          </div>

          {/* Results Panel */}
          <div className="card min-h-64">
            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
              ✦ AI Results
              {results && <AIBadge />}
            </h3>

            {loading && tool === 'seo' && <SeoLaser />}
            {loading && tool !== 'seo' && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="loading-dots flex justify-center mb-4"><span /><span /><span /></div>
                <p className="text-muted text-sm">Generating your content...</p>
              </div>
            )}

            {!loading && !results && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="text-4xl mb-3">✦</div>
                <p className="text-muted text-sm">Fill in the inputs and click Generate to see AI results</p>
              </div>
            )}

            {/* THUMBNAIL Result */}
            {!loading && results?.image && (
              <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                className="space-y-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={results.image} alt="AI thumbnail"
                  className="w-full rounded-xl border border-white/10" />
                <div className="flex gap-2">
                  <a href={results.image} download="srankiq-thumbnail.png"
                    className="btn btn-cyan btn-sm gap-1.5 flex-1 justify-center">
                    ⬇ Download
                  </a>
                  <button onClick={runTool} className="btn btn-ghost btn-sm flex-1">
                    🔄 Regenerate
                  </button>
                </div>
                <p className="text-[10px] text-muted">
                  Tip: regenerate a few times and pick the strongest — every run is a fresh design.
                </p>
              </motion.div>
            )}

            {/* TITLES Results */}
            {!loading && results?.titles && (
              <div className="space-y-2">
                {results.titles.map((t: any, i: number) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-start gap-3 p-3 bg-surf2 rounded-xl border border-white/5
                               hover:border-white/10 transition-colors group">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white leading-snug">{t.title}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="badge-cyan text-[9px]">{t.type}</span>
                        <span className="text-[10px] text-muted">Score: <span className="text-cyan font-bold">{t.score}</span></span>
                      </div>
                    </div>
                    <button onClick={() => copy(t.title)}
                      className="opacity-0 group-hover:opacity-100 text-muted hover:text-white transition-all">
                      <FiCopy size={14} />
                    </button>
                  </motion.div>
                ))}
                <button onClick={() => copy(results.titles.map((t: any) => t.title).join('\n'))}
                  className="btn btn-ghost btn-sm w-full justify-center gap-1.5 mt-2">
                  <FiCopy size={12} /> Copy All Titles
                </button>
              </div>
            )}

            {/* DESCRIPTION Results */}
            {!loading && results?.description && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="relative">
                  <pre className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed bg-surf2
                                 p-4 rounded-xl border border-white/5 max-h-96 overflow-y-auto
                                 font-sans">{results.description}</pre>
                  <button onClick={() => copy(results.description)}
                    className="absolute top-3 right-3 btn btn-ghost btn-sm gap-1.5">
                    <FiCopy size={12} /> Copy
                  </button>
                </div>
              </motion.div>
            )}

            {/* HASHTAGS Results */}
            {!loading && results?.hashtags && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex flex-wrap gap-2 mb-4">
                  {results.hashtags.map((h: any, i: number) => (
                    <button key={i} onClick={() => copy(h.tag)}
                      className={`px-2.5 py-1 rounded-full text-sm font-semibold transition-all
                                 hover:scale-105 ${
                        h.volume === 'high' ? 'bg-cyan/10 text-cyan border border-cyan/20' :
                        h.volume === 'medium' ? 'bg-gold/10 text-gold border border-gold/20' :
                        'bg-white/5 text-white/60 border border-white/10'
                      }`}>
                      {h.tag}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  {['high', 'medium', 'niche'].map(v => (
                    <div key={v} className={`text-xs flex items-center gap-1 ${
                      v === 'high' ? 'text-cyan' : v === 'medium' ? 'text-gold' : 'text-muted'}`}>
                      <div className={`w-2 h-2 rounded-full ${
                        v === 'high' ? 'bg-cyan' : v === 'medium' ? 'bg-gold' : 'bg-white/20'}`} />
                      {v}
                    </div>
                  ))}
                  <button onClick={() => copy(results.hashtags.map((h: any) => h.tag).join(' '))}
                    className="btn btn-ghost btn-sm gap-1.5 ml-auto">
                    <FiCopy size={12} /> Copy All
                  </button>
                </div>
              </motion.div>
            )}

            {/* SEO Results */}
            {!loading && results?.score !== undefined && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="flex items-center gap-6">
                  <ScoreRing score={results.score} label="Overall SEO" size={90} />
                  <ScoreRing score={results.viralScore || 70} label="Viral Score" size={90} color="#ff0090" />
                  <div className="flex-1 space-y-2">
                    <div className="text-sm">
                      <div className="flex justify-between mb-1">
                        <span className="text-muted text-xs">Title</span>
                        <span className="text-cyan text-xs font-bold">{results.titleScore}%</span>
                      </div>
                      <div className="progress"><div className="progress-fill bg-cyan" style={{ width: `${results.titleScore}%` }} /></div>
                    </div>
                    <div className="text-sm">
                      <div className="flex justify-between mb-1">
                        <span className="text-muted text-xs">Description</span>
                        <span className="text-magenta text-xs font-bold">{results.descriptionScore}%</span>
                      </div>
                      <div className="progress"><div className="progress-fill bg-magenta" style={{ width: `${results.descriptionScore}%` }} /></div>
                    </div>
                    <div className="text-sm">
                      <div className="flex justify-between mb-1">
                        <span className="text-muted text-xs">Tags</span>
                        <span className="text-green text-xs font-bold">{results.tagsScore}%</span>
                      </div>
                      <div className="progress"><div className="progress-fill bg-green" style={{ width: `${results.tagsScore}%` }} /></div>
                    </div>
                  </div>
                </div>
                {results.suggestions?.length > 0 && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Suggestions</p>
                    <ul className="space-y-1.5">
                      {results.suggestions.map((s: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                          <span className="text-cyan mt-0.5 flex-shrink-0">→</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            )}

            {/* IDEAS Results */}
            {!loading && results?.ideas && (
              <div className="space-y-3">
                {results.ideas.map((idea: any, i: number) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="p-3 bg-surf2 rounded-xl border border-white/5">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-semibold text-white leading-snug">{idea.title}</p>
                      <span className="badge-cyan text-[9px] flex-shrink-0">{idea.viralScore}</span>
                    </div>
                    <p className="text-xs text-muted mb-2">{idea.hook}</p>
                    <div className="flex items-center gap-3 text-[10px] text-muted">
                      <span>📅 {idea.bestPostingTime}</span>
                      <span>📊 {idea.estimatedViews}</span>
                      <span className={`font-bold ${idea.difficulty === 'Easy' ? 'text-green' : idea.difficulty === 'Hard' ? 'text-red' : 'text-gold'}`}>
                        {idea.difficulty}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default withAuth(AIToolsPage)
