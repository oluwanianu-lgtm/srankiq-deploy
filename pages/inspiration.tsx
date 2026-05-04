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
  timestamp: Date
}

const STARTERS = [
  "Give me 5 viral video ideas for my channel",
  "What's trending in tech YouTube right now?",
  "Help me come up with a hook for a finance video",
  "What type of videos get the most subscribers?",
  "Give me a content calendar for next week",
  "How do I make my titles more clickable?",
]

function InspirationPage() {
  const { activePlatform } = usePlatform()
  const router = useRouter()
  const autoSentRef = useRef(false)

  const [messages, setMessages] = useState<Message[]>([{
    role: 'assistant',
    content: `Hey! I'm your AI content inspiration assistant. Tell me about your channel or niche and I'll help you brainstorm viral video ideas, hooks, titles, and content strategies. What are you working on? 🎬`,
    timestamp: new Date(),
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-send message from trends "Use idea" button
  useEffect(() => {
    const msg = router.query.msg as string
    if (msg && !autoSentRef.current) {
      autoSentRef.current = true
      const decoded = decodeURIComponent(msg)
      // Small delay to let page mount
      setTimeout(() => send(decoded), 400)
    }
  }, [router.query.msg])

  const send = async (text?: string) => {
    const msg = (text || input).trim()
    if (!msg || loading) return
    setInput('')

    const userMsg: Message = { role: 'user', content: msg, timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }))
      const res = await axios.post('/api/ai/inspiration', {
        message: msg,
        history,
        platform: activePlatform === 'yt' ? 'YouTube' : activePlatform,
      })
      const assistantMsg: Message = {
        role: 'assistant',
        content: res.data.reply,
        ideas: res.data.ideas,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I had trouble generating a response. Please try again.',
        timestamp: new Date(),
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const copyText = (text: string) => { navigator.clipboard.writeText(text); toast.success('Copied!') }

  const useInAITools = (idea: string) => router.push(`/ai-tools?topic=${encodeURIComponent(idea)}`)

  const clearChat = () => {
    autoSentRef.current = false
    setMessages([{
      role: 'assistant',
      content: `Hey! I'm your AI content inspiration assistant. Tell me about your channel or niche and I'll help you brainstorm viral video ideas, hooks, titles, and content strategies. What are you working on? 🎬`,
      timestamp: new Date(),
    }])
  }

  return (
    <DashboardLayout title="Get Inspiration">
      <div className="flex flex-col h-full">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 flex-shrink-0">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              💡 Get Inspiration
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-lime/20 text-lime font-bold uppercase tracking-wider">AI Chat</span>
            </h1>
            <p className="text-muted text-sm">Chat with AI to brainstorm video ideas, hooks, and content strategies</p>
          </div>
          <button onClick={clearChat} className="btn btn-ghost btn-sm gap-1.5 text-muted hover:text-white">
            <FiRotateCcw size={13} /> New Chat
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* Starter prompts */}
          {messages.length === 1 && !loading && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-6">
              {STARTERS.map((s, i) => (
                <motion.button key={i}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => send(s)}
                  className="text-left p-3 rounded-xl bg-surf2 border border-white/5
                            hover:border-cyan/20 hover:bg-cyan/5 transition-all text-xs
                            text-muted hover:text-white leading-relaxed">
                  <FiZap size={11} className="text-cyan mb-1.5" />
                  {s}
                </motion.button>
              ))}
            </div>
          )}

          {messages.map((msg, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>

              <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm
                             ${msg.role === 'assistant'
                               ? 'bg-gradient-to-br from-cyan/30 to-magenta/30 border border-cyan/20 text-cyan'
                               : 'bg-gradient-to-br from-white/10 to-white/5 border border-white/10 text-white'}`}>
                {msg.role === 'assistant' ? '✦' : <span className="text-xs font-bold">U</span>}
              </div>

              <div className={`flex-1 max-w-[80%] flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
                               ${msg.role === 'user'
                                 ? 'bg-cyan/10 border border-cyan/20 text-white rounded-tr-sm'
                                 : 'bg-surf2 border border-white/5 text-white/90 rounded-tl-sm'}`}>
                  {msg.content}
                </div>

                {msg.ideas && msg.ideas.length > 0 && (
                  <div className="space-y-2 w-full">
                    {msg.ideas.map((idea, j) => (
                      <div key={j} className="flex items-center gap-2 p-2.5 bg-surf3 rounded-xl
                                border border-white/5 hover:border-white/10 transition-all group">
                        <span className="text-xs font-bold text-cyan flex-shrink-0 w-5">{j + 1}.</span>
                        <span className="text-xs text-white/80 flex-1">{idea}</span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => copyText(idea)}
                            className="w-6 h-6 rounded hover:bg-white/10 flex items-center justify-center text-muted hover:text-white">
                            <FiCopy size={10} />
                          </button>
                          <button onClick={() => useInAITools(idea)}
                            className="w-6 h-6 rounded hover:bg-cyan/20 flex items-center justify-center text-muted hover:text-cyan"
                            title="Use in AI Tools">
                            <FiArrowRight size={10} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {msg.role === 'assistant' && i > 0 && (
                  <button onClick={() => copyText(msg.content)}
                    className="flex items-center gap-1 text-[10px] text-muted hover:text-white transition-colors">
                    <FiCopy size={10} /> Copy
                  </button>
                )}
              </div>
            </motion.div>
          ))}

          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan/30 to-magenta/30
                            border border-cyan/20 flex items-center justify-center text-cyan flex-shrink-0">✦</div>
              <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-surf2 border border-white/5">
                <div className="loading-dots flex gap-1"><span /><span /><span /></div>
              </div>
            </motion.div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-6 py-4 border-t border-white/5 flex-shrink-0">
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <input ref={inputRef} className="inp pr-12 py-3" value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                placeholder="Ask for video ideas, hooks, titles, content strategies..."
                disabled={loading} />
              <button onClick={() => send()} disabled={!input.trim() || loading}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg
                          bg-cyan/20 hover:bg-cyan/30 flex items-center justify-center
                          text-cyan transition-all disabled:opacity-30">
                {loading ? <Spinner size={12} /> : <FiSend size={12} />}
              </button>
            </div>
          </div>
          <p className="text-[10px] text-muted mt-2 text-center">
            Press Enter to send · Click ↗ on any idea to open in AI Tools
          </p>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default withAuth(InspirationPage)
