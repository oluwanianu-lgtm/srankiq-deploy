// pages/inspiration.tsx
import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import DashboardLayout from '../components/layout/DashboardLayout'
import { withAuth } from '../lib/withAuth'
import { usePlatform } from '../contexts/PlatformContext'
import { Spinner } from '../components/ui'
import axios from 'axios'
import toast from 'react-hot-toast'
import { FiSend, FiCopy, FiZap, FiRotateCcw, FiArrowRight } from 'react-icons/fi'
import { useRouter } from 'next/router'

interface Message {
  role: 'user' | 'assistant'
  content: string
  ideas?: string[]
  timestamp: string
}

type Theme = 'dark' | 'light' | 'red'

const THEME_STYLES: Record<Theme, Record<string, string>> = {
  dark: {
    bg: '',
    bubbleAI: 'bg-[#1a1a2e] border border-white/10 text-white/90',
    bubbleUser: 'bg-cyan/15 border border-cyan/30 text-white',
    input: 'bg-[#1a1a2e] border-white/10 text-white placeholder-white/30',
    text: 'text-white',
    muted: 'text-white/40',
    border: 'border-white/5',
    accent: 'text-cyan',
    sendBtn: 'bg-cyan/20 hover:bg-cyan/30 text-cyan border-cyan/30',
    ideaCard: 'bg-[#12121f] border-white/8 text-white/80 hover:border-white/20',
    header: 'bg-[#0a0a14]/95',
    inputArea: 'bg-[#0a0a14]/95',
    inputWrap: 'bg-[#1a1a2e] border-white/10',
  },
  light: {
    bg: 'bg-gray-50',
    bubbleAI: 'bg-white border border-gray-200 text-gray-800',
    bubbleUser: 'bg-blue-600 border border-blue-700 text-white',
    input: 'bg-white border-gray-300 text-gray-800 placeholder-gray-400',
    text: 'text-gray-800',
    muted: 'text-gray-400',
    border: 'border-gray-200',
    accent: 'text-blue-600',
    sendBtn: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-700',
    ideaCard: 'bg-blue-50 border-blue-200 text-gray-700 hover:border-blue-400',
    header: 'bg-white/95',
    inputArea: 'bg-white/95',
    inputWrap: 'bg-white border-gray-200',
  },
  red: {
    bg: 'bg-[#0d0000]',
    bubbleAI: 'bg-[#1a0505] border border-red-900/30 text-white/90',
    bubbleUser: 'bg-red-700/30 border border-red-600/40 text-white',
    input: 'bg-[#1a0505] border-red-900/30 text-white placeholder-red-300/30',
    text: 'text-white',
    muted: 'text-red-300/40',
    border: 'border-red-900/20',
    accent: 'text-red-400',
    sendBtn: 'bg-red-700 hover:bg-red-600 text-white border-red-600',
    ideaCard: 'bg-red-900/20 border-red-800/30 text-white/80 hover:border-red-600/50',
    header: 'bg-[#0d0000]/95',
    inputArea: 'bg-[#0d0000]/95',
    inputWrap: 'bg-[#1a0505] border-red-900/30',
  },
}

const THEMES = [
  { key: 'dark' as Theme, icon: '🌙', label: 'Dark' },
  { key: 'light' as Theme, icon: '☀️', label: 'Light' },
  { key: 'red' as Theme, icon: '🔴', label: 'Crimson' },
]

const STARTERS = [
  { icon: '🔥', text: 'Give me 5 viral video ideas for my channel' },
  { icon: '📈', text: "What's trending in my niche right now?" },
  { icon: '🪝', text: 'Help me write a powerful hook for my next video' },
  { icon: '🎯', text: 'What type of videos get the most subscribers?' },
  { icon: '📅', text: 'Give me a content calendar for next 30 days' },
  { icon: '📝', text: 'How do I write titles that get more clicks?' },
]

const STORAGE_KEY = 'srankiq_chat_history'
const THEME_KEY = 'srankiq_theme'

function InspirationPage() {
  const { activePlatform } = usePlatform()
  const router = useRouter()
  const autoSentRef = useRef(false)
  const [theme, setTheme] = useState<Theme>('dark')
  const t = THEME_STYLES[theme]

  const defaultMsg: Message = {
    role: 'assistant',
    content: `Hey! I'm SRankIQ's AI content strategist. I give specific, detailed advice to help you build a viral YouTube channel — video ideas, hooks, titles, thumbnails, content calendars, growth strategies. What do you need help with? 🎬`,
    timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
  }

  const [messages, setMessages] = useState<Message[]>([defaultMsg])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load saved chat + theme from localStorage on mount
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(THEME_KEY) as Theme
      if (savedTheme && THEME_STYLES[savedTheme]) setTheme(savedTheme)

      const savedChat = localStorage.getItem(STORAGE_KEY)
      if (savedChat) {
        const parsed = JSON.parse(savedChat)
        if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed)
      }
    } catch { /* ignore */ }
  }, [])

  // Save chat to localStorage whenever messages change
  useEffect(() => {
    try {
      if (messages.length > 1) localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
    } catch { /* ignore */ }
  }, [messages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Auto-send from URL query (clone redirect etc)
  useEffect(() => {
    const msg = router.query.msg as string
    if (msg && !autoSentRef.current) {
      autoSentRef.current = true
      const decoded = decodeURIComponent(msg)
      setTimeout(() => send(decoded), 600)
    }
  }, [router.query.msg])

  const switchTheme = (th: Theme) => {
    setTheme(th)
    try { localStorage.setItem(THEME_KEY, th) } catch { /* ignore */ }
  }

  const send = async (text?: string) => {
    const msg = (text || input).trim()
    if (!msg || loading) return
    setInput('')

    const userMsg: Message = {
      role: 'user',
      content: msg,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }))
      const res = await axios.post('/api/ai/inspiration', {
        message: msg,
        history,
        platform: activePlatform === 'yt' ? 'YouTube' : activePlatform,
      })

      const reply = res.data.reply || 'Sorry, something went wrong. Please try again!'
      const assistantMsg: Message = {
        role: 'assistant',
        content: reply,
        ideas: res.data.ideas || [],
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Connection error. Please try again!',
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const copy = (text: string) => { navigator.clipboard.writeText(text); toast.success('Copied!') }
  const useInAITools = (idea: string) => router.push(`/ai-tools?topic=${encodeURIComponent(idea)}`)

  const clearChat = () => {
    autoSentRef.current = false
    const fresh = [defaultMsg]
    setMessages(fresh)
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
  }

  return (
    <DashboardLayout title="Get Inspiration">
      <div className={`flex flex-col h-full ${t.bg}`}>

        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-3 border-b ${t.border} flex-shrink-0 backdrop-blur-sm ${t.header}`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0
              ${theme === 'red' ? 'bg-red-900/40 border border-red-700/40' : theme === 'light' ? 'bg-blue-100 border border-blue-200' : 'bg-gradient-to-br from-cyan/20 to-magenta/20 border border-cyan/20'}`}>
              ✦
            </div>
            <div>
              <div className={`font-bold text-sm ${t.text}`}>SRankIQ AI</div>
              <div className={`text-[10px] ${t.muted} flex items-center gap-1`}>
                <span className="w-1.5 h-1.5 rounded-full bg-green inline-block animate-pulse" />
                Content Strategy Assistant
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Theme switcher */}
            <div className={`flex items-center gap-1 p-1 rounded-lg border ${t.border}`}
              style={{ background: theme === 'light' ? '#f3f4f6' : 'rgba(255,255,255,0.05)' }}>
              {THEMES.map(th => (
                <button key={th.key} onClick={() => switchTheme(th.key)} title={th.label}
                  className={`w-7 h-7 rounded-md text-sm transition-all flex items-center justify-center
                    ${theme === th.key ? (theme === 'light' ? 'bg-white shadow' : 'bg-white/15') : 'hover:bg-white/10 opacity-50 hover:opacity-100'}`}>
                  {th.icon}
                </button>
              ))}
            </div>
            <button onClick={clearChat}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border ${t.border} ${t.muted} hover:opacity-80 transition-opacity`}
              style={{ background: theme === 'light' ? '#f9fafb' : 'rgba(255,255,255,0.04)' }}>
              <FiRotateCcw size={12} /> New Chat
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5 max-w-3xl mx-auto w-full">

          {/* Starters — only on fresh chat */}
          {messages.length === 1 && !loading && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-2">
              {STARTERS.map((s, i) => (
                <motion.button key={i}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => send(s.text)}
                  className={`text-left p-3 rounded-xl border text-xs leading-relaxed transition-all hover:scale-[1.01] ${t.ideaCard}`}>
                  <div className="text-base mb-1">{s.icon}</div>
                  {s.text}
                </motion.button>
              ))}
            </div>
          )}

          {messages.map((msg, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>

              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold self-end
                ${msg.role === 'assistant'
                  ? theme === 'red' ? 'bg-red-900/40 border border-red-700/40 text-red-400'
                    : theme === 'light' ? 'bg-blue-100 border border-blue-200 text-blue-600'
                    : 'bg-gradient-to-br from-cyan/30 to-magenta/30 border border-cyan/20 text-cyan'
                  : theme === 'light' ? 'bg-blue-600 text-white'
                  : 'bg-white/10 border border-white/15 text-white'}`}>
                {msg.role === 'assistant' ? '✦' : 'U'}
              </div>

              <div className={`flex flex-col gap-1 max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`text-[10px] ${t.muted} px-1`}>
                  {msg.role === 'assistant' ? 'SRankIQ AI' : 'You'} · {msg.timestamp}
                </div>

                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words
                  ${msg.role === 'user' ? 'rounded-tr-sm' : 'rounded-tl-sm'} ${msg.role === 'assistant' ? t.bubbleAI : t.bubbleUser}`}>
                  {msg.content}
                </div>

                {/* Idea chips */}
                {msg.ideas && msg.ideas.length > 0 && (
                  <div className="space-y-1.5 w-full mt-1">
                    {msg.ideas.map((idea, j) => (
                      <div key={j} className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs transition-all group cursor-default ${t.ideaCard}`}>
                        <span className={`font-bold text-[10px] flex-shrink-0 ${t.accent}`}>{j + 1}.</span>
                        <span className="flex-1">{idea}</span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => copy(idea)} title="Copy"
                            className={`w-6 h-6 rounded-lg flex items-center justify-center ${t.muted} hover:opacity-80`}>
                            <FiCopy size={10} />
                          </button>
                          <button onClick={() => useInAITools(idea)} title="Use in AI Tools"
                            className={`w-6 h-6 rounded-lg flex items-center justify-center ${t.muted} hover:${t.accent}`}>
                            <FiArrowRight size={10} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {msg.role === 'assistant' && i > 0 && (
                  <button onClick={() => copy(msg.content)}
                    className={`flex items-center gap-1 text-[10px] ${t.muted} hover:opacity-80 transition-opacity px-1`}>
                    <FiCopy size={9} /> Copy
                  </button>
                )}
              </div>
            </motion.div>
          ))}

          {/* Loading */}
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
              <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center
                ${theme === 'red' ? 'bg-red-900/40 border border-red-700/40 text-red-400'
                  : theme === 'light' ? 'bg-blue-100 border border-blue-200 text-blue-600'
                  : 'bg-gradient-to-br from-cyan/30 to-magenta/30 border border-cyan/20 text-cyan'}`}>
                ✦
              </div>
              <div className={`px-4 py-3 rounded-2xl rounded-tl-sm text-sm ${t.bubbleAI}`}>
                <div className="flex items-center gap-1.5">
                  {[0, 0.2, 0.4].map((d, i) => (
                    <motion.span key={i}
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ repeat: Infinity, duration: 1.2, delay: d }}
                      className={`w-2 h-2 rounded-full ${theme === 'red' ? 'bg-red-500' : theme === 'light' ? 'bg-blue-400' : 'bg-cyan'}`} />
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className={`px-4 pb-5 pt-3 border-t ${t.border} flex-shrink-0 max-w-3xl mx-auto w-full ${t.inputArea} backdrop-blur-sm`}>
          <div className={`flex items-center gap-3 p-3 rounded-2xl border ${t.inputWrap}`}>
            <input ref={inputRef}
              className={`flex-1 bg-transparent outline-none text-sm ${t.text}`}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              placeholder="Ask about video ideas, content strategy, titles, hooks..."
              disabled={loading} />
            <button onClick={() => send()} disabled={!input.trim() || loading}
              className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-30 border ${t.sendBtn}`}>
              {loading ? <Spinner size={14} /> : <FiSend size={14} />}
            </button>
          </div>
          <p className={`text-[10px] ${t.muted} text-center mt-2`}>
            Press Enter to send · ↗ to use any idea in AI Tools
          </p>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default withAuth(InspirationPage)
