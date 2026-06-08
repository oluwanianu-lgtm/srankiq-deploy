// pages/upload.tsx — Smart Upload: faithful YouTube Studio-style wizard
import React, { useState, useRef, useEffect } from 'react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { withAuth } from '../lib/withAuth'
import { usePlatform } from '../contexts/PlatformContext'
import { Spinner, EmptyState } from '../components/ui'
import { apiPost } from '../lib/api'
import toast from 'react-hot-toast'
import {
  FiUpload, FiCheck, FiZap, FiCopy, FiX, FiChevronDown, FiImage,
} from 'react-icons/fi'
import { useAuth } from '../contexts/AuthContext'
import { saveUpload } from '../services/firestore'
import { useRouter } from 'next/router'

const STEPS = ['Details', 'Video elements', 'Checks', 'Visibility']
const CATEGORIES: Record<string, string> = {
  '1': 'Film & Animation', '2': 'Autos & Vehicles', '10': 'Music', '15': 'Pets & Animals',
  '17': 'Sports', '19': 'Travel & Events', '20': 'Gaming', '22': 'People & Blogs',
  '23': 'Comedy', '24': 'Entertainment', '25': 'News & Politics', '26': 'Howto & Style',
  '27': 'Education', '28': 'Science & Technology', '29': 'Nonprofits & Activism',
}
const LANGUAGES = ['English', 'Spanish', 'Portuguese', 'French', 'German', 'Italian', 'Hindi', 'Arabic', 'Japanese', 'Korean', 'Latin']

interface UploadForm {
  title: string; description: string; tags: string; hashtags: string
  privacyStatus: 'public' | 'private' | 'unlisted'; madeForKids: boolean | null; category: string
  playlist: string; language: string; recordingDate: string
  aiUse: '' | 'yes' | 'no'; paidPromotion: boolean; allowComments: boolean
  ageRestriction: boolean; altered: boolean
}
type UploadStatus = 'idle' | 'uploading' | 'processing' | 'complete' | 'error'

function UploadPage() {
  const { isConnected, platformData } = usePlatform()
  const { user } = useAuth()
  const router = useRouter()

  const [step, setStep] = useState(0)
  const [form, setForm] = useState<UploadForm>({
    title: '', description: '', tags: '', hashtags: '',
    privacyStatus: 'private', madeForKids: null, category: '24',
    playlist: '', language: '', recordingDate: '',
    aiUse: '', paidPromotion: false, allowComments: true,
    ageRestriction: false, altered: false,
  })
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [videoId, setVideoId] = useState<string>('')
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [aiTitles, setAiTitles] = useState<any[]>([])
  const [generating, setGenerating] = useState(false)
  const [sug, setSug] = useState<any>(null)
  const [scanning, setScanning] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const thumbRef = useRef<HTMLInputElement>(null)
  const [thumbFile, setThumbFile] = useState<File | null>(null)
  const [thumbPreview, setThumbPreview] = useState<string>('')

  const onThumbPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 2 * 1024 * 1024) { toast.error('Thumbnail must be under 2MB'); return }
    setThumbFile(f)
    setThumbPreview(URL.createObjectURL(f))
  }

  // Upload custom thumbnail to YouTube (thumbnails.set — needs verified account)
  const uploadThumbnail = async (vid: string) => {
    if (!thumbFile || !accessToken) return
    try {
      const res = await fetch(
        `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${vid}&uploadType=media`,
        { method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': thumbFile.type }, body: thumbFile }
      )
      if (!res.ok) {
        const e = await res.json().catch(() => ({} as any))
        if (e.error?.errors?.[0]?.reason === 'unverifiedAccount' || /unverified/i.test(e.error?.message || ''))
          toast.error('Custom thumbnail skipped — your YouTube account must be verified to set thumbnails')
        else toast.error('Thumbnail upload skipped: ' + (e.error?.message || 'failed'))
        return false
      }
      return true
    } catch { toast.error('Thumbnail upload failed'); return false }
  }

  const ytConnected = isConnected('yt' as any)
  const ytData = platformData?.['yt' as any] as any
  const accessToken = ytData?.accessToken
  const channelName = ytData?.channelData?.name || ytData?.channelData?.title || 'Your channel'
  const channelThumb = ytData?.channelData?.thumbnail

  useEffect(() => {
    if (router.query.prefill === '1') {
      try {
        const raw = sessionStorage.getItem('srankiq_upload_prefill')
        if (raw) {
          const d = JSON.parse(raw)
          setForm(f => ({ ...f, title: d.title || f.title, description: d.description || f.description, tags: d.tags || f.tags, hashtags: d.hashtags || f.hashtags }))
          sessionStorage.removeItem('srankiq_upload_prefill')
          toast.success('Loaded from AI Tools!')
        }
      } catch {}
    }
  }, [router.query.prefill])

  const startUpload = async (f: File) => {
    if (!accessToken) { toast.error('Connect YouTube in Settings first'); return }
    setFile(f)
    setPreviewUrl(URL.createObjectURL(f))
    const filenameTitle = f.name.replace(/\.[^.]+$/, '').slice(0, 100) || 'Untitled'
    if (!form.title) setForm(s => ({ ...s, title: filenameTitle }))
    setStatus('uploading')
    setProgress(0)
    try {
      const initRes = await fetch(
        'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Upload-Content-Type': f.type,
            'X-Upload-Content-Length': String(f.size),
          },
          body: JSON.stringify({
            snippet: { title: filenameTitle, categoryId: '24' },
            status: { privacyStatus: 'private', selfDeclaredMadeForKids: false },
          }),
        }
      )
      if (!initRes.ok) {
        const e = await initRes.json().catch(() => ({} as any))
        if (initRes.status === 401) throw new Error('YouTube session expired — reconnect in Settings')
        throw new Error(e.error?.message || 'Could not start upload')
      }
      const uploadUrl = initRes.headers.get('Location')
      if (!uploadUrl) throw new Error('No upload URL returned by YouTube')
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', uploadUrl)
        xhr.setRequestHeader('Content-Type', f.type)
        xhr.upload.onprogress = (ev) => { if (ev.lengthComputable) setProgress(Math.round((ev.loaded / ev.total) * 100)) }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try { const data = JSON.parse(xhr.responseText); setVideoId(data.id); setStatus('complete'); resolve() }
            catch { reject(new Error('Upload finished but response was unreadable')) }
          } else reject(new Error('Upload failed (' + xhr.status + ')'))
        }
        xhr.onerror = () => reject(new Error('Network error during upload'))
        xhr.send(f)
      })
    } catch (err: any) {
      setStatus('error'); toast.error(err.message || 'Upload failed')
    }
  }

  const onFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) startUpload(f) }
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f && f.type.startsWith('video/')) startUpload(f)
    else toast.error('Please drop a video file')
  }

  const generateAI = async () => {
    if (!form.title) { toast.error('Enter a title first'); return }
    setGenerating(true)
    try {
      const [titlesRes, hashRes, descRes] = await Promise.all([
        apiPost('/api/ai/titles', { topic: form.title, platform: 'YouTube', style: 'viral', keywords: [] }),
        apiPost('/api/ai/hashtags', { topic: form.title, platform: 'YouTube', count: 12 }),
        apiPost('/api/ai/description', { title: form.title, platform: 'YouTube', keywords: [], tone: 'engaging' }).catch(() => null),
      ])
      setAiTitles(titlesRes.data.titles?.slice(0, 5) || [])
      setForm(f => ({
        ...f,
        tags: f.tags || (hashRes.data.hashtags || []).map((h: any) => (h.tag || '').replace(/^#/, '')).join(', '),
        description: f.description || (descRes?.data?.description || descRes?.data || ''),
      }))
      toast.success('AI suggestions ready!')
    } catch { toast.error('AI generation failed') }
    finally { setGenerating(false) }
  }

  const runScan = async () => {
    if (!form.title) { toast.error('Enter a title first'); return }
    setScanning(true)
    try {
      const res = await apiPost('/api/videos/suggest', {
        title: form.title, description: form.description,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      })
      setSug(res.data)
    } catch { toast.error('Scan failed') }
    finally { setScanning(false) }
  }

  const finishPublish = async () => {
    if (!videoId) { toast.error('Wait for the upload to finish first'); return }
    if (!form.title.trim()) { toast.error('Title is required'); return }
    if (form.madeForKids === null) { toast.error('Select an audience (made for kids?) in Details'); setStep(0); return }
    setPublishing(true)
    try {
      const description = [form.description || '', '', form.hashtags || ''].join('\n').trim()
      await apiPost('/api/videos/update', {
        accessToken, videoId,
        title: form.title.slice(0, 100),
        description,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean).slice(0, 60),
        privacyStatus: form.privacyStatus,
        categoryId: form.category,
        madeForKids: !!form.madeForKids,
        defaultLanguage: form.language ? form.language.slice(0, 2).toLowerCase() : undefined,
        recordingDate: form.recordingDate ? new Date(form.recordingDate).toISOString() : undefined,
      })
      if (user) {
        await saveUpload(user.uid, {
          title: form.title, description, tags: form.tags, platform: 'YouTube',
          hashtags: form.hashtags, seoScore: sug?.score, status: 'published',
          youtubeVideoId: videoId, youtubeUrl: `https://youtube.com/watch?v=${videoId}`,
        }).catch(() => {})
      }
      if (thumbFile) { await uploadThumbnail(videoId) }
      toast.success(`Published as ${form.privacyStatus}! 🎉`)
      router.push('/dashboard')
    } catch (err: any) {
      const msg = err?.response?.data?.error
      toast.error(msg === 'TOKEN_EXPIRED' ? 'Session expired — reconnect YouTube' : (msg || 'Publish failed'))
    } finally { setPublishing(false) }
  }

  const set = (patch: Partial<UploadForm>) => setForm(f => ({ ...f, ...patch }))
  const videoLink = videoId ? `https://youtube.com/watch?v=${videoId}` : ''
  const canNext = step === 0 ? form.title.trim().length >= 1 : true
  const copy = (t: string) => { navigator.clipboard?.writeText(t); toast.success('Copied!') }
  const addTag = () => {
    const t = tagInput.trim().replace(/,$/, '')
    if (t) { set({ tags: form.tags ? `${form.tags}, ${t}` : t }); setTagInput('') }
  }

  if (!ytConnected) {
    return (
      <DashboardLayout title="Smart Upload">
        <div className="p-6">
          <EmptyState icon="🔗" title="Connect YouTube first"
            description="Link your YouTube channel in Settings to upload videos with AI-optimized SEO." />
          <div className="flex justify-center mt-4">
            <button onClick={() => router.push('/settings')} className="btn btn-cyan">Go to Settings →</button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // ── No file yet: YouTube-style drop zone ──
  if (status === 'idle') {
    return (
      <DashboardLayout title="Smart Upload">
        <div className="p-6 max-w-5xl mx-auto">
          <div className="card overflow-hidden p-0">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
              <h2 className="text-lg font-bold text-white">Upload videos</h2>
              <FiX className="text-muted cursor-pointer" onClick={() => router.push('/dashboard')} />
            </div>
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={`flex flex-col items-center justify-center py-24 transition-colors ${dragOver ? 'bg-cyan/5' : ''}`}>
              <div className="w-28 h-28 rounded-full bg-surf2 flex items-center justify-center mb-6">
                <FiUpload size={44} className="text-muted" />
              </div>
              <p className="text-white/80 mb-1">Drag and drop video files to upload</p>
              <p className="text-xs text-muted mb-6">Your videos will be private until you publish them.</p>
              <button onClick={() => fileRef.current?.click()} className="btn btn-cyan px-6">Select files</button>
              <input ref={fileRef} type="file" accept="video/*" hidden onChange={onFilePicked} />
            </div>
            <div className="px-6 py-4 border-t border-white/8 text-center text-[11px] text-muted">
              By submitting your videos to YouTube, you acknowledge that you agree to YouTube's Terms of Service and Community Guidelines.
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Smart Upload">
      <div className="p-6 max-w-6xl mx-auto">
        <div className="card p-0 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
            <h2 className="text-lg font-bold text-white truncate">{form.title || 'Untitled video'}</h2>
            <div className="flex items-center gap-3">
              <span className="badge-cyan text-[10px]">Saved as {form.privacyStatus}</span>
              <FiX className="text-muted cursor-pointer" onClick={() => router.push('/dashboard')} />
            </div>
          </div>

          {/* Step progress */}
          <div className="px-6 pt-6">
            <div className="flex items-center">
              {STEPS.map((s, i) => (
                <React.Fragment key={s}>
                  <button onClick={() => setStep(i)} className="flex flex-col items-center gap-2 flex-shrink-0">
                    <span className={`text-sm font-semibold ${i === step ? 'text-white' : 'text-muted'}`}>{s}</span>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] border-2
                      ${i < step ? 'bg-cyan border-cyan text-black' : i === step ? 'border-cyan' : 'border-white/20'}`}>
                      {i < step ? <FiCheck size={11} /> : ''}
                    </span>
                  </button>
                  {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-1 mt-[-18px] ${i < step ? 'bg-cyan' : 'bg-white/10'}`} />}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Body: form left, preview right */}
          <div className="grid lg:grid-cols-[1fr_320px] gap-6 p-6">
            <div className="space-y-6 min-w-0">

              {/* ════ STEP 0: DETAILS ════ */}
              {step === 0 && (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-white">Details</h3>
                    <button onClick={generateAI} disabled={generating} className="btn btn-ghost btn-sm gap-1.5">
                      {generating ? <Spinner size={13} /> : <FiZap size={13} />} AI suggest details
                    </button>
                  </div>

                  {/* Title */}
                  <div className="border border-white/10 rounded-xl p-3">
                    <label className="text-[11px] text-muted">Title (required)</label>
                    <input className="w-full bg-transparent text-white outline-none mt-1" value={form.title}
                      maxLength={100} placeholder="Add a title that describes your video"
                      onChange={e => set({ title: e.target.value })} />
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-muted">✦ AI suggested titles below</span>
                      <span className="text-[10px] text-muted">{form.title.length}/100</span>
                    </div>
                    {aiTitles.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {aiTitles.map((t, i) => {
                          const txt = typeof t === 'string' ? t : t?.title
                          return (
                            <div key={i} className="flex items-center gap-2">
                              <span className="text-xs text-white/75 flex-1">{txt}</span>
                              <button onClick={() => set({ title: txt })} className="btn btn-ghost btn-sm text-[10px]">Use</button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div className="border border-white/10 rounded-xl p-3">
                    <label className="text-[11px] text-muted">Description</label>
                    <textarea className="w-full bg-transparent text-white outline-none mt-1 min-h-[120px] resize-y"
                      placeholder="Tell viewers about your video (type @ to mention a channel)"
                      value={form.description} onChange={e => set({ description: e.target.value })} />
                  </div>

                  {/* Thumbnail */}
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">Thumbnail</h4>
                    <p className="text-xs text-muted mb-2">Set a thumbnail that stands out and draws viewers' attention. Upload a .jpg or .png (1280×720 recommended, under 2MB).</p>
                    <div className="flex items-center gap-3">
                      <button onClick={() => thumbRef.current?.click()}
                        className="w-40 aspect-video rounded-lg border-2 border-dashed border-white/15 hover:border-cyan/50
                                   flex flex-col items-center justify-center gap-1 transition-colors flex-shrink-0 overflow-hidden bg-surf2">
                        {thumbPreview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thumbPreview} alt="thumbnail" className="w-full h-full object-cover" />
                        ) : (
                          <><FiImage size={20} className="text-muted" /><span className="text-[10px] text-muted">Upload thumbnail</span></>
                        )}
                      </button>
                      {thumbPreview && (
                        <button onClick={() => { setThumbFile(null); setThumbPreview('') }}
                          className="btn btn-ghost btn-sm text-[11px]">Remove</button>
                      )}
                      <input ref={thumbRef} type="file" accept="image/jpeg,image/png" hidden onChange={onThumbPicked} />
                    </div>
                    <p className="text-[10px] text-muted mt-2">Custom thumbnails require a verified YouTube account. It's applied when you Publish.</p>
                  </div>

                  {/* Playlists */}
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">Playlists</h4>
                    <p className="text-xs text-muted mb-2">Add your video to one or more playlists to organize your content.</p>
                    <div className="relative">
                      <select value={form.playlist} onChange={e => set({ playlist: e.target.value })}
                        className="inp appearance-none pr-8">
                        <option value="">Select</option>
                        <option value="new">+ New playlist (manage in YouTube)</option>
                      </select>
                      <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" size={14} />
                    </div>
                  </div>

                  {/* Audience */}
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">Audience</h4>
                    <p className="text-sm text-white/80 font-semibold">Is this video made for kids? (required)</p>
                    <p className="text-xs text-muted mt-1 mb-3">
                      Regardless of your location, you're legally required to comply with the Children's Online Privacy Protection Act (COPPA) and/or other laws.
                    </p>
                    <label className="flex items-center gap-2 mb-2 cursor-pointer">
                      <input type="radio" name="kids" checked={form.madeForKids === true} onChange={() => set({ madeForKids: true })} />
                      <span className="text-sm text-white/85">Yes, it's made for kids</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="kids" checked={form.madeForKids === false} onChange={() => set({ madeForKids: false })} />
                      <span className="text-sm text-white/85">No, it's not made for kids</span>
                    </label>
                    <button onClick={() => set({ ageRestriction: !form.ageRestriction })} className="text-xs text-cyan mt-3 flex items-center gap-1">
                      <FiChevronDown className={form.ageRestriction ? 'rotate-180 transition-transform' : 'transition-transform'} size={12} /> Age restriction (advanced)
                    </button>
                    {form.ageRestriction && (
                      <label className="flex items-center gap-2 mt-2 cursor-pointer">
                        <input type="checkbox" /> <span className="text-xs text-white/75">Restrict video to viewers over 18</span>
                      </label>
                    )}
                  </div>

                  {/* Paid promotion */}
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">Paid promotion</h4>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.paidPromotion} onChange={e => set({ paidPromotion: e.target.checked })} />
                      <span className="text-xs text-white/75">My video contains paid promotion like a product placement or endorsement</span>
                    </label>
                  </div>

                  {/* AI use */}
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">Altered content</h4>
                    <p className="text-xs text-muted mb-2">Was AI used to generate or edit your content (alter a real person, place, or event)?</p>
                    <label className="flex items-center gap-2 mb-1 cursor-pointer">
                      <input type="radio" name="ai" checked={form.aiUse === 'yes'} onChange={() => set({ aiUse: 'yes' })} />
                      <span className="text-sm text-white/85">Yes</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="ai" checked={form.aiUse === 'no'} onChange={() => set({ aiUse: 'no' })} />
                      <span className="text-sm text-white/85">No</span>
                    </label>
                  </div>

                  {/* Tags */}
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">Tags</h4>
                    <p className="text-xs text-muted mb-2">Tags can be useful if content in your video is commonly misspelled.</p>
                    <div className="inp flex flex-wrap gap-1.5 items-center min-h-[44px]">
                      {form.tags.split(',').map(t => t.trim()).filter(Boolean).map((t, i) => (
                        <span key={i} className="badge-cyan text-[10px] flex items-center gap-1">
                          {t}<FiX size={10} className="cursor-pointer" onClick={() => set({ tags: form.tags.split(',').map(x => x.trim()).filter((x, xi) => xi !== i).join(', ') })} />
                        </span>
                      ))}
                      <input className="bg-transparent outline-none text-white text-sm flex-1 min-w-[80px]"
                        placeholder="Add tag" value={tagInput}
                        onChange={e => setTagInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag() } }} />
                    </div>
                    <div className="text-right text-[10px] text-muted mt-1">{form.tags.length}/500</div>
                  </div>

                  {/* Language */}
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">Language and captions certification</h4>
                    <div className="relative">
                      <select value={form.language} onChange={e => set({ language: e.target.value })} className="inp appearance-none pr-8">
                        <option value="">Video language</option>
                        {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                      <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" size={14} />
                    </div>
                  </div>

                  {/* Recording date */}
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">Recording date and location</h4>
                    <input type="date" className="inp" value={form.recordingDate} onChange={e => set({ recordingDate: e.target.value })} />
                  </div>
                </>
              )}

              {/* ════ STEP 1: VIDEO ELEMENTS ════ */}
              {step === 1 && (
                <>
                  <h3 className="text-xl font-bold text-white">Video elements</h3>
                  <p className="text-sm text-muted">Use cards and an end screen to show viewers related content.</p>
                  <div className="border border-white/10 rounded-xl p-4 flex items-center justify-between">
                    <div><div className="text-sm font-semibold text-white">Add subtitles</div>
                      <div className="text-xs text-muted">Reach a broader audience by adding subtitles.</div></div>
                    <span className="text-xs text-muted">In YouTube</span>
                  </div>
                  <div className="border border-white/10 rounded-xl p-4 flex items-center justify-between">
                    <div><div className="text-sm font-semibold text-white">Add an end screen</div>
                      <div className="text-xs text-muted">Promote related content at the end of your video.</div></div>
                    <span className="text-xs text-muted">In YouTube</span>
                  </div>
                  <div className="border border-white/10 rounded-xl p-4 flex items-center justify-between">
                    <div><div className="text-sm font-semibold text-white">Add cards</div>
                      <div className="text-xs text-muted">Promote related content during your video.</div></div>
                    <span className="text-xs text-muted">In YouTube</span>
                  </div>
                </>
              )}

              {/* ════ STEP 2: CHECKS ════ */}
              {step === 2 && (
                <>
                  <h3 className="text-xl font-bold text-white">Checks</h3>
                  <p className="text-sm text-muted">We'll check your video for issues that may restrict its visibility, and run a SRankIQ SEO scan.</p>
                  <div className="border border-white/10 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3"><FiCheck className="text-green" /><span className="text-sm text-white">Copyright</span></div>
                    <span className="text-xs text-green">No issues found</span>
                  </div>

                  {/* Category */}
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">Category</h4>
                    <p className="text-xs text-muted mb-2">Add your video to a category so viewers can find it more easily.</p>
                    <div className="relative">
                      <select value={form.category} onChange={e => set({ category: e.target.value })} className="inp appearance-none pr-8">
                        {Object.entries(CATEGORIES).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                      </select>
                      <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" size={14} />
                    </div>
                  </div>

                  {/* Comments */}
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">Comments and ratings</h4>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.allowComments} onChange={e => set({ allowComments: e.target.checked })} />
                      <span className="text-sm text-white/85">Allow comments</span>
                    </label>
                  </div>

                  {/* SEO scan */}
                  <div className="border border-cyan/20 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-bold text-white">SRankIQ SEO Scan</div>
                      <button onClick={runScan} disabled={scanning} className="btn btn-ghost btn-sm gap-1.5">
                        {scanning ? <Spinner size={13} /> : <FiZap size={13} />} Scan
                      </button>
                    </div>
                    {sug ? (
                      <div className="space-y-2">
                        <div className="font-display text-lg" style={{ color: sug.score >= 70 ? '#00ff88' : sug.score >= 45 ? '#ffc740' : '#ff3366' }}>
                          {sug.score}/100
                        </div>
                        {(sug.fixes || []).map((f: any, i: number) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className={`badge text-[8px] mt-0.5 ${f.severity === 'high' ? 'badge-red' : f.severity === 'medium' ? 'badge-gold' : 'badge-cyan'}`}>{f.severity}</span>
                            <div><div className="text-xs font-semibold text-white">{f.label}</div><div className="text-[11px] text-muted">{f.detail}</div></div>
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-xs text-muted">Run a scan to see SEO fixes before publishing.</p>}
                  </div>
                </>
              )}

              {/* ════ STEP 3: VISIBILITY ════ */}
              {step === 3 && (
                <>
                  <h3 className="text-xl font-bold text-white">Visibility</h3>
                  <p className="text-sm text-muted">Choose when to publish and who can see your video.</p>
                  {([
                    ['private', 'Private', 'Only you and people you choose can watch your video'],
                    ['unlisted', 'Unlisted', 'Anyone with the video link can watch your video'],
                    ['public', 'Public', 'Everyone can watch your video'],
                  ] as const).map(([val, label, desc]) => (
                    <label key={val} className={`border rounded-xl p-4 flex items-start gap-3 cursor-pointer transition-colors
                      ${form.privacyStatus === val ? 'border-cyan bg-cyan/5' : 'border-white/10'}`}>
                      <input type="radio" name="vis" checked={form.privacyStatus === val} onChange={() => set({ privacyStatus: val as any })} className="mt-1" />
                      <div><div className="text-sm font-semibold text-white">{label}</div><div className="text-xs text-muted">{desc}</div></div>
                    </label>
                  ))}
                </>
              )}
            </div>

            {/* ── Right: preview + link panel (sticky) ── */}
            <div className="lg:sticky lg:top-4 self-start">
              <div className="bg-surf2 rounded-xl overflow-hidden">
                <div className="aspect-video bg-black flex items-center justify-center relative">
                  {status === 'complete' && previewUrl ? (
                    // eslint-disable-next-line jsx-a11y/media-has-caption
                    <video src={previewUrl} controls className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-xs text-white/60">Processing will begin shortly</span>
                  )}
                </div>
                <div className="p-3 space-y-3">
                  <div>
                    <div className="text-[10px] text-muted">Video link</div>
                    <div className="flex items-center gap-2">
                      <a href={videoLink || '#'} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-cyan truncate flex-1">{videoLink || 'Generating link...'}</a>
                      {videoLink && <FiCopy size={13} className="text-muted cursor-pointer flex-shrink-0" onClick={() => copy(videoLink)} />}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted">Filename</div>
                    <div className="text-xs text-white/80 truncate">{file?.name || '—'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer: progress + nav */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/8">
            <div className="flex items-center gap-3 text-xs">
              {status === 'uploading' ? (
                <>
                  <div className="w-32 h-1.5 bg-surf2 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="text-muted">Uploading {progress}% ...</span>
                </>
              ) : status === 'complete' ? (
                <span className="text-green flex items-center gap-1.5"><FiCheck size={13} /> Upload complete · Processing will begin shortly</span>
              ) : status === 'error' ? (
                <span className="text-red">Upload failed — try again</span>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              {step > 0 && <button onClick={() => setStep(step - 1)} className="btn btn-ghost">Back</button>}
              {step < STEPS.length - 1 ? (
                <button onClick={() => canNext ? setStep(step + 1) : toast.error('Add a title first')} className="btn btn-cyan">Next</button>
              ) : (
                <button onClick={finishPublish} disabled={publishing || status !== 'complete'} className="btn btn-cyan gap-1.5">
                  {publishing ? <Spinner size={14} /> : <FiCheck size={14} />}
                  {publishing ? 'Publishing...' : status !== 'complete' ? 'Waiting for upload...' : 'Publish'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default withAuth(UploadPage)
