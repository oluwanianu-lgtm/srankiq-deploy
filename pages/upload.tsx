// pages/upload.tsx
import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import DashboardLayout from '../components/layout/DashboardLayout'
import { withAuth } from '../lib/withAuth'
import { usePlatform, PLATFORMS } from '../contexts/PlatformContext'
import { ScoreRing, AIBadge, Spinner } from '../components/ui'
import axios from 'axios'
import toast from 'react-hot-toast'
import { FiUpload, FiCheck, FiAlertCircle, FiArrowRight, FiArrowLeft, FiZap, FiYoutube } from 'react-icons/fi'
import { useAuth } from '../contexts/AuthContext'
import { saveUpload } from '../services/firestore'
import { useRouter } from 'next/router'

const STEPS = ['Platform', 'Details', 'AI Optimize', 'SEO Scan', 'Review']

interface UploadForm {
  platform: string; title: string; description: string
  tags: string; file?: File | null; hashtags: string
  privacyStatus: 'public' | 'private' | 'unlisted'
}
interface SeoResult {
  score: number; titleScore: number; descriptionScore: number
  tagsScore: number; suggestions: string[]; viralScore: number; engagementPrediction: string
}

// Laser scan animation component
function LaserScan({ onDone }: { onDone: () => void }) {
  const [pos, setPos] = useState(0)
  const [phase, setPhase] = useState<'scanning' | 'done'>('scanning')

  useEffect(() => {
    let frame = 0
    const total = 80 // frames for full scan
    const interval = setInterval(() => {
      frame++
      setPos(Math.min((frame / total) * 100, 100))
      if (frame >= total) {
        clearInterval(interval)
        setPhase('done')
        setTimeout(onDone, 600)
      }
    }, 25)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{
      position: 'relative', height: 160, borderRadius: 16, overflow: 'hidden',
      background: 'linear-gradient(135deg, rgba(0,212,255,0.05), rgba(123,47,255,0.05))',
      border: '1px solid rgba(0,212,255,0.2)',
    }}>
      {/* Background grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'linear-gradient(rgba(0,212,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.05) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }} />

      {/* Scan target corners */}
      {[[0,0,'tl'],[0,1,'tr'],[1,0,'bl'],[1,1,'br']].map(([t,l,k]) => (
        <div key={k as string} style={{
          position: 'absolute',
          top: t ? undefined : 12, bottom: t ? 12 : undefined,
          left: l ? undefined : 12, right: l ? 12 : undefined,
          width: 16, height: 16,
          borderTop: !t ? '2px solid #00d4ff' : undefined,
          borderBottom: t ? '2px solid #00d4ff' : undefined,
          borderLeft: !l ? '2px solid #00d4ff' : undefined,
          borderRight: l ? '2px solid #00d4ff' : undefined,
        }} />
      ))}

      {/* Laser line */}
      {phase === 'scanning' && (
        <>
          <motion.div style={{
            position: 'absolute', left: 0, right: 0, top: `${pos}%`,
            height: 2,
            background: 'linear-gradient(90deg, transparent, #00d4ff, #7b2fff, #00d4ff, transparent)',
            boxShadow: '0 0 12px #00d4ff, 0 0 24px rgba(0,212,255,0.4)',
            zIndex: 2,
          }} />
          {/* Glow trail */}
          <motion.div style={{
            position: 'absolute', left: 0, right: 0, top: `${pos}%`,
            height: 40,
            background: 'linear-gradient(to bottom, rgba(0,212,255,0.08), transparent)',
            zIndex: 1,
          }} />
        </>
      )}

      {/* Center text */}
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 8, zIndex: 3,
      }}>
        {phase === 'scanning' ? (
          <>
            <div style={{ fontSize: 11, color: '#00d4ff', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Scanning SEO...
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
              {Math.round(pos)}%
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
              {pos < 33 ? 'Analyzing title...' : pos < 66 ? 'Checking keywords...' : 'Calculating score...'}
            </div>
          </>
        ) : (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}
            style={{ fontSize: 32, color: '#00ff88' }}>
            ✓
          </motion.div>
        )}
      </div>
    </div>
  )
}

function UploadPage() {
  const { activePlatform, isConnected, platformData } = usePlatform()
  const { user } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<UploadForm>({
    platform: activePlatform, title: '', description: '', tags: '',
    file: null, hashtags: '', privacyStatus: 'public',
  })
  const [seo, setSeo] = useState<SeoResult | null>(null)
  const [aiTitles, setAiTitles] = useState<any[]>([])
  const [scanning, setScanning] = useState(false)
  const [showLaser, setShowLaser] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const activePlt = PLATFORMS.find(p => p.code === form.platform as any)!
  const isYouTubeConnected = isConnected('yt' as any)
  const ytData = platformData?.['yt' as any]

  // Prefill from AI Tools
  useEffect(() => {
    if (router.query.prefill === '1') {
      try {
        const raw = sessionStorage.getItem('srankiq_upload_prefill')
        if (raw) {
          const data = JSON.parse(raw)
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
          if (matchedPlt) { setStep(1); toast.success('Content loaded from AI Tools!') }
        }
      } catch { }
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
    setScanning(true)
    setSeo(null)
    setShowLaser(true)

    try {
      const res = await axios.post('/api/ai/seo', {
        title: form.title, description: form.description,
        platform: activePlt.name, tags: form.tags.split(',').map(t => t.trim()),
      })
      setSeo(res.data)
    } catch {
      toast.error('SEO scan failed')
      setShowLaser(false)
      setScanning(false)
    }
    // Laser animation controls when it finishes
  }

  const handleLaserDone = () => {
    setShowLaser(false)
    setScanning(false)
  }

  // Publish directly to YouTube
  const publishToYouTube = async () => {
    if (!user) return
    if (!form.file) {
      toast.error('Please select a video file to upload')
      return
    }

    setPublishing(true)
    try {
      // Get access token from stored platform data
      const accessToken = ytData?.accessToken
      if (!accessToken) {
        toast.error('YouTube token not found. Please reconnect YouTube in Settings.')
        setPublishing(false)
        return
      }

      toast.loading('Uploading to YouTube...', { id: 'yt-upload' })

      // Build multipart upload to YouTube Data API v3
      const metadata = {
        snippet: {
          title: form.title.slice(0, 100),
          description: [
            form.description || '',
            '',
            form.hashtags || '',
          ].join('\n').trim(),
          tags: form.tags.split(',').map(t => t.trim()).filter(Boolean).slice(0, 500),
          categoryId: '22',
        },
        status: {
          privacyStatus: form.privacyStatus,
          selfDeclaredMadeForKids: false,
        },
      }

      // Initiate resumable upload session
      const initRes = await fetch(
        'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Upload-Content-Type': form.file.type,
            'X-Upload-Content-Length': String(form.file.size),
          },
          body: JSON.stringify(metadata),
        }
      )

      if (!initRes.ok) {
        const err = await initRes.json()
        if (initRes.status === 401) {
          toast.error('YouTube session expired. Please reconnect YouTube in Settings.', { id: 'yt-upload' })
        } else {
          toast.error(err.error?.message || 'Failed to start YouTube upload', { id: 'yt-upload' })
        }
        setPublishing(false)
        return
      }

      const uploadUrl = initRes.headers.get('Location')
      if (!uploadUrl) throw new Error('No upload URL returned')

      // Upload the actual video file
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': form.file.type },
        body: form.file,
      })

      if (!uploadRes.ok) {
        const err = await uploadRes.json()
        throw new Error(err.error?.message || 'Video upload failed')
      }

      const videoData = await uploadRes.json()
      const videoId = videoData.id

      // Save to Firestore
      await saveUpload(user.uid, {
        title: form.title, description: form.description, tags: form.tags,
        platform: 'YouTube', hashtags: form.hashtags, seoScore: seo?.score,
        status: 'published', youtubeVideoId: videoId,
        youtubeUrl: `https://youtube.com/watch?v=${videoId}`,
      })

      toast.success(`Published to YouTube! Video ID: ${videoId}`, { id: 'yt-upload' })
      setStep(0)
      setForm({ platform: activePlatform, title: '', description: '', tags: '', file: null, hashtags: '', privacyStatus: 'public' })
      setSeo(null)
    } catch (err: any) {
      toast.error(err.message || 'Failed to publish', { id: 'yt-upload' })
    } finally {
      setPublishing(false)
    }
  }

  const saveToLibrary = async () => {
    if (!user) return
    setUploading(true)
    try {
      await saveUpload(user.uid, {
        title: form.title, description: form.description, tags: form.tags,
        platform: activePlt.name, hashtags: form.hashtags, seoScore: seo?.score, status: 'saved',
      })
      toast.success('Saved to library!')
      setStep(0)
      setForm({ platform: activePlatform, title: '', description: '', tags: '', file: null, hashtags: '', privacyStatus: 'public' })
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
            exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="card min-h-64">

            {/* Step 0: Platform */}
            {step === 0 && (
              <div>
                <h2 className="font-bold text-white text-lg mb-2">Select Platform</h2>
                <p className="text-muted text-sm mb-5">Choose where to publish your content.</p>
                <div className="grid grid-cols-2 gap-3">
                  {PLATFORMS.map(p => {
                    const connected = isConnected(p.code as any)
                    return (
                      <button key={p.code}
                        onClick={() => connected && setForm(f => ({ ...f, platform: p.code }))}
                        disabled={!connected}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          form.platform === p.code
                            ? 'border-cyan/40 bg-cyan/5'
                            : connected
                            ? 'border-white/8 bg-surf2 hover:border-white/20'
                            : 'border-white/4 bg-surf2/50 opacity-40 cursor-not-allowed'
                        }`}>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl" style={{ color: p.color }}>{p.icon}</span>
                          {form.platform === p.code && <FiCheck size={14} className="text-cyan ml-auto" />}
                          {!connected && <span className="text-[10px] text-muted ml-auto">Not connected</span>}
                        </div>
                        <div className="font-semibold text-sm text-white">{p.name}</div>
                        {connected && <div className="text-[10px] text-green mt-0.5">✓ Connected</div>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Step 1: Details */}
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="font-bold text-white text-lg mb-2">Content Details</h2>

                {/* File upload for YouTube */}
                {form.platform === 'yt' && (
                  <div>
                    <label className="label">Video File (for direct YouTube upload)</label>
                    <div
                      onClick={() => fileRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                        form.file ? 'border-cyan/40 bg-cyan/5' : 'border-white/10 hover:border-white/20'
                      }`}>
                      {form.file ? (
                        <div>
                          <div className="text-cyan font-semibold text-sm">✓ {form.file.name}</div>
                          <div className="text-muted text-xs mt-1">{(form.file.size / 1024 / 1024).toFixed(1)} MB</div>
                        </div>
                      ) : (
                        <div>
                          <FiUpload size={24} className="text-muted mx-auto mb-2" />
                          <div className="text-sm text-muted">Click to select video file</div>
                          <div className="text-xs text-muted/60 mt-1">MP4, MOV, AVI up to 256GB</div>
                        </div>
                      )}
                    </div>
                    <input ref={fileRef} type="file" accept="video/*" className="hidden"
                      onChange={e => setForm(f => ({ ...f, file: e.target.files?.[0] || null }))} />
                  </div>
                )}

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

            {/* Step 2: AI Optimize */}
            {step === 2 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="font-bold text-white text-lg">AI Optimization</h2><AIBadge />
                </div>
                <p className="text-muted text-sm mb-5">Generate optimized titles and hashtags using AI.</p>
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

            {/* Step 3: SEO Scan */}
            {step === 3 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="font-bold text-white text-lg">🔬 SEO Scan</h2><AIBadge />
                </div>

                {!showLaser && !seo && (
                  <button onClick={runSeoScan} disabled={scanning} className="btn btn-cyan gap-2 mb-6">
                    🔬 Run SEO Scan
                  </button>
                )}

                {/* Laser animation */}
                {showLaser && <div className="mb-6"><LaserScan onDone={handleLaserDone} /></div>}

                {/* Results */}
                {seo && !showLaser && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
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
                        <p className="text-xs font-bold uppercase tracking-wider text-muted mb-3">AI Suggestions</p>
                        <ul className="space-y-2">{seo.suggestions.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                            <span className="text-cyan mt-0.5">→</span> {s}
                          </li>
                        ))}</ul>
                      </div>
                    )}
                    <div className={`p-3 rounded-xl text-sm font-semibold text-center ${
                      seo.score >= 80 ? 'bg-green/10 text-green border border-green/20' :
                      seo.score >= 60 ? 'bg-gold/10 text-gold border border-gold/20' : 'bg-red/10 text-red border border-red/20'}`}>
                      {seo.score >= 80 ? '✅ Great! Ready to publish' : seo.score >= 60 ? '⚠️ Good, can improve' : '❌ Needs optimization'}
                    </div>
                    <button onClick={runSeoScan} className="btn btn-ghost btn-sm text-muted">🔄 Re-scan</button>
                  </motion.div>
                )}
              </div>
            )}

            {/* Step 4: Review & Publish */}
            {step === 4 && (
              <div>
                <h2 className="font-bold text-white text-lg mb-5">📋 Review & Publish</h2>
                <div className="space-y-3 mb-6">
                  {[
                    { l: 'Platform', v: activePlt.name },
                    { l: 'Title', v: form.title },
                    { l: 'Description', v: form.description?.substring(0, 100) + (form.description?.length > 100 ? '...' : '') },
                    { l: 'Tags', v: form.tags },
                    { l: 'Hashtags', v: form.hashtags?.substring(0, 80) + (form.hashtags?.length > 80 ? '...' : '') },
                    { l: 'SEO Score', v: seo ? `${seo.score}/100` : 'Not scanned' },
                    { l: 'Video File', v: form.file ? form.file.name : 'No file selected' },
                  ].map(row => (
                    <div key={row.l} className="flex items-start gap-3 py-2 border-b border-white/5">
                      <div className="text-xs font-bold uppercase tracking-wider text-muted w-24 flex-shrink-0 mt-0.5">{row.l}</div>
                      <div className="text-sm text-white/80">{row.v || '—'}</div>
                    </div>
                  ))}
                </div>

                {/* Privacy setting for YouTube */}
                {form.platform === 'yt' && (
                  <div className="mb-5">
                    <label className="label">Privacy Setting</label>
                    <div className="flex gap-2">
                      {(['public', 'unlisted', 'private'] as const).map(p => (
                        <button key={p} onClick={() => setForm(f => ({ ...f, privacyStatus: p }))}
                          className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${
                            form.privacyStatus === p ? 'bg-cyan/20 border border-cyan/40 text-cyan' : 'bg-surf2 border border-white/8 text-muted hover:text-white'
                          }`}>
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Publish buttons */}
                <div className="flex flex-col gap-3">
                  {/* Direct YouTube publish */}
                  {form.platform === 'yt' && isYouTubeConnected && form.file && (
                    <button onClick={publishToYouTube} disabled={publishing}
                      className="btn gap-2 w-full justify-center"
                      style={{ background: 'linear-gradient(135deg, #ff0000, #cc0000)', color: '#fff', borderColor: 'transparent' }}>
                      {publishing ? <Spinner size={15} /> : <FiYoutube size={15} />}
                      {publishing ? 'Publishing to YouTube...' : '🚀 Publish Directly to YouTube'}
                    </button>
                  )}

                  {/* Save to library */}
                  <button onClick={saveToLibrary} disabled={uploading}
                    className="btn btn-cyan gap-2">
                    {uploading ? <Spinner size={15} /> : <FiCheck size={15} />}
                    {uploading ? 'Saving...' : form.file ? 'Save to Library (without publishing)' : '✓ Save to Library →'}
                  </button>
                </div>

                {form.platform === 'yt' && !form.file && (
                  <p className="text-xs text-muted mt-3">
                    💡 Go back to Details and select a video file to enable direct YouTube publishing.
                  </p>
                )}
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
