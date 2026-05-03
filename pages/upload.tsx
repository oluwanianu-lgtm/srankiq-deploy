// pages/upload.tsx
import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import DashboardLayout from '../components/layout/DashboardLayout'
import { withAuth } from '../lib/withAuth'
import { usePlatform, PLATFORMS } from '../contexts/PlatformContext'
import { ScoreRing, AIBadge, Spinner } from '../components/ui'
import axios from 'axios'
import toast from 'react-hot-toast'
import { FiUpload, FiCheck, FiAlertCircle, FiArrowRight, FiArrowLeft, FiZap, FiLock } from 'react-icons/fi'
import { useAuth } from '../contexts/AuthContext'
import { saveUpload } from '../services/firestore'
import Link from 'next/link'
import { useRouter } from 'next/router'

const STEPS = ['Platform', 'Details', 'AI Optimize', 'SEO Scan', 'Review']

interface UploadForm {
  platform: string; title: string; description: string
  tags: string; file?: File | null; hashtags: string
}
interface SeoResult {
  score: number; titleScore: number; descriptionScore: number
  tagsScore: number; suggestions: string[]; viralScore: number; engagementPrediction: string
}

function UploadPage() {
  const { activePlatform, isConnected } = usePlatform()
  const { user } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<UploadForm>({
    platform: activePlatform, title: '', description: '', tags: '', file: null, hashtags: '',
  })
  const [seo, setSeo] = useState<SeoResult | null>(null)
  const [aiTitles, setAiTitles] = useState<any[]>([])
  const [scanning, setScanning] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const activePlt = PLATFORMS.find(p => p.code === form.platform as any)!
  const connectedPlatforms = PLATFORMS.filter(p => isConnected(p.code as any))

  // Read prefill data from AI Tools "Publish" button
  useEffect(() => {
    if (router.query.prefill === '1') {
      try {
        const raw = sessionStorage.getItem('srankiq_upload_prefill')
        if (raw) {
          const data = JSON.parse(raw)
          // Find matching platform
          const matchedPlt = PLATFORMS.find(p => p.name === data.platform && isConnected(p.code as any))
          setForm(f => ({
            ...f,
            title: data.title || f.title,
            description: data.description || f.description,
            tags: data.tags || f.tags,
            hashtags: data.hashtags || f.hashtags,
            platform: matchedPlt?.code || f.platform,
          }))
          sessionStorage.removeItem('srankiq_upload_prefill')
          // Jump to details step if a connected platform exists
          if (matchedPlt) {
            setStep(1)
            toast.success('Content from AI Tools loaded! Review and continue.')
          }
        }
      } catch { /* ignore */ }
    }
  }, [router.query.prefill])

  const generateAI = async () => {
    if (!form.title) { toast.error('Enter a title first'); return }
    setGenerating(true)
    try {
      const [titlesRes, hashRes] = await Promise.all([
        axios.post('/api/ai/titles', { topic: form.title, platform: activePlt.name, style: 'viral', keywords: [] }),
        axios.post('/api/ai/hashtags', { topic: form.title, platform: activePlt.name, count: 10 }),
      ])
      setAiTitles(titlesRes.data.titles?.slice(0, 5) || [])
      setForm(f => ({ ...f, hashtags: hashRes.data.hashtags?.map((h: any) => h.tag).join(' ') || '' }))
      toast.success('AI suggestions generated!')
    } catch { toast.error('AI generation failed') }
    finally { setGenerating(false) }
  }

  const runSeoScan = async () => {
    if (!form.title) { toast.error('Enter a title first'); return }
    setScanning(true); setSeo(null)
    try {
      const res = await axios.post('/api/ai/seo', {
        title: form.title, description: form.description,
        platform: activePlt.name, tags: form.tags.split(',').map(t => t.trim()),
      })
      setSeo(res.data)
    } catch { toast.error('SEO scan failed') }
    finally { setScanning(false) }
  }

  const handlePublish = async () => {
    setUploading(true)
    try {
      if (user) {
        await saveUpload(user.uid, {
          title: form.title, description: form.description, tags: form.tags,
          platform: activePlt.name, hashtags: form.hashtags, seoScore: seo?.score, status: 'saved',
        })
      }
      toast.success('Content saved!')
      setStep(0)
      setForm({ platform: activePlatform, title: '', description: '', tags: '', file: null, hashtags: '' })
      setSeo(null)
    } catch { toast.error('Failed to save') }
    finally { setUploading(false) }
  }

  const canNext = () => {
    if (step === 0) return !!form.platform && isConnected(form.platform as any)
    if (step === 1) return form.title.length >= 5
    return true
  }

  const SeoCheck = ({ score, label }: { score: number; label: string }) => (
    <div className="flex items-center gap-3">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
        score >= 70 ? 'bg-green/20 text-green' : score >= 50 ? 'bg-gold/20 text-gold' : 'bg-red/20 text-red'}`}>
        {score >= 70 ? <FiCheck size={10} /> : <FiAlertCircle size={10} />}
      </div>
      <div className="flex-1 text-sm text-white/80">{label}</div>
      <div className="text-sm font-bold" style={{ color: score >= 70 ? '#00ff88' : score >= 50 ? '#ffc740' : '#ff3366' }}>{score}%</div>
    </div>
  )

  return (
    <DashboardLayout title="Smart Upload">
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-cyan/10 border border-cyan/20 flex items-center justify-center text-cyan">
            <FiUpload size={18} />
          </div>
          <div>
            <h1 className="text-xl font-bold">Smart Upload Wizard</h1>
            <p className="text-muted text-sm">AI-optimize your content before publishing</p>
          </div>
        </div>

        {/* Steps */}
        <div className="flex items-center mb-8">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  i < step ? 'bg-green text-black' : i === step ? 'bg-cyan text-black' : 'bg-surf2 text-muted'}`}>
                  {i < step ? <FiCheck size={12} /> : i + 1}
                </div>
                <div className={`text-[10px] mt-1 font-semibold ${i === step ? 'text-cyan' : 'text-muted'}`}>{s}</div>
              </div>
              {i < STEPS.length - 1 && (
                <div className="flex-1 h-px mx-2 mb-4" style={{ background: i < step ? '#00ff88' : 'rgba(255,255,255,0.08)' }} />
              )}
            </React.Fragment>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="card min-h-80">

            {step === 0 && (
              <div>
                <h2 className="font-bold text-white text-lg mb-2">Choose Platform</h2>
                <p className="text-muted text-sm mb-6">
                  Only connected platforms can be selected.
                  {connectedPlatforms.length === 0 && (
                    <Link href="/settings"><span className="text-cyan ml-1 hover:underline cursor-pointer">Connect a platform →</span></Link>
                  )}
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {PLATFORMS.map(p => {
                    const connected = isConnected(p.code as any)
                    return (
                      <button key={p.code}
                        onClick={() => { if (!connected) { toast('Connect in Settings first', { icon: '🔒' }); return } setForm(f => ({ ...f, platform: p.code })) }}
                        disabled={!connected}
                        className={`relative p-4 rounded-xl border-2 text-center transition-all ${
                          !connected ? 'border-white/5 opacity-40 cursor-not-allowed' :
                          form.platform === p.code ? 'border-white/30 bg-white/10 scale-[1.02]' : 'border-white/5 hover:border-white/20 cursor-pointer'}`}
                        style={{ borderColor: connected && form.platform === p.code ? p.color + '80' : undefined }}>
                        {!connected && <div className="absolute top-2 right-2"><FiLock size={10} className="text-muted" /></div>}
                        <div className="text-2xl mb-2" style={{ color: connected ? p.color : undefined }}>{p.icon}</div>
                        <div className="text-xs font-semibold text-white">{p.name}</div>
                        <div className={`text-[9px] mt-1 ${connected ? 'text-green' : 'text-muted'}`}>
                          {connected ? '● Connected' : 'Not connected'}
                        </div>
                      </button>
                    )
                  })}
                </div>
                {connectedPlatforms.length === 0 && (
                  <div className="mt-5 p-4 bg-gold/5 border border-gold/20 rounded-xl text-center">
                    <FiLock size={20} className="text-gold mx-auto mb-2" />
                    <p className="text-sm text-gold/80 mb-3">No platforms connected yet.</p>
                    <Link href="/settings"><button className="btn btn-ghost btn-sm text-gold border-gold/30">Go to Settings →</button></Link>
                  </div>
                )}
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <h2 className="font-bold text-white text-lg mb-2">Content Details</h2>
                <div>
                  <label className="label">Title *</label>
                  <input className="inp" value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder={`Your ${activePlt.name} title...`} />
                  <p className={`text-xs mt-1 ${form.title.length >= 55 && form.title.length <= 70 ? 'text-green' : form.title.length >= 40 ? 'text-gold' : 'text-muted'}`}>
                    {form.title.length} chars{activePlt.code === 'yt' && ' · Optimal: 55–70 for YouTube'}
                  </p>
                </div>
                <div>
                  <label className="label">Description</label>
                  <textarea className="inp min-h-28 resize-none" value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Describe your content..." />
                </div>
                <div>
                  <label className="label">Tags (comma separated)</label>
                  <input className="inp" value={form.tags}
                    onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                    placeholder="tag1, tag2, tag3..." />
                </div>
                {form.hashtags && (
                  <div>
                    <label className="label">Hashtags</label>
                    <textarea className="inp min-h-16 resize-none text-sm" value={form.hashtags}
                      onChange={e => setForm(f => ({ ...f, hashtags: e.target.value }))} />
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="font-bold text-white text-lg">AI Optimization</h2><AIBadge />
                </div>
                <p className="text-muted text-sm mb-5">Generate optimized titles and hashtags.</p>
                <button onClick={generateAI} disabled={generating} className="btn btn-cyan gap-2 mb-6">
                  {generating ? <Spinner size={15} /> : <FiZap size={15} />}
                  {generating ? 'Generating...' : 'Generate AI Suggestions'}
                </button>
                {aiTitles.length > 0 && (
                  <div className="space-y-4">
                    <div>
                      <label className="label">AI Title Suggestions (click to use)</label>
                      <div className="space-y-2">
                        {aiTitles.map((t: any, i: number) => (
                          <button key={i} onClick={() => setForm(f => ({ ...f, title: t.title }))}
                            className={`w-full text-left p-3 rounded-xl border text-sm transition-all ${
                              form.title === t.title ? 'border-cyan/40 bg-cyan/5 text-white' : 'border-white/5 bg-surf2 text-white/70 hover:border-white/20'}`}>
                            <div className="flex justify-between items-start gap-2">
                              <span>{t.title}</span>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className={`text-[10px] font-semibold ${t.title?.length >= 55 && t.title?.length <= 70 ? 'text-green' : 'text-gold'}`}>{t.title?.length}ch</span>
                                <span className="text-xs font-bold text-cyan">Score: {t.score}</span>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                    {form.hashtags && (
                      <div>
                        <label className="label">AI Hashtags</label>
                        <div className="p-3 bg-surf2 rounded-xl text-sm text-white/70 leading-relaxed border border-white/5">{form.hashtags}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="font-bold text-white text-lg">🔬 SEO Scan</h2><AIBadge />
                </div>
                <button onClick={runSeoScan} disabled={scanning} className="btn btn-cyan gap-2 mb-6">
                  {scanning ? <Spinner size={15} /> : '🔬'}{scanning ? 'Scanning...' : 'Run SEO Scan'}
                </button>
                {scanning && <div className="text-center py-8"><div className="loading-dots flex justify-center mb-3"><span /><span /><span /></div><p className="text-muted text-sm">Analyzing...</p></div>}
                {seo && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                    <div className="flex items-center gap-6">
                      <ScoreRing score={seo.score} label="SEO Score" size={90} />
                      <ScoreRing score={seo.viralScore || 70} label="Viral Score" size={90} color="#ff0090" />
                      <div className="flex-1 space-y-2.5">
                        <SeoCheck score={seo.titleScore} label="Title optimization" />
                        <SeoCheck score={seo.descriptionScore} label="Description quality" />
                        <SeoCheck score={seo.tagsScore} label="Tags & keywords" />
                      </div>
                    </div>
                    {seo.suggestions?.length > 0 && (
                      <div className="bg-surf2 rounded-xl p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted mb-3">Suggestions</p>
                        <ul className="space-y-2">{seo.suggestions.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-white/70"><span className="text-cyan mt-0.5">→</span> {s}</li>
                        ))}</ul>
                      </div>
                    )}
                    <div className={`p-3 rounded-xl text-sm font-semibold text-center ${
                      seo.score >= 80 ? 'bg-green/10 text-green border border-green/20' :
                      seo.score >= 60 ? 'bg-gold/10 text-gold border border-gold/20' : 'bg-red/10 text-red border border-red/20'}`}>
                      {seo.score >= 80 ? '✅ Great! Ready to publish' : seo.score >= 60 ? '⚠️ Good, can improve' : '❌ Needs optimization'}
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {step === 4 && (
              <div>
                <h2 className="font-bold text-white text-lg mb-5">📋 Review & Save</h2>
                <div className="space-y-3 mb-6">
                  {[
                    { l: 'Platform', v: activePlt.name },
                    { l: 'Title', v: form.title },
                    { l: 'Description', v: form.description?.substring(0, 100) + (form.description?.length > 100 ? '...' : '') },
                    { l: 'Tags', v: form.tags },
                    { l: 'Hashtags', v: form.hashtags?.substring(0, 80) + (form.hashtags?.length > 80 ? '...' : '') },
                    { l: 'SEO Score', v: seo ? `${seo.score}/100` : 'Not scanned' },
                  ].map(row => (
                    <div key={row.l} className="flex items-start gap-3 py-2 border-b border-white/5">
                      <div className="text-xs font-bold uppercase tracking-wider text-muted w-24 flex-shrink-0 mt-0.5">{row.l}</div>
                      <div className="text-sm text-white/80">{row.v || '—'}</div>
                    </div>
                  ))}
                </div>
                <div className="bg-surf2 rounded-xl p-4 text-sm text-muted mb-5">
                  ℹ️ Content will be saved to your library. Connect {activePlt.name} in Settings to publish directly.
                </div>
                <button onClick={handlePublish} disabled={uploading} className="btn btn-cyan gap-2">
                  {uploading ? <Spinner size={15} /> : <FiCheck size={15} />}
                  {uploading ? 'Saving...' : 'Save to Library →'}
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-between mt-5">
          <button onClick={() => setStep(s => s - 1)} disabled={step === 0} className="btn btn-ghost gap-2 disabled:opacity-30">
            <FiArrowLeft size={15} /> Back
          </button>
          {step < STEPS.length - 1 && (
            <button onClick={() => setStep(s => s + 1)} disabled={!canNext()} className="btn btn-cyan gap-2 disabled:opacity-50">
              Next <FiArrowRight size={15} />
            </button>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

export default withAuth(UploadPage)
