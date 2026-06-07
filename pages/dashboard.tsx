// pages/dashboard.tsx
import { apiPost, apiGet } from '../lib/api'
import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import DashboardLayout from '../components/layout/DashboardLayout'
import { StatCard, SectionHeader, AIBadge, EmptyState, Skeleton, RankBadge } from '../components/ui'
import { ViewsChart } from '../components/charts/AnalyticsChart'
import { withAuth } from '../lib/withAuth'
import { useAuth } from '../contexts/AuthContext'
import { usePlatform, PLATFORMS } from '../contexts/PlatformContext'
import { FiTrendingUp, FiYoutube, FiLink, FiPlay } from 'react-icons/fi'
import Link from 'next/link'
import toast from 'react-hot-toast'

// Generate demo chart data
function genChartData(days = 30) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (days - i))
    return {
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      views: Math.floor(Math.random() * 50000 + 10000 + i * 1000),
      subscribers: Math.floor(Math.random() * 500 + 50 + i * 20),
    }
  })
}

function DashboardPage() {
  const { profile } = useAuth()
  const { activePlatform, platformData, isConnected, connectPlatform } = usePlatform()
  const activePlt = PLATFORMS.find(p => p.code === activePlatform)!
  const pData = platformData[activePlatform]
  const connected = isConnected(activePlatform)

  const [insights, setInsights] = useState<any[]>([])
  const [trends, setTrends] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [chartData] = useState(genChartData())

  const greeting = (() => {
    const h = new Date().getHours()
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
  })()

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [insRes, trendRes] = await Promise.all([
          apiPost('/api/ai/insights', {
            platform: activePlt.name,
            subscribers: pData?.subscribers,
            views: pData?.views,
          }).catch(() => ({ data: { insights: [] } })),
          apiGet(`/api/trends?platform=${activePlt.name}`)
            .catch(() => ({ data: { trends: [] } })),
        ])
        setInsights(insRes.data.insights?.slice(0, 4) || [])
        setTrends(trendRes.data.trends?.slice(0, 5) || [])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [activePlatform])

  return (
    <DashboardLayout title="Dashboard">
      <div className="p-6 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {greeting}, {profile?.firstName || 'Creator'} 👋
            </h1>
            <p className="text-muted text-sm mt-1">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/keywords">
              <button className="btn btn-ghost btn-sm gap-1.5">🔍 Research</button>
            </Link>
            <Link href="/ai-tools">
              <button className="btn btn-cyan btn-sm gap-1.5">✦ AI Generate</button>
            </Link>
          </div>
        </div>

        {/* Platform Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {PLATFORMS.map(p => {
            const pd = platformData[p.code]
            const conn = isConnected(p.code as any)
            return (
              <motion.div key={p.code}
                whileHover={{ y: -2 }}
                onClick={() => {/* switch platform */}}
                className={`card cursor-pointer border-b-2 transition-all
                           ${activePlatform === p.code ? 'border-white/30 bg-white/10' : 'border-transparent hover:border-white/10'}`}
                style={{ borderBottomColor: activePlatform === p.code ? p.color : undefined }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold" style={{ color: p.color }}>{p.icon}</span>
                  {conn && <span className="badge-green text-[9px]">Live</span>}
                </div>
                <div className="text-xs text-muted mb-1">{p.name}</div>
                <div className="text-xl font-display" style={{ color: p.color }}>
                  {conn && pd?.subscribers ? `${(pd.subscribers / 1000).toFixed(1)}K` : '—'}
                </div>
                {!conn && (
                  <button className="text-[10px] text-cyan mt-1 font-bold hover:underline">
                    Connect →
                  </button>
                )}
              </motion.div>
            )
          })}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard label="Subscribers" loading={loading}
            value={connected && pData?.subscribers ? `${(pData.subscribers / 1000).toFixed(1)}K` : '—'}
            change={connected ? '+2.1% this week' : undefined} color="#00f5ff" />
          <StatCard label="Total Views" loading={loading}
            value={connected && pData?.views ? `${(pData.views / 1000000).toFixed(1)}M` : '—'}
            change={connected ? '+18% this month' : undefined} color="#00ff88" />
          <StatCard label="SEO Score" loading={loading} value="78" change="+5 this week" color="#ffc740" />
          <StatCard label="Keywords Ranked" loading={loading} value="247" change="+31 new" color="#ff0090" />
          <StatCard label="Trending Topics" loading={loading} value="18" change="+6 this week" color="#b4ff00" />
        </div>

        {/* Connect CTA if not connected */}
        {!connected && (
          <div className="card border-cyan/20 bg-cyan/5">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-cyan/20 flex items-center justify-center">
                <FiLink className="text-cyan" size={18} />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-white">Connect {activePlt.name} to see real data</div>
                <div className="text-sm text-muted">Link your account to get live subscriber counts, views, and analytics</div>
              </div>
              <Link href="/settings">
                <button className="btn btn-cyan btn-sm">Connect Now →</button>
              </Link>
            </div>
          </div>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="card lg:col-span-2">
            <SectionHeader title="📈 Views & Subscribers" subtitle="Last 30 days" />
            <ViewsChart data={chartData} />
          </div>
          <div className="card">
            <SectionHeader title="🔥 Trending Now"
              action={<Link href="/trends"><span className="text-xs text-cyan cursor-pointer">See All →</span></Link>} />
            {loading ? (
              <div className="space-y-3">
                {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : trends.length > 0 ? (
              <div className="space-y-2">
                {trends.map((t, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/5 transition-colors">
                    <div className="w-6 h-6 rounded-full bg-surf3 flex items-center justify-center
                                  text-xs font-bold text-cyan flex-shrink-0">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">{t.topic}</div>
                      <div className="text-xs text-muted">{t.growth}</div>
                    </div>
                    <div className="text-xs font-bold" style={{ color: t.viralityScore >= 80 ? '#00ff88' : '#ffc740' }}>
                      🔥 {t.viralityScore}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon="📊" title="Loading trends..." description="Fetching real-time data" />
            )}
          </div>
        </div>

        {/* AI Insights */}
        <div className="card">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan/20 to-magenta/20
                          border border-cyan/20 flex items-center justify-center text-cyan font-bold">✦</div>
            <div>
              <div className="font-bold text-white">AI {activePlt.name} Insights</div>
              <div className="text-xs text-muted">Powered by Gemini AI — updated in real-time</div>
            </div>
            <AIBadge />
          </div>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : insights.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {insights.map((ins, i) => (
                <div key={i} className="p-4 bg-surf2 rounded-xl border border-white/5">
                  <div className="flex items-start gap-2 mb-1.5">
                    <div className={`badge mt-0.5 flex-shrink-0 ${
                      ins.priority === 'high' ? 'badge-red' : ins.priority === 'medium' ? 'badge-gold' : 'badge-cyan'
                    }`}>{ins.priority}</div>
                    <div className="text-sm font-semibold text-white">{ins.title}</div>
                  </div>
                  <p className="text-xs text-muted leading-relaxed">{ins.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted text-sm">
              <div className="loading-dots flex justify-center mb-2"><span /><span /><span /></div>
              Generating AI insights for {activePlt.name}...
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  )
}

export default withAuth(DashboardPage)
