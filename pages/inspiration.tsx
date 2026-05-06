// pages/inspiration.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import DashboardLayout from '../components/layout/DashboardLayout'
import { withAuth } from '../lib/withAuth'
import { usePlatform } from '../contexts/PlatformContext'
import axios from 'axios'
import toast from 'react-hot-toast'
import { FiSend, FiCopy, FiArrowRight, FiPlus, FiZap, FiTrendingUp, FiTarget, FiVideo, FiCalendar, FiEdit3 } from 'react-icons/fi'
import { useRouter } from 'next/router'

interface Message {
  role: 'user' | 'assistant'
  content: string
  ideas?: string[]
  timestamp: string
}

type Theme = 'dark' | 'light'

// v4 — new key wipes old stale history that was causing wrong responses
const STORAGE_KEY = 'srankiq_chat_v4'
const THEME_KEY = 'srankiq_theme_v3'

function getAutoTheme(): Theme {
  const h = new Date().getHours()
  return h >= 6 && h < 19 ? 'light' : 'dark'
}

const DARK = {
  page: 'bg-[#0d0d0d]',
  header: 'bg-[#0d0d0d]/95 border-b border-white/5',
  main: 'bg-[#0d0d0d]',
  bubbleAI: 'text-[#e8e8e8]',
  bubbleUser: 'bg-[#1a1a1a] border border-white/8 text-[#e8e8e8]',
  avatarAI: 'bg-gradient-to-br from-[#00d4ff] to-[#7b2fff] text-white',
  input: 'bg-[#1a1a1a] border border-white/8 text-white placeholder-white/20',
  inputBtn: 'bg-white text-black hover:bg-white/90',
  text: 'text-white',
  textSecondary: 'text-white/50',
  card: 'bg-[#141414] border border-white/6 hover:border-white/12',
  accent: '#00d4ff',
  accentText: 'text-[#00d4ff]',
  divider: 'border-white/5',
  badge: 'bg-white/5 text-white/50 border border-white/8',
  sectionHead: 'text-white/30',
}

const LIGHT = {
  page: 'bg-[#fafafa]',
  header: 'bg-white/95 border-b border-gray-100',
  main: 'bg-[#fafafa]',
  bubbleAI: 'text-[#1a1a1a]',
  bubbleUser: 'bg-white border border-gray-200 text-[#1a1a1a]',
  avatarAI: 'bg-gradient-to-br from-[#0070f3] to-[#7b2fff] text-white',
  input: 'bg-white border border-gray-200 text-gray-900 placeholder-gray-400',
  inputBtn: 'bg-[#0d0d0d] text-white hover:bg-[#1a1a1a]',
  text: 'text-[#0d0d0d]',
  textSecondary: 'text-gray-400',
  card: 'bg-white border border-gray-200 hover:border-gray-300 shadow-sm',
  accent: '#0070f3',
  accentText: 'text-[#0070f3]',
  divider: 'border-gray-100',
  badge: 'bg-gray-100 text-gray-500 border border-gray-200',
  sectionHead: 'text-gray-400',
}

const STARTERS = [
  { icon: <FiZap size={16} />, title: 'Video ideas', prompt: 'Give me 10 specific viral video ideas with full titles, hooks, and thumbnail concepts for my channel.' },
  { icon: <FiTrendingUp size={16} />, title: 'More views', prompt: 'Give me a complete strategy to get more views on YouTube in 2026 with specific tactics and examples.' },
  { icon: <FiTarget size={16} />, title: 'Channel audit', prompt: 'Help me audit my YouTube channel. What are the key areas I should improve to grow faster?' },
  { icon: <FiVideo size={16} />, title: 'Watch time', prompt: 'Give me a complete guide on how to make my videos more engaging so viewers watch till the end.' },
  { icon: <FiCalendar size={16} />, title: '30-day plan', prompt: 'Create a complete 30-day YouTube content calendar with specific video titles, posting days, and thumbnail tips.' },
  { icon: <FiEdit3 size={16} />, title: 'Title formulas', prompt: 'Give me 20 YouTube title formulas that guarantee clicks, with real examples for each formula.' },
]

function ts() {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function defaultMsg(): Message {
  return {
    role: 'assistant',
    content: `How can I help you grow your YouTube channel today?\n\nAsk me anything — video ideas, content calendars, title formulas, hooks, thumbnail concepts, channel audits, growth strategies, and more.`,
    timestamp: ts(),
    ideas: [],
  }
}

function formatContent(text: string, isDark: boolean) {
  const s = isDark ? DARK : LIGHT
  const lines = text.split('\n')
  const els: React.ReactNode[] = []
  let k = 0

  for (const line of lines) {
    const key = k++

    if (!line.trim()) { els.push(<div key={key} className="h-2" />); continue }

    // ALL CAPS section header
    if (line === line.toUpperCase() && line.length > 3 && /[A-Z]/.test(line) && !/^\d/.test(line)) {
      els.push(
        <div key={key} className={`text-[10px] font-bold tracking-widest uppercase mt-4 mb-1 ${s.sectionHead}`}>
          {line}
        </div>
      )
      continue
    }

    // Numbered list
    const num = line.match(/^(\d+)[.)]\s+(.+)/)
    if (num) {
      els.push(
        <div key={key} className="flex gap-3 py-0.5">
          <span className={`text-xs font-bold mt-0.5 flex-shrink-0 w-5 text-right ${s.accentText}`}>{num[1]}.</span>
          <span className="text-sm leading-relaxed">{num[2]}</span>
        </div>
      )
      continue
    }

    // Dash / bullet
    const dash = line.match(/^[-•]\s+(.+)/)
    if (dash) {
      els.push(
        <div key={key} className="flex gap-3 py-0.5">
          <span className={`text-xs mt-1.5 flex-shrink-0 ${s.textSecondary}`}>—</span>
          <span className="text-sm leading-relaxed">{dash[1]}</span>
        </div>
      )
      continue
    }

    // Day / Step / Phase label
    const label = line.match(/^(Day \d+|Week \d+|Phase \d+|Step \d+|Tip \d+|Title|Pillar)[:.]?\s*(.*)/)
    if (label) {
      els.push(
        <div key={key} className="flex gap-2 py-0.5 flex-wrap">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-md flex-shrink-0 ${isDark ? 'bg-white/6 text-[#00d4ff]' : 'bg-blue-50 text-[#0070f3]'}`}>
            {label[1]}
          </span>
          {label[2] && <span className="text-sm leading-relaxed">{label[2]}</span>}
        </div>
      )
      continue
    }

    els.push(<p key={key} className="text-sm leading-relaxed">{line}</p>)
  }

  return els
}

function InspirationPage() {
  const { activePlatform } = usePlatform()
  const router = useRouter()
  const autoSentRef = useRef(false)
  const [theme, setTheme] = useState<Theme>('dark')
  const [messages, setMessages] = useState<Message[]>([defaultMsg()])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const isDark = theme === 'dark'
  const s = isDark ? DARK : LIGHT

  // Init
  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY)
      if (saved === 'manual-dark') setTheme('dark')
      else if (saved === 'manual-light') setTheme('light')
      else setTheme(getAutoTheme())

      const savedChat = localStorage.getItem(STORAGE_KEY)
      if (savedChat) {
        const parsed = JSON.parse(savedChat)
        if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed)
      }
    } catch { }
  }, [])

  // Save chat — max 20 messages stored
  useEffect(() => {
    try {
      if (messages.length > 1) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-20)))
      }
    } catch { }
  }, [messages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Auto-send from URL query (e.g. from Competitors clone)
  useEffect(() => {
    const msg = router.query.msg as string
    if (msg && !autoSentRef.current) {
      autoSentRef.current = true
      setTimeout(() => send(decodeURIComponent(msg)), 600)
    }
  }, [router.query.msg])

  const toggleTheme = () => {
    const next = isDark ? 'light' : 'dark'
    setTheme(next)
    try { localStorage.setItem(THEME_KEY, `manual-${next}`) } catch { }
  }

  const newChat = () => {
    autoSentRef.current = false
    setMessages([defaultMsg()])
    try { localStorage.removeItem(STORAGE_KEY) } catch { }
  }

  const copy = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied!')
  }

  const useInTools = (idea: string) => router.push(`/ai-tools?topic=${encodeURIComponent(idea)}`)

  const send = useCallback(async (text?: string) => {
    const msg = (text || input).trim()
    if (!msg || loading) return
    setInput('')

    const userMsg: Message = { role: 'user', content: msg, timestamp: ts() }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      // Send only last 6 messages as history (3 exchanges) with 500 char cap each
      // This is the key fix — we never send the full history, avoiding stale context
      const history = messages
        .slice(-6)
        .map(m => ({ role: m.role, content: m.content.slice(0, 500) }))

      const res = await axios.post('/api/ai/inspiration', { message: msg, history })

      const reply = res.data.reply || 'Something went wrong. Please try again!'
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: reply,
        ideas: res.data.ideas || [],
        timestamp: ts(),
      }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Connection error. Please try again!',
        timestamp: ts(),
      }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [input, loading, messages])

  const showStarters = messages.length === 1 && !loading

  return (
    <DashboardLayout title="Get Inspiration">
      <div className={`flex flex-col h-full ${s.page} transition-colors duration-300`}>

        {/* Top bar */}
        <div className={`flex items-center justify-between px-5 h-12 ${s.header} flex-shrink-0 z-10`}>
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${s.avatarAI}`}>✦</div>
            <span className={`text-sm font-semibold ${s.text}`}>SRankIQ AI</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${s.badge}`}>YouTube Coach</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all ${s.badge} hover:opacity-80`}>
              {isDark ? '☀️' : '🌙'}
              <span className={s.textSecondary}>{isDark ? 'Light' : 'Dark'}</span>
            </button>
            <button onClick={newChat}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all ${s.badge} hover:opacity-80`}>
              <FiPlus size={11} />
              <span className={s.textSecondary}>New chat</span>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className={`flex-1 overflow-y-auto ${s.main}`}>
          <div className="max-w-2xl mx-auto px-4 py-6">

            {showStarters && (
              <>
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  className="text-center mb-8">
                  <div className={`text-2xl font-bold mb-1.5 ${s.text}`}>How can I help you grow?</div>
                  <div className={`text-sm ${s.textSecondary}`}>Ask me anything about your YouTube channel</div>
                </motion.div>

                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
                  className="grid grid-cols-2 gap-2.5 mb-8">
                  {STARTERS.map((card, i) => (
                    <motion.button key={i}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 * i }}
                      onClick={() => send(card.prompt)}
                      className={`text-left p-4 rounded-xl border transition-all hover:scale-[1.01] ${s.card}`}>
                      <div className={`mb-2 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>{card.icon}</div>
                      <div className={`text-sm font-semibold mb-1 ${s.text}`}>{card.title}</div>
                      <div className={`text-xs leading-relaxed ${s.textSecondary}`}>{card.prompt.slice(0, 60)}...</div>
                    </motion.button>
                  ))}
                </motion.div>
              </>
            )}

            <div className="space-y-6">
              {messages.map((msg, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  {msg.role === 'user' ? (
                    <div className="flex justify-end">
                      <div className="max-w-[80%]">
                        <div className={`text-[10px] text-right mb-1 ${s.textSecondary}`}>You · {msg.timestamp}</div>
                        <div className={`px-4 py-3 rounded-2xl rounded-tr-sm text-sm leading-relaxed ${s.bubbleUser}`}>
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <div className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-bold self-start mt-0.5 ${s.avatarAI}`}>
                        ✦
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-[10px] mb-2 ${s.textSecondary}`}>SRankIQ AI · {msg.timestamp}</div>
                        <div className={`${s.bubbleAI} space-y-0.5`}>
                          {formatContent(msg.content, isDark)}
                        </div>

                        {/* Idea chips */}
                        {msg.ideas && msg.ideas.length > 0 && (
                          <div className="mt-3 space-y-1.5">
                            <div className={`text-[10px] font-semibold uppercase tracking-wider ${s.textSecondary}`}>Ideas to use</div>
                            {msg.ideas.map((idea, j) => (
                              <div key={j} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-all group cursor-default ${s.card}`}>
                                <span className={`font-bold flex-shrink-0 w-4 ${s.accentText}`}>{j + 1}</span>
                                <span className={`flex-1 ${s.text}`}>{idea}</span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => copy(idea)} className={`w-6 h-6 rounded flex items-center justify-center ${s.textSecondary} hover:opacity-80`}>
                                    <FiCopy size={10} />
                                  </button>
                                  <button onClick={() => useInTools(idea)} className={`w-6 h-6 rounded flex items-center justify-center ${s.textSecondary} hover:opacity-80`}>
                                    <FiArrowRight size={10} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {i > 0 && (
                          <button onClick={() => copy(msg.content)}
                            className={`mt-2 flex items-center gap-1 text-[10px] ${s.textSecondary} hover:opacity-80 transition-opacity`}>
                            <FiCopy size={9} /> Copy
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}

              {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                  <div className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-bold ${s.avatarAI}`}>✦</div>
                  <div className="flex items-center gap-1.5 pt-2">
                    {[0, 0.15, 0.3].map((d, i) => (
                      <motion.div key={i}
                        animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                        transition={{ repeat: Infinity, duration: 1.1, delay: d }}
                        className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-white/30' : 'bg-gray-400'}`} />
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            <div ref={bottomRef} className="h-4" />
          </div>
        </div>

        {/* Input */}
        <div className={`flex-shrink-0 border-t ${s.divider} ${isDark ? 'bg-[#0d0d0d]' : 'bg-[#fafafa]'}`}>
          <div className="max-w-2xl mx-auto px-4 py-3">
            <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${s.input} shadow-sm`}>
              <input ref={inputRef}
                className="flex-1 bg-transparent outline-none text-sm"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                placeholder="How can I help you grow?"
                disabled={loading}
              />
              <button onClick={() => send()} disabled={!input.trim() || loading}
                className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-30 ${s.inputBtn}`}>
                {loading
                  ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                      className={`w-3.5 h-3.5 border-2 rounded-full ${isDark ? 'border-black/20 border-t-black' : 'border-white/30 border-t-white'}`} />
                  : <FiSend size={13} />}
              </button>
            </div>
            <div className="flex items-center justify-between mt-1.5 px-1">
              <p className={`text-[10px] ${s.textSecondary}`}>Enter to send · ↗ on any idea to use in AI Tools</p>
              <p className={`text-[10px] ${s.textSecondary}`}>{messages.length - 1} messages · {isDark ? '🌙 Dark' : '☀️ Light'} mode</p>
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  )
}

export default withAuth(InspirationPage)
