// components/charts/AnalyticsChart.tsx
import React from 'react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="custom-tooltip">
      <p className="text-xs text-muted mb-1 font-bold">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-sm font-semibold" style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  )
}

// ── Views Chart ───────────────────────────────────────
interface ViewsChartProps {
  data: Array<{ date: string; views: number; subscribers?: number }>
  height?: number
}

export function ViewsChart({ data, height = 220 }: ViewsChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#00f5ff" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#00f5ff" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="subsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#00ff88" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#00ff88" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="views" name="Views"
          stroke="#00f5ff" fill="url(#viewsGrad)" strokeWidth={2} />
        {data[0]?.subscribers !== undefined && (
          <Area type="monotone" dataKey="subscribers" name="Subscribers"
            stroke="#00ff88" fill="url(#subsGrad)" strokeWidth={2} />
        )}
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ── Engagement Chart ──────────────────────────────────
export function EngagementChart({ data, height = 220 }: { data: any[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="engGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff0090" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#ff0090" stopOpacity={0.3} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="engagement" name="Engagement %" fill="url(#engGrad)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Multi-Platform Chart ──────────────────────────────
export function MultiPlatformChart({ data, height = 220 }: { data: any[]; height?: number }) {
  const colors = {
    youtube: '#FF0000',
    instagram: '#E1306C',
    tiktok: '#69C9D0',
    facebook: '#1877F2',
    twitter: '#1DA1F2',
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        {Object.entries(colors).map(([key, color]) =>
          data[0]?.[key] !== undefined && (
            <Line key={key} type="monotone" dataKey={key} stroke={color}
              strokeWidth={2} dot={false} name={key.charAt(0).toUpperCase() + key.slice(1)} />
          )
        )}
      </LineChart>
    </ResponsiveContainer>
  )
}

// ── Keyword Ranking Chart ─────────────────────────────
export function KeywordRankingChart({ data, height = 200 }: { data: any[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 30, left: 80, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
        <YAxis dataKey="keyword" type="category" tick={{ fontSize: 10 }} width={80} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="ranking" name="Ranking %" radius={[0, 4, 4, 0]}
          fill="url(#rankGrad)" label={{ position: 'right', fontSize: 10, fill: '#6060a0' }}>
          <defs>
            <linearGradient id="rankGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#00f5ff" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#00f5ff" stopOpacity={1} />
            </linearGradient>
          </defs>
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
