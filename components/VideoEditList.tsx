// components/VideoEditList.tsx — VidIQ-style per-video editor + SEO suggestions
// Shared so the dashboard can show the full "My Videos" experience inline.
import { apiPost } from '../lib/api'
import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Spinner, EmptyState } from './ui'
import toast from 'react-hot-toast'
import { FiSave, FiZap, FiChevronDown, FiExternalLink } from 'react-icons/fi'

export interface EditableVideo {
  id: string; title: string; description: string; tags: string[]
  thumbnail: string; views: number; likes: number; comments?: number
  privacy?: string; url: string
}

const fmt = (n: number) =>
  n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : String(n || 0)

export default function VideoEditList({
  videos, accessToken, onVideoUpdated,
}: {
  videos: EditableVideo[]
  accessToken?: string
  onVideoUpdated?: (v: EditableVideo) => void
}) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [edits, setEdits] = useState<Record<string, { title: string; description: string; tags: string }>>({})
  const [saving, setSaving] = useState('')
  const [scanning, setScanning] = useState('')
  const [suggestions, setSuggestions] = useState<Record<string, any>>({})

  const startEdit = (v: EditableVideo) => {
    setExpanded(expanded === v.id ? null : v.id)
    if (!edits[v.id]) {
      setEdits(e => ({ ...e, [v.id]: { title: v.title, description: v.description, tags: (v.tags || []).join(', ') } }))
    }
  }

  const save = async (v: EditableVideo) => {
    const e = edits[v.id]
    if (!e) return
    if (!accessToken) { toast.error('Reconnect YouTube in Settings to edit videos'); return }
    if (!e.title.trim()) { toast.error('Title cannot be empty'); return }
    if (e.title.length > 100) { toast.error('Title must be under 100 characters'); return }
    setSaving(v.id)
    try {
      await apiPost('/api/videos/update', {
        accessToken, videoId: v.id, title: e.title, description: e.description,
        tags: e.tags.split(',').map(t => t.trim()).filter(Boolean),
      })
      toast.success('✅ Updated live on YouTube!')
      onVideoUpdated?.({ ...v, title: e.title, description: e.description, tags: e.tags.split(',').map(t => t.trim()).filter(Boolean) })
    } catch (err: any) {
      const msg = err?.response?.data?.error
      if (msg === 'TOKEN_EXPIRED') toast.error('Session expired — reconnect YouTube in Settings, then try again')
      else if (msg?.includes('PERMISSION')) toast.error('Edit permission missing — reconnect YouTube in Settings')
      else toast.error(msg || 'Update failed')
    } finally { setSaving('') }
  }

  const analyze = async (v: EditableVideo) => {
    setScanning(v.id)
    try {
      const res = await apiPost('/api/videos/suggest', { title: v.title, description: v.description, tags: v.tags })
      setSuggestions(s => ({ ...s, [v.id]: res.data }))
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Analysis failed')
    } finally { setScanning('') }
  }

  const applyToEdit = (vid: string, field: 'title' | 'description' | 'tags', value: string) => {
    setEdits(x => ({ ...x, [vid]: { ...x[vid], [field]: value } }))
    toast.success(`${field[0].toUpperCase() + field.slice(1)} applied — review and Save to YouTube`)
  }

  const tagChars = (id: string) => (edits[id]?.tags || '').length

  if (videos.length === 0) {
    return <EmptyState icon="🎬" title="No videos here" description="Videos in this tab will appear here" />
  }

  return (
    <div className="space-y-3">
      {videos.map(v => {
        const open = expanded === v.id
        const e = edits[v.id]
        const sug = suggestions[v.id]
        return (
          <div key={v.id} className="bg-surf2 rounded-xl p-3">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => startEdit(v)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={v.thumbnail} alt="" className="w-28 aspect-video object-cover rounded-lg flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white truncate">{v.title}</div>
                <div className="text-xs text-muted mt-0.5">
                  {fmt(v.views)} views · {fmt(v.likes)} likes · {(v.tags || []).length} tags{v.privacy ? ` · ${v.privacy}` : ''}
                </div>
                {sug && (
                  <div className="text-xs mt-1" style={{ color: sug.score >= 70 ? '#00ff88' : sug.score >= 45 ? '#ffc740' : '#ff3366' }}>
                    SEO Score: {sug.score}/100
                  </div>
                )}
              </div>
              <a href={v.url} target="_blank" rel="noopener noreferrer"
                onClick={ev => ev.stopPropagation()} className="text-muted hover:text-white flex-shrink-0">
                <FiExternalLink size={14} />
              </a>
              <FiChevronDown size={16} className={`text-muted transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
            </div>

            <AnimatePresence>
              {open && e && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="pt-4 mt-4 border-t border-white/5 space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="label mb-0">Title</label>
                        <span className={`text-[10px] ${e.title.length > 100 ? 'text-red' : 'text-muted'}`}>{e.title.length}/100</span>
                      </div>
                      <input className="inp" value={e.title}
                        onChange={ev => setEdits(x => ({ ...x, [v.id]: { ...e, title: ev.target.value } }))} />
                    </div>
                    <div>
                      <label className="label">Description</label>
                      <textarea className="inp min-h-[110px] resize-y" value={e.description}
                        onChange={ev => setEdits(x => ({ ...x, [v.id]: { ...e, description: ev.target.value } }))} />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="label mb-0">Tags (comma separated)</label>
                        <span className={`text-[10px] ${tagChars(v.id) > 480 ? 'text-red' : 'text-muted'}`}>{tagChars(v.id)}/500</span>
                      </div>
                      <textarea className="inp min-h-[60px] resize-y" value={e.tags}
                        onChange={ev => setEdits(x => ({ ...x, [v.id]: { ...e, tags: ev.target.value } }))} />
                    </div>

                    {sug && (
                      <div className="space-y-4">
                        <div className="bg-surf3 rounded-xl p-3">
                          <div className="flex items-center justify-between mb-3">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-muted">SEO Health</div>
                            <div className="font-display text-lg"
                              style={{ color: sug.score >= 70 ? '#00ff88' : sug.score >= 45 ? '#ffc740' : '#ff3366' }}>{sug.score}/100</div>
                          </div>
                          {sug.fixes?.length > 0 ? (
                            <>
                              <div className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2">🔧 What to fix</div>
                              <ul className="space-y-2">
                                {sug.fixes.map((f: any, i: number) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <span className={`badge text-[8px] mt-0.5 flex-shrink-0 ${f.severity === 'high' ? 'badge-red' : f.severity === 'medium' ? 'badge-gold' : 'badge-cyan'}`}>{f.severity}</span>
                                    <div>
                                      <div className="text-xs font-semibold text-white">{f.label}</div>
                                      <div className="text-[11px] text-muted">{f.detail}</div>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </>
                          ) : <div className="text-xs text-green">✓ No issues found — this video is well optimized!</div>}
                        </div>

                        <div className="bg-surf3 rounded-xl p-3 space-y-3">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-muted">✦ What to add</div>
                          {sug.suggestedTitles?.length > 0 && (
                            <div>
                              <div className="text-[10px] text-muted mb-1">Suggested titles</div>
                              <div className="space-y-1.5">
                                {sug.suggestedTitles.map((t: string, i: number) => (
                                  <div key={i} className="flex items-center gap-2">
                                    <span className="text-xs text-white/85 flex-1">{t}</span>
                                    <button onClick={() => applyToEdit(v.id, 'title', t)} className="btn btn-ghost btn-sm text-[10px] flex-shrink-0">Apply</button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {sug.suggestedDescription && (
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <div className="text-[10px] text-muted">Suggested description</div>
                                <button onClick={() => applyToEdit(v.id, 'description', sug.suggestedDescription)} className="btn btn-ghost btn-sm text-[10px]">Apply</button>
                              </div>
                              <div className="text-[11px] text-white/70 bg-surf2 rounded-lg p-2 max-h-24 overflow-y-auto whitespace-pre-wrap">{sug.suggestedDescription}</div>
                            </div>
                          )}
                          {sug.suggestedTags?.length > 0 && (
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <div className="text-[10px] text-muted">Recommended tags</div>
                                <button onClick={() => applyToEdit(v.id, 'tags', sug.suggestedTags.join(', '))} className="btn btn-ghost btn-sm text-[10px]">Apply all</button>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {sug.suggestedTags.map((t: string) => (
                                  <span key={t} onClick={() => { navigator.clipboard.writeText(t); toast.success(`Copied "${t}"`) }}
                                    className="badge-green text-[10px] cursor-pointer hover:brightness-125">{t}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <button onClick={() => save(v)} disabled={saving === v.id} className="btn btn-cyan gap-1.5">
                        {saving === v.id ? <Spinner size={13} /> : <FiSave size={13} />}
                        {saving === v.id ? 'Publishing...' : 'Save to YouTube'}
                      </button>
                      <button onClick={() => analyze(v)} disabled={scanning === v.id} className="btn btn-ghost gap-1.5">
                        {scanning === v.id ? <Spinner size={13} /> : <FiZap size={13} />}
                        {scanning === v.id ? 'Analyzing...' : 'Analyze & Suggest'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
