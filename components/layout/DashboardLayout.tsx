// components/layout/DashboardLayout.tsx
import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import { usePlatform, PLATFORMS } from '../../contexts/PlatformContext'
import { FiHome, FiBarChart2, FiSearch, FiTrendingUp, FiUsers, FiZap,
         FiUpload, FiSettings, FiCreditCard, FiMenu, FiX, FiBell,
         FiLogOut, FiFileText, FiMessageSquare } from 'react-icons/fi'

// Inline SVG logo — shows everywhere including sidebar
function SRankIQLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00d4ff" />
          <stop offset="100%" stopColor="#7b2fff" />
        </linearGradient>
        <linearGradient id="logoBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#7b2fff" stopOpacity="0.12" />
        </linearGradient>
      </defs>
      {/* Background */}
      <rect width="40" height="40" rx="10" fill="#0d0d14" />
      <rect width="40" height="40" rx="10" fill="url(#logoBg)" />
      <rect x="0.75" y="0.75" width="38.5" height="38.5" rx="9.25" stroke="url(#logoGrad)" strokeOpacity="0.5" strokeWidth="1.5" />
      {/* S letterform */}
      <path
        d="M13 13.8C13 12.2536 14.2536 11 15.8 11H23.2C24.7464 11 26 12.2536 26 13.8C26 15.3464 24.7464 16.6 23.2 16.6H16.6C15.0536 16.6 13.8 17.8536 13.8 19.4C13.8 20.9464 15.0536 22.2 16.6 22.2H22.2C23.7464 22.2 25 23.4536 25 25C25 26.5464 23.7464 27.8 22.2 27.8H15"
        stroke="url(#logoGrad)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Ranking bars */}
      <rect x="28" y="24" width="2.5" height="4" rx="1" fill="url(#logoGrad)" opacity="0.95" />
      <rect x="31.5" y="20.5" width="2.5" height="7.5" rx="1" fill="url(#logoGrad)" opacity="0.75" />
      {/* Accent dot */}
      <circle cx="30.5" cy="12" r="1.5" fill="#00d4ff" opacity="0.85" />
      <circle cx="34" cy="9" r="1" fill="#7b2fff" opacity="0.65" />
    </svg>
  )
}

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: FiHome },
  { href: '/analytics', label: 'Analytics', icon: FiBarChart2 },
  { href: '/keywords', label: 'Keywords', icon: FiSearch },
  { href: '/trends', label: 'Trends', icon: FiTrendingUp },
  { href: '/competitors', label: 'Competitors', icon: FiUsers },
  { href: '/ai-tools', label: 'AI Tools', icon: FiZap },
  { href: '/inspiration', label: 'Get Inspiration', icon: FiMessageSquare },
  { href: '/upload', label: 'Smart Upload', icon: FiUpload },
  { href: '/reports', label: 'Reports', icon: FiFileText },
]

const BOTTOM_NAV = [
  { href: '/settings', label: 'Settings', icon: FiSettings },
  { href: '/billing', label: 'Billing', icon: FiCreditCard },
]

interface Props { children: React.ReactNode; title?: string }

export default function DashboardLayout({ children, title }: Props) {
  const router = useRouter()
  const { profile, logout } = useAuth()
  const { activePlatform, setActivePlatform, isConnected } = usePlatform()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const activePlt = PLATFORMS.find(p => p.code === activePlatform)

  return (
    <div className="flex h-screen bg-bg overflow-hidden">

      {/* ── SIDEBAR ── */}
      <motion.aside
        animate={{ width: sidebarOpen ? 240 : 64 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="flex flex-col bg-surf border-r border-white/5 overflow-hidden flex-shrink-0 z-20"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 p-4 h-16 border-b border-white/5">
          <div className="flex-shrink-0">
            <SRankIQLogo size={32} />
          </div>
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="font-display text-xl tracking-wide leading-none">
                  <span style={{ background: 'linear-gradient(90deg, #00d4ff, #7b2fff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    SRank
                  </span>
                  <span className="text-white">IQ</span>
                </div>
                <div className="text-[9px] text-muted uppercase tracking-widest">
                  Social Media Ranking IQ
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Platform Selector */}
        <div className="p-3 border-b border-white/5">
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2 px-1">
                Active Platform
              </motion.div>
            )}
          </AnimatePresence>
          <div className={`grid ${sidebarOpen ? 'grid-cols-4' : 'grid-cols-1'} gap-1`}>
            {PLATFORMS.map(p => (
              <button key={p.code} onClick={() => setActivePlatform(p.code as any)} title={p.name}
                className={`flex items-center justify-center h-8 rounded-lg text-sm font-bold
                           transition-all duration-150 relative
                           ${activePlatform === p.code ? 'border border-white/30 bg-white/10' : 'hover:bg-white/5 text-muted'}`}
                style={{ color: activePlatform === p.code ? p.color : undefined }}>
                <span style={{ fontSize: p.code === 'yt' ? '10px' : '13px' }}>{p.icon}</span>
                {isConnected(p.code as any) && (
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-green" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 overflow-y-auto space-y-0.5">
          {NAV_ITEMS.map(item => {
            const active = router.pathname === item.href
            const isInspiration = item.href === '/inspiration'
            return (
              <Link href={item.href} key={item.href}>
                <div className={`nav-item ${active ? 'active' : ''} ${isInspiration ? 'relative' : ''}`}>
                  <item.icon size={16} className="flex-shrink-0" style={isInspiration ? { color: '#b4ff00' } : undefined} />
                  <AnimatePresence>
                    {sidebarOpen && (
                      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="text-sm whitespace-nowrap"
                        style={isInspiration ? { color: active ? undefined : '#b4ff00cc' } : undefined}>
                        {item.label}
                        {isInspiration && (
                          <span className="ml-1.5 text-[8px] px-1 py-0.5 rounded bg-lime/20 text-lime font-bold uppercase tracking-wider">
                            New
                          </span>
                        )}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </Link>
            )
          })}
        </nav>

        {/* Connect Accounts */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="p-3 border-t border-white/5">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2 px-1">
                Connected Accounts
              </div>
              {PLATFORMS.slice(0, 4).map(p => (
                <Link href="/settings#connect" key={p.code}>
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer">
                    <span className="text-sm" style={{ color: p.color }}>{p.icon}</span>
                    <span className="text-xs text-muted flex-1 truncate">{p.name}</span>
                    <span className={`text-[10px] font-bold ${isConnected(p.code as any) ? 'text-green' : 'text-muted'}`}>
                      {isConnected(p.code as any) ? '✓' : 'Connect'}
                    </span>
                  </div>
                </Link>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Nav */}
        <div className="p-2 border-t border-white/5 space-y-0.5">
          {BOTTOM_NAV.map(item => {
            const active = router.pathname === item.href
            return (
              <Link href={item.href} key={item.href}>
                <div className={`nav-item ${active ? 'active' : ''}`}>
                  <item.icon size={16} className="flex-shrink-0" />
                  <AnimatePresence>
                    {sidebarOpen && (
                      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="text-sm whitespace-nowrap">{item.label}</motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </Link>
            )
          })}
          {sidebarOpen && (
            <div style={{ display: 'flex', gap: 12, padding: '0 12px 4px' }}>
              <Link href="/terms" className="text-[10px] text-muted hover:text-white/60 transition-colors">Terms</Link>
              <Link href="/privacy" className="text-[10px] text-muted hover:text-white/60 transition-colors">Privacy</Link>
            </div>
          )}

          <div className="nav-item cursor-pointer" onClick={logout}>
            <div className="w-8 h-8 rounded-lg flex-shrink-0 overflow-hidden">
              <SRankIQLogo size={32} />
            </div>
            <AnimatePresence>
              {sidebarOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-white truncate">
                    {profile?.firstName} {profile?.lastName}
                  </div>
                  <div className="text-[10px] text-muted capitalize">{profile?.plan} Plan</div>
                </motion.div>
              )}
            </AnimatePresence>
            {sidebarOpen && <FiLogOut size={14} className="text-muted flex-shrink-0" />}
          </div>
        </div>
      </motion.aside>

      {/* ── MAIN ── */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="h-16 border-b border-white/5 bg-surf/50 backdrop-blur-md
                          flex items-center px-5 gap-4 flex-shrink-0 z-10">
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-muted hover:text-white transition-colors">
            {sidebarOpen ? <FiX size={18} /> : <FiMenu size={18} />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: activePlt?.color }} />
            <span className="text-sm font-semibold">{activePlt?.name}</span>
            {title && <span className="text-muted text-sm">/ {title}</span>}
          </div>
          <div className="flex-1 max-w-md">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={14} />
              <input type="text" placeholder="Search keywords, channels, topics..."
                className="inp pl-9 py-2 text-sm" />
            </div>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button className="relative w-9 h-9 rounded-lg hover:bg-white/5 flex items-center
                              justify-center text-muted hover:text-white transition-colors">
              <FiBell size={16} />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-cyan" />
            </button>
            <Link href="/upload">
              <button className="btn btn-cyan btn-sm gap-1.5">
                <FiUpload size={13} /> Upload
              </button>
            </Link>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <motion.div key={router.pathname} initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="h-full">
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  )
}
