// pages/analytics.tsx — real YouTube performance data
import { apiPost } from '../lib/api'
import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import DashboardLayout from '../components/layout/DashboardLayout'
import { withAuth } from '../lib/withAuth'
import { usePlatform, PLATFORMS } from '../contexts/PlatformContext'
import { StatCard, SectionHeader, EmptyState, Skeleton } from '../components/ui'
import Link from 'next/link'
import { FiLink, FiRefreshCw } from 'react-icons/fi'

const fmtN = (n: number) =>
  n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : String(n || 0)

function AnalyticsPage() {
  const { activePlatform, platformData, isConnected } = usePlatform()
  const activePlt = PLATFORMS.find(p => p.code === activePlatform)!
  const pData = platformData[activePlatform]
  const connected = isConnected(activePlatform)
  const ytToken = (pData as any)?.accessToken

  const [channel, setChannel] = useState<any>(null)
  const [videos, setVideos] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const loadData = async () => {
    if (!connected || !ytToken || activePlatform !== 'yt') return
    setLoading(true)
    try {
      const res = await apiPost('/api/analytics/youtube', { accessToken: ytToken })
      setChannel(res.data.channel)
      setVideos(res.data.videos || [])
    } catch { /* token may be expired */ } finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [activePlatform, connected, ytToken]) // eslint-disable-line

  // Real, computed metrics — no random data
  const avgEngagement = videos.length
    ? (videos.reduce((s, v) => s + ((v.likes + v.comments) / Math.max(1, v.views)), 0) / videos.length * 100)
    : 0
  const avgViews = videos.length
    ? Math.round(videos.reduce((s, v) => s + (v.views || 0), 0) / videos.length) : 0
  const topByViews = [...videos].sort((a, b) => b.views - a.views)
  const maxViews = Math.max(...videos.map(v => v.views), 1)
  const maxEng = Math.max(...videos.map(v => ((v.likes + v.comments) / Math.max(1, v.views)) * 100), 1)

  return (
    <DashboardLayout title="Analytics">
      <div className="p-6 space-y-6">

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold">📊 Analytics</h1>
            <p className="text-muted text-sm">{activePlt.name} performance overview — real data</p>
          </div>
          <button onClick={loadData} className="btn btn-ghost btn-sm gap-1.5">
            <FiRefreshCw size={13} /> Refresh
          </button>
        </div>

        {!connected ? (
          <div className="card border-cyan/20 bg-cyan/5 text-center py-12">
            <div className="text-5xl mb-4">🔗</div>
            <h3 className="text-lg font-bold mb-2">Connect {activePlt.name} to see analytics</h3>
            <p className="text-muted text-sm mb-6">
              Link your account to see real subscriber counts, views, and engagement.
            </p>
            <Link href="/settings">
              <button className="btn btn-cyan gap-2"><FiLink size={15} /> Connect {activePlt.name}</button>
            </Link>
          </div>
        ) : connected && !ytToken ? (
          <div className="card border-gold/20 bg-gold/5 text-center py-12">
            <div className="text-5xl mb-4">🔄</div>
            <h3 className="text-lg font-bold mb-2">Reconnect YouTube</h3>
            <p className="text-muted text-sm mb-6">
              Your session expired. Reconnect in Settings to refresh your real analytics.
            </p>
            <Link href="/settings"><button className="btn btn-cyan gap-2">Reconnect →</button></Link>
          </div>
        ) : (
          <>
            {/* Real stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <StatCard label="Subscribers" loading={loading}
                value={channel ? fmtN(channel.subscribers) : '—'} color="#00f5ff" />
              <StatCard label="Total Views" loading={loading}
                value={channel ? fmtN(channel.views) : '—'} color="#00ff88" />
              <StatCard label="Videos" loading={loading}
                value={channel ? String(channel.videos) : '—'} color="#ffc740" />
              <StatCard label="Avg Views / Video" loading={loading}
                value={videos.length ? fmtN(avgViews) : '—'} color="#ff0090" />
              <StatCard label="Avg Engagement" loading={loading}
                value={videos.length ? `${avgEngagement.toFixed(1)}%` : '—'} color="#b4ff00" />
            </div>

            {loading && (
              <div className="card space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-12" />)}</div>
            )}

            {!loading && videos.length > 0 && (
              <>
                {/* Real charts from actual video data */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div className="card">
                    <SectionHeader title="📈 Views by Video" subtitle="Your recent videos, by views" />
                    <div className="space-y-2.5 mt-2">
                      {topByViews.slice(0, 8).map((v, i) => (
                        <div key={v.id} className="flex items-center gap-3">
                          <span className="text-xs font-bold text-muted w-4">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-white truncate mb-1">{v.title}</div>
                            <div className="h-2 rounded-full bg-surf3 overflow-hidden">
                              <div className="h-full rounded-full"
                                style={{ width: `${(v.views / maxViews) * 100}%`, background: 'linear-gradient(90deg,#00f5ff,#00ff88)' }} />
                            </div>
                          </div>
                          <span className="text-xs text-muted w-14 text-right">{fmtN(v.views)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="card">
                    <SectionHeader title="💬 Engagement by Video" subtitle="(likes + comments) / views" />
                    <div className="space-y-2.5 mt-2">
                      {videos.slice(0, 8).map((v) => {
                        const eng = ((v.likes + v.comments) / Math.max(1, v.views)) * 100
                        return (
                          <div key={v.id} className="flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="text-xs text-white truncate mb-1">{v.title}</div>
                              <div className="h-2 rounded-full bg-surf3 overflow-hidden">
                                <div className="h-full rounded-full"
                                  style={{ width: `${(eng / maxEng) * 100}%`, background: 'linear-gradient(90deg,#ff0090,#ffc740)' }} />
                              </div>
                            </div>
                            <span className="text-xs text-muted w-12 text-right">{eng.toFixed(1)}%</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Top performing list */}
                <div className="card">
                  <SectionHeader title="🏆 Top Performing Content" subtitle="Your best videos by views" />
                  <div className="space-y-2">
                    {topByViews.slice(0, 8).map((v: any, i: number) => (
                      <motion.a key={v.id} href={v.url} target="_blank" rel="noopener noreferrer"
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                        className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors">
                        <div className="text-muted font-bold text-sm w-5 text-center">{i + 1}</div>
                        {v.thumbnail && <img src={v.thumbnail} alt="" className="w-16 h-9 rounded object-cover flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white truncate">{v.title}</div>
                          <div className="text-xs text-muted">
                            {fmtN(v.views)} views · {fmtN(v.likes)} likes · {fmtN(v.comments)} comments
                          </div>
                        </div>
                        <div className="text-xs text-muted flex-shrink-0">{new Date(v.publishedAt).toLocaleDateString()}</div>
                      </motion.a>
                    ))}
                  </div>
                </div>
              </>
            )}

            {!loading && videos.length === 0 && (
              <EmptyState icon="📊" title="No video data yet"
                description="Once your channel has videos, real performance charts appear here" />
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

export default withAuth(AnalyticsPage)
