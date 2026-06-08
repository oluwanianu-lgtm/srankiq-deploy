// pages/login.tsx
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { FiMail, FiLock, FiEye, FiEyeOff, FiAlertCircle } from 'react-icons/fi'
import { Spinner } from '../components/ui'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const { login, loginWithGoogle, user, loading } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard')
  }, [user, loading, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email, password)
      router.replace('/dashboard')
    } catch (err: any) {
      const msg = err.code === 'auth/invalid-credential' ? 'Invalid email or password. Please try again.'
        : err.code === 'auth/user-not-found' ? 'No account found with this email.'
        : err.code === 'auth/wrong-password' ? 'Incorrect password.'
        : err.message || 'Login failed'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleGoogle = async () => {
    try {
      await loginWithGoogle()
      router.replace('/dashboard')
    } catch (err: any) {
      toast.error(err.message || 'Google sign-in failed')
    }
  }

  if (loading) return null

  return (
    <div className="min-h-screen bg-bg flex">
      {/* Left — features */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden items-center justify-center p-12 bg-surf">
        <div className="orb w-80 h-80 -top-20 -left-20"
          style={{ background: 'radial-gradient(circle, rgba(0,245,255,0.15), transparent 70%)' }} />
        <div className="orb w-60 h-60 bottom-0 right-0"
          style={{ background: 'radial-gradient(circle, rgba(255,0,144,0.12), transparent 70%)' }} />
        <div className="relative z-10 max-w-md">
          <h2 className="font-display text-5xl leading-tight mb-5">
            THE ONLY TOOL THAT <span className="grad-text">RANKS YOU</span> ON EVERY PLATFORM
          </h2>
          <p className="text-white/50 mb-10 leading-relaxed">
            7 platforms. AI-generated content. Real-time SEO scanning. Live keyword ranking percentages.
          </p>
          <div className="space-y-3">
            {['Real YouTube subscriber & view counts', 'AI title & description generator',
              'SEO scan before every upload', 'Competitor tracking & analysis'].map(f => (
              <div key={f} className="flex items-center gap-3 text-sm text-white/70">
                <div className="w-5 h-5 rounded-full bg-cyan/20 border border-cyan/30
                              flex items-center justify-center text-cyan text-xs flex-shrink-0">✓</div>
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 lg:max-w-md flex items-center justify-center p-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm">

          {/* Logo */}
          <Link href="/">
            <div className="flex items-center gap-2 mb-10 cursor-pointer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/logo-icon-cyan.png" alt="SRankIQ" width={40} height={40}
                style={{ width: 40, height: 40, objectFit: 'contain' }} />
              <span className="font-display text-2xl"><span className="text-cyan">S</span>RankIQ</span>
            </div>
          </Link>

          <h1 className="font-display text-4xl mb-1">WELCOME BACK</h1>
          <p className="text-muted text-sm mb-8">Log in to your SRankIQ dashboard and keep growing.</p>

          {/* Google */}
          <button onClick={handleGoogle}
            className="w-full btn btn-ghost mb-4 gap-3 justify-center">
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.7 2.5 30.2 0 24 0 14.7 0 6.7 5.4 2.7 13.3l7.8 6C12.4 13 17.8 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17z"/>
              <path fill="#FBBC05" d="M10.5 28.7A14.6 14.6 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7L2.5 13.3A23.8 23.8 0 0 0 0 24c0 3.8.9 7.4 2.5 10.7l8-6z"/>
              <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2 1.4-4.6 2.2-7.7 2.2-6.2 0-11.5-4.2-13.4-9.9l-7.9 6.1C6.6 42.5 14.7 48 24 48z"/>
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-muted">or continue with email</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red/10 border border-red/20 text-red text-sm mb-4">
              <FiAlertCircle size={14} className="flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="label">Email Address</label>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={15} />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="inp pl-10" placeholder="you@example.com" autoComplete="email" required />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Password</label>
                <Link href="/forgot-password">
                  <span className="text-xs text-cyan cursor-pointer hover:underline">Forgot password?</span>
                </Link>
              </div>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={15} />
                <input type={showPass ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="inp pl-10 pr-10" placeholder="••••••••" autoComplete="current-password" required />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white">
                  {showPass ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={submitting} className="btn btn-cyan w-full justify-center gap-2">
              {submitting ? <Spinner size={16} /> : null}
              {submitting ? 'Logging in...' : 'Log In to Dashboard →'}
            </button>
          </form>

          <p className="text-center text-sm text-muted mt-6">
            Don't have an account?{' '}
            <Link href="/signup"><span className="text-cyan font-semibold cursor-pointer hover:underline">Sign up free</span></Link>
          </p>
          <p className="text-center text-xs text-muted/60 mt-4">
            By continuing you agree to our Terms of Service and Privacy Policy
          </p>
        </motion.div>
      </div>
    </div>
  )
}
