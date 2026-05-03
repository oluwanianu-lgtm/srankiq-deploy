// components/ui/index.tsx
import React from 'react'
import { motion } from 'framer-motion'
import { clsx } from 'clsx'

// ── Skeleton Loader ───────────────────────────────────
export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('skeleton', className)} />
}

// ── Stat Card ─────────────────────────────────────────
interface StatCardProps {
  label: string
  value: string | number
  change?: string
  changeType?: 'up' | 'down' | 'neutral'
  color?: string
  icon?: React.ReactNode
  loading?: boolean
}

export function StatCard({ label, value, change, changeType = 'up', color = '#00f5ff', icon, loading }: StatCardProps) {
  if (loading) {
    return (
      <div className="stat-box p-5" style={{ '--sc': color } as any}>
        <Skeleton className="h-3 w-24 mb-3" />
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-3 w-16" />
      </div>
    )
  }

  return (
    <motion.div
      className="stat-box p-5"
      style={{ '--sc': color } as any}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="text-xs font-bold uppercase tracking-widest text-muted">{label}</div>
        {icon && <div className="text-muted">{icon}</div>}
      </div>
      <div className="text-3xl font-display tracking-wide mb-1" style={{ color }}>{value}</div>
      {change && (
        <div className={clsx('text-xs font-semibold', {
          'text-green': changeType === 'up',
          'text-red': changeType === 'down',
          'text-muted': changeType === 'neutral',
        })}>
          {changeType === 'up' ? '↑' : changeType === 'down' ? '↓' : '→'} {change}
        </div>
      )}
    </motion.div>
  )
}

// ── Section Header ────────────────────────────────────
interface SectionHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-5">
      <div>
        <h2 className="text-lg font-bold text-white">{title}</h2>
        {subtitle && <p className="text-sm text-muted mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

// ── AI Badge ──────────────────────────────────────────
export function AIBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                    bg-gradient-to-r from-cyan/20 to-magenta/20
                    border border-cyan/20 text-[10px] font-bold uppercase tracking-wider text-cyan">
      ✦ SRankIQ AI
    </span>
  )
}

// ── Score Ring ────────────────────────────────────────
interface ScoreRingProps {
  score: number
  size?: number
  label?: string
  color?: string
}

export function ScoreRing({ score, size = 80, label, color = '#00f5ff' }: ScoreRingProps) {
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const scoreColor = score >= 80 ? '#00ff88' : score >= 60 ? '#ffc740' : '#ff3366'

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size/2} cy={size/2} r={r} fill="none"
            stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
          <motion.circle
            cx={size/2} cy={size/2} r={r} fill="none"
            stroke={color || scoreColor} strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-display text-xl" style={{ color: color || scoreColor }}>{score}</span>
        </div>
      </div>
      {label && <span className="text-xs text-muted">{label}</span>}
    </div>
  )
}

// ── Progress Bar ──────────────────────────────────────
interface ProgressBarProps {
  value: number
  max?: number
  color?: string
  label?: string
  showValue?: boolean
}

export function ProgressBar({ value, max = 100, color = '#00f5ff', label, showValue = true }: ProgressBarProps) {
  const pct = Math.min((value / max) * 100, 100)

  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="flex justify-between mb-1.5">
          {label && <span className="text-xs text-muted">{label}</span>}
          {showValue && <span className="text-xs font-bold" style={{ color }}>{Math.round(pct)}%</span>}
        </div>
      )}
      <div className="progress">
        <motion.div
          className="progress-fill"
          style={{ background: color }}
          initial={{ width: '0%' }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

// ── Empty State ───────────────────────────────────────
interface EmptyStateProps {
  icon?: string
  title: string
  description: string
  action?: { label: string; onClick: () => void }
}

export function EmptyState({ icon = '🔍', title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-base font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-muted mb-6 max-w-xs">{description}</p>
      {action && (
        <button className="btn btn-cyan btn-sm" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  )
}

// ── Loading Spinner ───────────────────────────────────
export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="animate-spin">
      <circle cx="12" cy="12" r="10" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
      <path d="M12 2a10 10 0 0 1 10 10" fill="none" stroke="#00f5ff" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

// ── Rank Badge ────────────────────────────────────────
export function RankBadge({ value, max = 100 }: { value: number; max?: number }) {
  const pct = (value / max) * 100
  const color = pct >= 80 ? '#00ff88' : pct >= 60 ? '#ffc740' : '#ff3366'
  const cls = pct >= 80 ? 'rank-high' : pct >= 60 ? 'rank-med' : 'rank-low'

  return (
    <div className={`rank-bar ${cls} gap-2`} style={{ minWidth: 120 }}>
      <div className="rank-track flex-1">
        <motion.div className="rank-fill" style={{ width: `${pct}%` }}
          initial={{ width: '0%' }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6 }}
        />
      </div>
      <span className="text-xs font-bold" style={{ color }}>{value}%</span>
    </div>
  )
}

// ── Tooltip ───────────────────────────────────────────
interface TooltipProps { content: string; children: React.ReactNode }

export function Tooltip({ content, children }: TooltipProps) {
  return (
    <div className="relative group">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1
                     bg-surf2 border border-white/10 rounded text-xs text-white whitespace-nowrap
                     opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
        {content}
      </div>
    </div>
  )
}

// ── Tab Bar ───────────────────────────────────────────
interface TabBarProps {
  tabs: { label: string; value: string; count?: number }[]
  active: string
  onChange: (v: string) => void
}

export function TabBar({ tabs, active, onChange }: TabBarProps) {
  return (
    <div className="flex items-center gap-1 bg-surf2 p-1 rounded-xl w-fit">
      {tabs.map(tab => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={clsx(
            'px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 flex items-center gap-1.5',
            active === tab.value
              ? 'bg-white/10 text-white shadow-sm'
              : 'text-muted hover:text-white'
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={clsx('text-xs px-1.5 py-0.5 rounded-full font-bold',
              active === tab.value ? 'bg-cyan text-black' : 'bg-white/10 text-muted')}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
