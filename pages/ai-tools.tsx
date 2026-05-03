// pages/ai-tools.tsx
import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import DashboardLayout from '../components/layout/DashboardLayout'
import { withAuth } from '../lib/withAuth'
import { usePlatform, PLATFORMS } from '../contexts/PlatformContext'
import { AIBadge, ScoreRing, Spinner, TabBar } from '../components/ui'
import axios from 'axios'
import toast from 'react-hot-toast'
import { FiCopy, FiZap, FiAlertCircle, FiUpload } from 'react-icons/fi'
import { useRouter } from 'next/router'

type Tool = 'titles' | 'description' | 'hashtags'

function AIToolsPage() {
  const { activePlatform } = usePlatform()
  const activePlt = PLATFORMS.find(p => p.code === activePlatform)!
  const router = useRouter()
  const [tool, setTool] = useState<Tool>('titles')
  const [topic, setTopic] = useState('')
  const [keywords, setKeywords] = useState('')
  const [tone, setTone] = useState('engaging')
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  // Pre-fill topic from keyword research "Use" button
  useEffect(() => {
    const t = router.query.topic as string
    if (t) setTopic(decodeURIComponent(t))
  }, [router.query.topic])

  const copy = (text: string) => { navigator.clipboard.writeText(text); toast.success('Copied!') }

  const runTool = async () => {
    if (!topic) { toast.error('Please enter a topic'); return }
    setLoading(true); setResults(null)
    try {
      const kwArr = keywords.split(',').map(k => k.trim()).filter(Boolean)
      let res
      if (tool === 'titles')
        res = await axios.post('/api/ai/titles', { topic, platform: activePlt.name, keywords: kwArr, style: tone })
      else if (tool === 'description')
        res = await axios.post('/api/ai/description', { title: topic, platform: activePlt.name, keywords: kwArr, tone })
      else
        res = await axios.post('/api/ai/hashtags', { topic, platform: activePlt.name, count: 10 })
      setResults(res?.data)
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Generation failed')
    } finally { setLoading(false) }
  }

  // Publish to Smart Upload — store data in sessionStorage and redirect
  const publishToUpload = () => {
    if (!results) return
    const uploadData = {
      title: topic,
      description: results.description || '',
      tags: keywords,
      hashtags: results.hashtags ? results.hashtags.map((h: any) => h.tag).join(' ') : '',
      platform: activePlt.name,
    }
    sessionStorage.setItem('srankiq_upload_prefill', JSON.stringify(uploadData))
    toast.success('Redirecting to Smart Upload...')
    setTimeout(() => router.push('/upload?prefill=1'), 500)
  }

  const TABS = [
    { label: '📝 Titles', value: 'titles' },
    { label: '📄 Description', value: 'description' },
    { label: '#️⃣ Hashtags', value: 'hashtags' },
  ]

  const isYT = activePlatform === 'yt'

  return (
    <DashboardLayout title="AI Tools">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan/20 to-magenta/20
                        border border-cyan/20 flex items-center justify-center text-cyan text-xl">✦</div>
          <div>
            <h1 className="text-xl font-bold">AI Content Tools</h1>
            <p className="text-muted text-sm">Generate optimized content with AI</p>
          </div>
          <AIBadge />
        </div>

        <TabBar tabs={TABS} active={tool} onChange={v => { setTool(v as Tool); setResults(null) }} />

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input */}
          <div className="card space-y-4">
            <h3 className="font-bold text-white flex items-center gap-2">
              <FiZap size={16} className="text-cyan" /> Input
            </h3>

            <div>
              <label className="label">
                {tool === 'description' ? 'Video / Post Title' : 'Topic or Keyword'} *
              </label>
              <input className="inp" value={topic} onChange={e => setTopic(e.target.value)}
                placeholder={tool === 'description' ? 'e.g. How to invest $1000 in 2026' : 'e.g. how to make money online'} />
            </div>

            {tool !== 'hashtags' && (
              <div>
                <label className="label">Keywords (optional, comma separated)</label>
                <input className="inp" value={keywords} onChange={e => setKeywords(e.target.value)}
                  placeholder="keyword1, keyword2..." />
              </div>
            )}

            {(tool === 'titles' || tool === 'description') && (
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
            )}

            <div>
              <label className="label">Platform</label>
              <div className="flex items-center gap-2 p-3 bg-surf2 rounded-lg border border-white/10">
                <span style={{ color: activePlt.color }}>{activePlt.icon}</span>
                <span className="text-sm font-semibold">{activePlt.name}</span>
                <span className="text-xs text-muted ml-auto">Switch in sidebar</span>
              </div>
            </div>

            {tool === 'titles' && isYT && (
              <div className="flex items-start gap-2 p-3 bg-gold/5 border border-gold/20 rounded-xl">
                <FiAlertCircle size={14} className="text-gold flex-shrink-0 mt-0.5" />
                <p className="text-xs text-gold/80">Generating 5 titles optimized for YouTube SEO — 55–70 characters each.</p>
              </div>
            )}

            {tool === 'hashtags' && (
              <div className="flex items-start gap-2 p-3 bg-cyan/5 border border-cyan/20 rounded-xl">
                <span className="text-cyan text-sm">#</span>
                <p className="text-xs text-cyan/80">Generates 10 hashtags — high-volume, medium, and niche.</p>
              </div>
            )}

            <button onClick={runTool} disabled={loading} className="btn btn-cyan w-full justify-center gap-2">
              {loading ? <Spinner size={16} /> : <FiZap size={15} />}
              {loading ? 'Generating...' : 'Generate with AI →'}
            </button>
          </div>

          {/* Results */}
          <div className="card min-h-64">
            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
              ✦ AI Results {results && <AIBadge />}
            </h3>

            {loading && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="loading-dots flex justify-center mb-4"><span /><span /><span /></div>
                <p className="text-muted text-sm">Generating your content...</p>
              </div>
            )}

            {!loading && !results && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="text-4xl mb-3">✦</div>
                <p className="text-muted text-sm">Fill in the topic and click Generate</p>
              </div>
            )}

            {/* TITLES */}
            {!loading && results?.titles && (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-muted">{results.titles.length} titles generated</span>
                  <button onClick={() => copy(results.titles.map((t: any) => t.title).join('\n'))}
                    className="btn btn-ghost btn-sm gap-1.5 text-xs">
                    <FiCopy size={11} /> Copy All
                  </button>
                </div>
                {results.titles.map((t: any, i: number) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-start gap-3 p-3 bg-surf2 rounded-xl border border-white/5
                               hover:border-white/10 transition-colors group">
                    <div className="w-5 h-5 rounded-full bg-surf3 flex items-center justify-center
                                  text-[10px] font-bold text-muted flex-shrink-0 mt-0.5">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white leading-snug mb-1">{t.title}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-muted border border-white/10">{t.type}</span>
                        <span className="text-[10px] text-muted">Score: <span className="text-cyan font-bold">{t.score}</span></span>
                        <span className={`text-[10px] font-semibold ${
                          t.title?.length >= 55 && t.title?.length <= 70 ? 'text-green' :
                          t.title?.length >= 40 ? 'text-gold' : 'text-red/70'}`}>
                          {t.title?.length || 0} chars
                        </span>
                      </div>
                    </div>
                    <button onClick={() => copy(t.title)}
                      className="opacity-0 group-hover:opacity-100 text-muted hover:text-white transition-all flex-shrink-0">
                      <FiCopy size={14} />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}

            {/* DESCRIPTION */}
            {!loading && results?.description && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="relative">
                  <pre className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed bg-surf2
                                 p-4 rounded-xl border border-white/5 max-h-96 overflow-y-auto font-sans">
                    {results.description}
                  </pre>
                  <button onClick={() => copy(results.description)}
                    className="absolute top-3 right-3 btn btn-ghost btn-sm gap-1.5">
                    <FiCopy size={12} /> Copy
                  </button>
                </div>
              </motion.div>
            )}

            {/* HASHTAGS */}
            {!loading && results?.hashtags && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-muted">{results.hashtags.length} hashtags</span>
                  <button onClick={() => copy(results.hashtags.map((h: any) => h.tag).join(' '))}
                    className="btn btn-ghost btn-sm gap-1.5 text-xs">
                    <FiCopy size={11} /> Copy All
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {results.hashtags.map((h: any, i: number) => (
                    <button key={i} onClick={() => copy(h.tag)}
                      className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all hover:scale-105 ${
                        h.volume === 'high' ? 'bg-cyan/10 text-cyan border border-cyan/20' :
                        h.volume === 'medium' ? 'bg-gold/10 text-gold border border-gold/20' :
                        'bg-white/5 text-white/60 border border-white/10'}`}>
                      {h.tag}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-4 mb-4">
                  {['high', 'medium', 'niche'].map(v => (
                    <div key={v} className={`text-xs flex items-center gap-1.5 ${
                      v === 'high' ? 'text-cyan' : v === 'medium' ? 'text-gold' : 'text-muted'}`}>
                      <div className={`w-2 h-2 rounded-full ${v === 'high' ? 'bg-cyan' : v === 'medium' ? 'bg-gold' : 'bg-white/20'}`} />
                      {v}
                    </div>
                  ))}
                </div>
                {/* Publish Button */}
                <div className="border-t border-white/5 pt-4">
                  <button onClick={publishToUpload}
                    className="btn btn-cyan w-full justify-center gap-2">
                    <FiUpload size={15} /> Publish — Send to Smart Upload
                  </button>
                  <p className="text-[10px] text-muted text-center mt-2">
                    Copies your topic, keywords & hashtags directly into Smart Upload
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default withAuth(AIToolsPage)
