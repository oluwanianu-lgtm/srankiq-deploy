// pages/trends.tsx
import { apiGet } from '../lib/api'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { motion } from 'framer-motion'
import DashboardLayout from '../components/layout/DashboardLayout'
import { withAuth } from '../lib/withAuth'
import { usePlatform, PLATFORMS } from '../contexts/PlatformContext'
import { Spinner, EmptyState } from '../components/ui'
import toast from 'react-hot-toast'

interface Trend {
  topic: string
  channel?: string
  category: string
  thumbnail?: string
  viralityScore: number
  growth: string
  totalViews?: string
  contentIdea: string
  format: string
  videoUrl?: string
}

const REGIONS = [
  { code: 'US', name: '🇺🇸 United States' },
  { code: 'NG', name: '🇳🇬 Nigeria' },
  { code: 'GB', name: '🇬🇧 United Kingdom' },
  { code: 'CA', name: '🇨🇦 Canada' },
  { code: 'IN', name: '🇮🇳 India' },
  { code: 'AU', name: '🇦🇺 Australia' },
  { code: 'DE', name: '🇩🇪 Germany' },
  { code: 'FR', name: '🇫🇷 France' },
  { code: 'BR', name: '🇧🇷 Brazil' },
  { code: 'JP', name: '🇯🇵 Japan' },
  { code: 'KR', name: '🇰🇷 South Korea' },
  { code: 'MX', name: '🇲🇽 Mexico' },
  { code: 'ZA', name: '🇿🇦 South Africa' },
  { code: 'GH', name: '🇬🇭 Ghana' },
  { code: 'KE', name: '🇰🇪 Kenya' },
  { code: 'EG', name: '🇪🇬 Egypt' },
  { code: 'ES', name: '🇪🇸 Spain' },
  { code: 'IT', name: '🇮🇹 Italy' },
  { code: 'NL', name: '🇳🇱 Netherlands' },
  { code: 'ID', name: '🇮🇩 Indonesia' },
  { code: 'PH', name: '🇵🇭 Philippines' },
  { code: 'AE', name: '🇦🇪 UAE' },
  { code: 'SA', name: '🇸🇦 Saudi Arabia' },
]

function TrendsPage() {
  const router = useRouter()
  const { activePlatform, setActivePlatform } = usePlatform()
  const activePlt = PLATFORMS.find(p => p.code === activePlatform)!
  const [trends, setTrends] = useState<Trend[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [region, setRegion] = useState('US')
  const [nextPageToken, setNextPageToken] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setTrends([])
    setNextPageToken(null)
    try {
      const res = await apiGet(`/api/trends?platform=${activePlt.name}&region=${region}`)
      setTrends(res.data.trends || [])
      setNextPageToken(res.data.nextPageToken || null)
    } catch {
      setTrends([])
    } finally {
      setLoading(false)
    }
  }

  const loadMore = async () => {
    if (!nextPageToken) return
    setLoadingMore(true)
    try {
      const res = await apiGet(
        `/api/trends?platform=${activePlt.name}&region=${region}&pageToken=${nextPageToken}`
      )
      setTrends(prev => [...prev, ...(res.data.trends || [])])
      setNextPageToken(res.data.nextPageToken || null)
    } catch {
      toast.error('Could not load more trends')
    } finally {
      setLoadingMore(false)
    }
  }

  useEffect(() => { load() }, [activePlatform, region])

  const useIdea = (t: Trend) => {
    sessionStorage.setItem('srankiq_upload_prefill', JSON.stringify({
      title: t.topic,
      platform: activePlatform,
      tags: t.category,
    }))
    toast.success('Idea loaded into Smart Upload!')
    router.push('/upload')
  }

  const isYouTube = activePlt.code === 'yt'

  return (
    <DashboardLayout title="Trends">
      <div className="p-6 space-y-6">

        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold">🔥 Trend Discovery</h1>
            <p className="text-muted text-sm">What's trending right now</p>
          </div>
          <div className="flex items-center gap-2">
            {isYouTube && (
              <select value={region} onChange={e => setRegion(e.target.value)}
                className="inp py-2 text-sm w-auto pr-8 cursor-pointer">
                {REGIONS.map(r => (
                  <option key={r.code} value={r.code}>{r.name}</option>
                ))}
              </select>
            )}
            <button onClick={load} disabled={loading}
              className="btn btn-ghost btn-sm gap-1.5">
              {loading ? <Spinner size={13} /> : '↻'} Refresh
            </button>
          </div>
        </div>

        {/* Platform switcher */}
        <div className="flex gap-2 flex-wrap">
          {PLATFORMS.map(p => (
            <button key={p.code}
              onClick={() => setActivePlatform(p.code as any)}
              className={`plt-chip ${activePlatform === p.code ? 'active' : ''}`}
              style={{ borderColor: activePlatform === p.code ? p.color + '66' : undefined }}>
              <span style={{ color: p.color }}>{p.icon}</span>
              <span className="text-sm">{p.name}</span>
            </button>
          ))}
        </div>

        {loading && (
          <div className="card flex flex-col items-center justify-center py-20">
            <div className="loading-dots flex justify-center mb-4"><span /><span /><span /></div>
            <p className="text-muted text-sm">Loading...</p>
          </div>
        )}

        {!loading && trends.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trends.map((t, i) => {
                const scoreColor = t.viralityScore >= 85 ? '#00ff88' :
                                   t.viralityScore >= 70 ? '#ffc740' : '#00f5ff'
                return (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }} transition={{ delay: (i % 24) * 0.04 }}
                    className="card hover:border-white/10 transition-all duration-200
                               border-b-2 overflow-hidden p-0" style={{ borderBottomColor: scoreColor }}>

                    {/* Thumbnail */}
                    {t.thumbnail && (
                      <a href={t.videoUrl} target="_blank" rel="noopener noreferrer"
                        className="block relative group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={t.thumbnail} alt={t.topic}
                          className="w-full aspect-video object-cover group-hover:opacity-80 transition-opacity" />
                        <div className="absolute top-2 left-2 w-7 h-7 rounded-full bg-black/70
                                      flex items-center justify-center font-display text-sm"
                          style={{ color: scoreColor }}>
                          {i + 1}
                        </div>
                        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70
                                      text-[10px] font-bold text-white">
                          {t.totalViews} views
                        </div>
                      </a>
                    )}

                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <div className="text-[10px] text-muted uppercase tracking-wider">
                            {t.category}{t.channel ? ` · ${t.channel}` : ''}
                          </div>
                          <div className="text-sm font-bold text-white leading-tight line-clamp-2">{t.topic}</div>
                        </div>
                        <div className="text-center flex-shrink-0">
                          <div className="font-display text-2xl" style={{ color: scoreColor }}>{t.viralityScore}</div>
                          <div className="text-[9px] text-muted">Virality</div>
                        </div>
                      </div>

                      <div className="progress mb-3">
                        <motion.div className="progress-fill" style={{ background: scoreColor }}
                          initial={{ width: '0%' }} animate={{ width: `${t.viralityScore}%` }}
                          transition={{ duration: 0.8 }} />
                      </div>

                      <div className="text-[10px] font-bold text-green mb-2">{t.growth}</div>

                      <div className="bg-surf2 rounded-lg p-2.5 mb-3">
                        <div className="text-[10px] text-muted mb-1">💡 Content Idea</div>
                        <p className="text-xs text-white/80 leading-relaxed">{t.contentIdea}</p>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="badge-cyan text-[9px]">{t.format}</span>
                        <button onClick={() => useIdea(t)}
                          className="text-xs text-cyan font-bold hover:underline">
                          Use this idea →
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>

            {/* Load more */}
            {nextPageToken && (
              <div className="flex justify-center pt-2">
                <button onClick={loadMore} disabled={loadingMore}
                  className="btn btn-cyan gap-2 px-8">
                  {loadingMore ? <><Spinner size={14} /> Loading...</> : 'Load More Trends'}
                </button>
              </div>
            )}
          </>
        )}

        {!loading && trends.length === 0 && (
          <EmptyState icon="📊" title="No trends loaded"
            description="Click Refresh to load trending topics"
            action={{ label: 'Load Trends', onClick: load }} />
        )}
      </div>
    </DashboardLayout>
  )
}

export default withAuth(TrendsPage)
