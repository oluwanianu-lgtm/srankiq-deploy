// pages/analytics.tsx
import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import DashboardLayout from '../components/layout/DashboardLayout'
import { withAuth } from '../lib/withAuth'
import { usePlatform, PLATFORMS } from '../contexts/PlatformContext'
import { SectionHeader, Skeleton, TabBar } from '../components/ui'
import { ViewsChart, EngagementChart } from '../components/charts/AnalyticsChart'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import Link from 'next/link'
import { FiLink, FiDownload, FiRefreshCw, FiEye, FiThumbsUp } from 'react-icons/fi'

function generateData(days: number, base: number) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (days - i))
    return {
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      views: Math.floor(base * (0.7 + Math.random() * 0.6) + i * 500),
      subscribers: Math.floor(base * 0.01 * (0.5 + Math.random())),
      engagement: parseFloat((2 + Math.random() * 6).toFixed(1)),
      likes: Math.floor(base * 0.05 * Math.random()),
    }
  })
}

function StatBox({ label, value, color, change }: { label: string; value: any; color: string; change?: string }) {
  return (
    <div className="card text-center">
      <div className="text-2xl font-display mb-1" style={{ color }}>{value}</div>
      <div className="text-xs text-muted">{label}</div>
      {change && <div className="text-[10px] text-green mt-1">{change}</div>}
    </div>
  )
}

function AnalyticsPage() {
  const { activePlatform, platformData, isConnected } = usePlatform()
  const { user } = useAuth()
  const activePlt = PLATFORMS.find(p => p.code === activePlatform)!
  const pData = platformData[activePlatform]
  const connected = isConnected(activePlatform)

  const [period, setPeriod] = useState('30')
  const [videos, setVideos] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const chartData = generateData(parseInt(period), pData?.views || 50000)

  const loadData = async () => {
    if (!connected || !pData?.accessToken || activePlatform !== 'yt') return
    setLoading(true)
    try {
      const res = await axios.post('/api/analytics/youtube', { accessToken: pData.accessToken })
      setVideos(res.data.videos || [])
    } catch { } finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [activePlatform, connected])

  const periodTabs = [
    { label: '7 Days', value: '7' },
    { label: '30 Days', value: '30' },
    { label: '90 Days', value: '90' },
  ]

  const formatNum = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return `${n}`
  }

  return (
    <DashboardLayout title="Analytics">
      <div className="p-6 space-y-6">

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold">📊 Analytics</h1>
            <p className="text-muted text-sm">{activePlt.name} performance overview</p>
          </div>
          {connected && (
            <div className="flex items-center gap-2">
              <TabBar tabs={periodTabs} active={period} onChange={setPeriod} />
              <button onClick={loadData} className="btn btn-ghost btn-sm gap-1.5">
                <FiRefreshCw size={13} /> Refresh
              </button>
            </div>
          )}
        </div>

        {/* Not connected — show CTA only, no fake stats */}
        {!connected ? (
          <div className="card border-cyan/20 bg-cyan/5 text-center py-16">
            <div className="text-5xl mb-4">🔗</div>
            <h3 className="text-lg font-bold mb-2">Connect {activePlt.name} to see your analytics</h3>
            <p className="text-muted text-sm mb-6 max-w-sm mx-auto">
              Link your {activePlt.name} account to unlock real subscriber counts, view history,
              engagement rates, and top performing content.
            </p>
            <Link href="/settings">
              <button className="btn btn-cyan gap-2">
                <FiLink size={15} /> Connect {activePlt.name}
              </button>
            </Link>
          </div>
        ) : (
          <>
            {/* Real stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <StatBox
                label={activePlatform === 'yt' ? 'Subscribers' : 'Followers'}
                value={pData?.subscribers ? formatNum(pData.subscribers) : '—'}
                color="#00f5ff" />
              <StatBox
                label="Total Views"
                value={pData?.views ? formatNum(pData.views) : '—'}
                color="#00ff88" />
              <StatBox
                label={activePlatform === 'yt' ? 'Videos' : 'Posts'}
                value={pData?.videoCount || '—'}
                color="#ffc740" />
              <StatBox label="Avg Engagement" value="—" color="#ff0090" />
              <StatBox label="SEO Score" value="—" color="#b4ff00" />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="card">
                <SectionHeader title="📈 Views Over Time" subtitle={`Last ${period} days`} />
                <ViewsChart data={chartData} />
              </div>
              <div className="card">
                <SectionHeader title="💬 Engagement Rate" subtitle={`Last ${period} days`} />
                <EngagementChart data={chartData} />
              </div>
            </div>

            {/* Top content */}
            {loading && (
              <div className="card space-y-3">
                {[1,2,3,4].map(i => <Skeleton key={i} className="h-12" />)}
              </div>
            )}

            {!loading && videos.length > 0 && (
              <div className="card">
                <SectionHeader title="🏆 Top Performing Content"
                  subtitle="Your best videos by views"
                  action={
                    <button className="btn btn-ghost btn-sm gap-1.5">
                      <FiDownload size={13} /> Export
                    </button>
                  } />
                <div className="space-y-2">
                  {videos.slice(0, 8).map((v: any, i: number) => (
                    <motion.div key={v.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors">
                      <div className="text-muted font-bold text-sm w-5 text-center">{i + 1}</div>
                      {v.thumbnail && (
                        <img src={v.thumbnail} alt="" className="w-16 h-9 rounded object-cover flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">{v.title}</div>
                        <div className="text-xs text-muted flex items-center gap-3 mt-0.5">
                          <span className="flex items-center gap-1">
                            <FiEye size={10} /> {v.views?.toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <FiThumbsUp size={10} /> {v.likes?.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-muted flex-shrink-0">
                        {new Date(v.publishedAt).toLocaleDateString()}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

export default withAuth(AnalyticsPage)
