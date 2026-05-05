// pages/inspiration.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import DashboardLayout from '../components/layout/DashboardLayout'
import { withAuth } from '../lib/withAuth'
import { usePlatform } from '../contexts/PlatformContext'
import axios from 'axios'
import toast from 'react-hot-toast'
import { FiSend, FiCopy, FiRotateCcw, FiArrowRight, FiZap, FiChevronDown } from 'react-icons/fi'
import { useRouter } from 'next/router'

interface Message {
  role: 'user' | 'assistant'
  content: string
  ideas?: string[]
  timestamp: string
  truncated?: boolean
}

type Theme = 'dark' | 'light' | 'red'

const THEMES = [
  { key: 'dark' as Theme, icon: '🌙' },
  { key: 'light' as Theme, icon: '☀️' },
  { key: 'red' as Theme, icon: '🔴' },
]

// Theme CSS values
const T = {
  dark: {
    page: 'bg-[#0a0a14]',
    header: 'bg-[#0a0a14]/98 border-white/8',
    messages: 'bg-[#0a0a14]',
    bubbleAI: 'bg-[#131320] border border-white/10 text-white/90',
    bubbleUser: 'bg-[#0070f3] text-white',
    avatarAI: 'bg-gradient-to-br from-cyan/30 to-magenta/30 border border-cyan/20 text-cyan',
    avatarUser: 'bg-[#0070f3] text-white',
    input: 'bg-[#131320] border-white/10 text-white placeholder-white/25',
    inputWrap: 'bg-[#0f0f1e] border-white/10',
    footer: 'bg-[#0a0a14]/98 border-white/8',
    text: 'text-white',
    muted: 'text-white/35',
    border: 'border-white/8',
    accent: 'text-cyan',
    sendBtn: 'bg-[#0070f3] hover:bg-[#0060df] text-white',
    ideaCard: 'bg-[#131320] border-white/10 text-white/80 hover:border-white/20',
    themeBtn: 'bg-white/10',
    starter: 'bg-[#131320] border-white/8 text-white/50 hover:text-white/80 hover:border-white/20 hover:bg-white/5',
    scrollbar: 'dark',
  },
  light: {
    page: 'bg-[#f7f7f8]',
    header: 'bg-white/98 border-gray-200',
    messages: 'bg-[#f7f7f8]',
    bubbleAI: 'bg-white border border-gray-200 text-gray-800',
    bubbleUser: 'bg-[#0070f3] text-white',
    avatarAI: 'bg-blue-100 border border-blue-200 text-blue-600',
    avatarUser: 'bg-[#0070f3] text-white',
    input: 'bg-white border-gray-300 text-gray-800 placeholder-gray-400',
    inputWrap: 'bg-white border-gray-200',
    footer: 'bg-white/98 border-gray-200',
    text: 'text-gray-900',
    muted: 'text-gray-400',
    border: 'border-gray-200',
    accent: 'text-blue-600',
    sendBtn: 'bg-[#0070f3] hover:bg-[#0060df] text-white',
    ideaCard: 'bg-blue-50 border-blue-200 text-gray-700 hover:border-blue-300',
    themeBtn: 'bg-gray-100',
    starter: 'bg-white border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50',
    scrollbar: 'light',
  },
  red: {
    page: 'bg-[#0d0000]',
    header: 'bg-[#0d0000]/98 border-red-900/20',
    messages: 'bg-[#0d0000]',
    bubbleAI: 'bg-[#1a0505] border border-red-900/30 text-white/90',
    bubbleUser: 'bg-red-700 text-white',
    avatarAI: 'bg-red-900/40 border border-red-700/40 text-red-400',
    avatarUser: 'bg-red-700 text-white',
    input: 'bg-[#1a0505] border-red-900/30 text-white placeholder-red-300/25',
    inputWrap: 'bg-[#120000] border-red-900/25',
    footer: 'bg-[#0d0000]/98 border-red-900/20',
    text: 'text-white',
    muted: 'text-red-300/35',
    border: 'border-red-900/20',
    accent: 'text-red-400',
    sendBtn: 'bg-red-700 hover:bg-red-600 text-white',
    ideaCard: 'bg-[#1a0505] border-red-900/30 text-white/80 hover:border-red-700/50',
    themeBtn: 'bg-red-900/30',
    starter: 'bg-[#1a0505] border-red-900/20 text-red-300/40 hover:text-red-300/70 hover:border-red-900/40',
    scrollbar: 'dark',
  },
}

const STARTERS = [
  { icon: '🔥', text: 'Give me 5 viral video ideas with full titles and hooks' },
  { icon: '📅', text: 'Create a complete 30-day content calendar for my channel' },
  { icon: '📈', text: "What's trending on YouTube right now in tech/finance?" },
  { icon: '🪝', text: 'Write 10 powerful video hooks that stop the scroll' },
  { icon: '🎯', text: 'What type of videos grow channels fastest in 2026?' },
  { icon: '📝', text: 'Give me 20 YouTube title formulas that get clicks' },
]

const STORAGE_KEY = 'srankiq_inspiration_v2'
const THEME_KEY = 'srankiq_theme_v2'

const DEFAULT_MESSAGE: Message = {
  role: 'assistant',
  content: `Hey! I'm SRankIQ AI — your personal YouTube growth strategist. I give complete, detailed, specific advice — not surface-level tips. Ask me anything about growing your channel, and I'll give you a thorough answer with real examples and actionable steps. What do you need? 🎬`,
  timestamp: '',
  ideas: [],
}

function InspirationPage() {
  const { activePlatform } = usePlatform()
  const router = useRouter()
  const autoSentRef = useRef(false)
  const [theme, setTheme] = useState<Theme>('dark')
  const s = T[theme]

  const [messages, setMessages] = useState<Message[]>([{ ...DEFAULT_MESSAGE, timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const messagesRef = useRef<HTMLDivElement>(null)

  // Load from localStorage
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(THEME_KEY) as Theme
      if (savedTheme && T[savedTheme]) setTheme(savedTheme)
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed)
      }
    } catch { }
  }, [])

  // Save to localStorage
  useEffect(() => {
    try {
      if (messages.length > 1) localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30)))
    } catch { }
  }, [messages])

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Auto-send from URL
  useEffect(() => {
    const msg = router.query.msg as string
    if (msg && !autoSentRef.current) {
      autoSentRef.current = true
      setTimeout(() => send(decodeURIComponent(msg)), 500)
    }
  }, [router.query.msg])

  const switchTheme = (t: Theme) => {
    setTheme(t)
    try { localStorage.setItem(THEME_KEY, t) } catch { }
  }

  const send = useCallback(async (text?: string) => {
    const msg = (text || input).trim()
    if (!msg || loading) return
    setInput('')

    const ts = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    const userMsg: Message = { role: 'user', content: msg, timestamp: ts }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }))
      const res = await axios.post('/api/ai/inspiration', {
        message: msg,
        history,
        platform: activePlatform === 'yt' ? 'YouTube' : activePlatform,
      })

      const reply = res.data.reply || 'Sorry, something went wrong!'
      const truncated = reply.includes('[Response was very long')
      const cleanReply = reply.replace('[Response was very long. Type "continue" to get the rest.]', '').trim()

      const aiMsg: Message = {
        role: 'assistant',
        content: cleanReply,
        ideas: res.data.ideas || [],
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        truncated,
      }
      setMessages(prev => [...prev, aiMsg])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Connection error. Please try again!',
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [input, loading, messages, activePlatform])

  const continueLast = () => send('continue from where you left off and complete the full response')

  const copy = (text: string) => { navigator.clipboard.writeText(text); toast.success('Copied!') }
  const useInAITools = (idea: string) => router.push(`/ai-tools?topic=${encodeURIComponent(idea)}`)

  const clearChat = () => {
    autoSentRef.current = false
    const fresh = [{ ...DEFAULT_MESSAGE, timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) }]
    setMessages(fresh)
    try { localStorage.removeItem(STORAGE_KEY) } catch { }
  }

  return (
    <DashboardLayout title="Get Inspiration">
      <div className={`flex flex-col h-full ${s.page}`}>

        {/* ── Header ── */}
        <div className={`flex items-center justify-between px-5 py-3 border-b ${s.header} flex-shrink-0 backdrop-blur-md sticky top-0 z-10`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold flex-shrink-0 ${s.avatarAI}`}>
              ✦
            </div>
            <div>
              <div className={`font-bold text-sm ${s.text}`}>SRankIQ AI</div>
              <div className={`text-[10px] ${s.muted} flex items-center gap-1.5`}>
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse" />
                YouTube Growth Strategist · Always online
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-0.5 p-1 rounded-lg border ${s.border}`}
              style={{ background: theme === 'light' ? '#f3f4f6' : 'rgba(255,255,255,0.04)' }}>
              {THEMES.map(th => (
                <button key={th.key} onClick={() => switchTheme(th.key)} title={th.key}
                  className={`w-7 h-7 rounded-md text-sm transition-all flex items-center justify-center
                    ${theme === th.key ? s.themeBtn : 'opacity-40 hover:opacity-80'}`}>
                  {th.icon}
                </button>
              ))}
            </div>
            <button onClick={clearChat}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border ${s.border} ${s.muted} transition-opacity hover:opacity-80`}
              style={{ background: theme === 'light' ? '#f9fafb' : 'rgba(255,255,255,0.04)' }}>
              <FiRotateCcw size={11} /> New Chat
            </button>
          </div>
        </div>

        {/* ── Messages ── */}
        <div ref={messagesRef} className={`flex-1 overflow-y-auto ${s.messages}`}>
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

            {/* Starter prompts */}
            {messages.length === 1 && !loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-2">
                {STARTERS.map((st, i) => (
                  <motion.button key={i}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => send(st.text)}
                    className={`text-left p-3 rounded-xl border text-xs leading-relaxed transition-all hover:scale-[1.01] ${s.starter}`}>
                    <div className="text-base mb-1.5">{st.icon}</div>
                    {st.text}
                  </motion.button>
                ))}
              </motion.div>
            )}

            {/* Messages */}
            {messages.map((msg, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>

                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold self-end
                  ${msg.role === 'assistant' ? s.avatarAI : s.avatarUser}`}>
                  {msg.role === 'assistant' ? '✦' : 'U'}
                </div>

                <div className={`flex flex-col gap-1.5 ${msg.role === 'user' ? 'items-end max-w-[75%]' : 'items-start max-w-[85%]'}`}>

                  {/* Sender + time */}
                  <div className={`text-[10px] ${s.muted} px-1`}>
                    {msg.role === 'assistant' ? 'SRankIQ AI' : 'You'}
                    {msg.timestamp && ` · ${msg.timestamp}`}
                  </div>

                  {/* Bubble */}
                  <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words
                    ${msg.role === 'user' ? 'rounded-tr-sm' : 'rounded-tl-sm shadow-sm'}
                    ${msg.role === 'assistant' ? s.bubbleAI : s.bubbleUser}`}>
                    {msg.content}
                  </div>

                  {/* Truncated notice */}
                  {msg.truncated && (
                    <button onClick={continueLast}
                      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border ${s.border} ${s.accent} hover:opacity-80 transition-opacity`}
                      style={{ background: theme === 'light' ? '#f0f7ff' : 'rgba(0,112,243,0.1)' }}>
                      <FiChevronDown size={12} /> Continue response
                    </button>
                  )}

                  {/* Idea chips */}
                  {msg.ideas && msg.ideas.length > 0 && (
                    <div className="space-y-1.5 w-full">
                      {msg.ideas.map((idea, j) => (
                        <div key={j} className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs transition-all group cursor-default ${s.ideaCard}`}>
                          <span className={`font-bold text-[10px] w-5 flex-shrink-0 ${s.accent}`}>{j + 1}.</span>
                          <span className="flex-1">{idea}</span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => copy(idea)} title="Copy"
                              className={`w-6 h-6 rounded flex items-center justify-center ${s.muted} hover:opacity-80`}>
                              <FiCopy size={10} />
                            </button>
                            <button onClick={() => useInAITools(idea)} title="Use in AI Tools"
                              className={`w-6 h-6 rounded flex items-center justify-center ${s.muted} hover:opacity-80`}>
                              <FiArrowRight size={10} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Copy button on AI messages */}
                  {msg.role === 'assistant' && i > 0 && (
                    <button onClick={() => copy(msg.content)}
                      className={`flex items-center gap-1 text-[10px] ${s.muted} hover:opacity-80 transition-opacity px-1`}>
                      <FiCopy size={9} /> Copy response
                    </button>
                  )}
                </div>
              </motion.div>
            ))}

            {/* Loading animation */}
            {loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-bold ${s.avatarAI}`}>✦</div>
                <div className={`px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm ${s.bubbleAI}`}>
                  <div className="flex items-center gap-1.5">
                    {[0, 0.15, 0.3].map((d, i) => (
                      <motion.div key={i}
                        animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
                        transition={{ repeat: Infinity, duration: 1, delay: d }}
                        className={`w-2 h-2 rounded-full ${theme === 'red' ? 'bg-red-500' : theme === 'light' ? 'bg-blue-400' : 'bg-cyan-400'}`} />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={bottomRef} className="h-1" />
          </div>
        </div>

        {/* ── Input area ── */}
        <div className={`border-t ${s.footer} flex-shrink-0 backdrop-blur-md`}>
          <div className="max-w-3xl mx-auto px-4 py-3">
            <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${s.inputWrap} shadow-sm`}>
              <input ref={inputRef}
                className={`flex-1 bg-transparent outline-none text-sm ${s.input} border-0`}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                placeholder="Ask anything — video ideas, 30-day plans, titles, hooks, growth strategies..."
                disabled={loading} />
              <button onClick={() => send()} disabled={!input.trim() || loading}
                className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-30 ${s.sendBtn}`}>
                {loading
                  ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                  : <FiSend size={14} />}
              </button>
            </div>
            <div className={`flex items-center justify-between mt-1.5 px-1`}>
              <p className={`text-[10px] ${s.muted}`}>Enter to send · ↗ on any idea to use in AI Tools</p>
              <p className={`text-[10px] ${s.muted}`}>{messages.length - 1} messages</p>
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  )
}

export default withAuth(InspirationPage)
