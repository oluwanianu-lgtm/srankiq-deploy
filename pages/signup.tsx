// pages/signup.tsx
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { FiMail, FiLock, FiUser, FiEye, FiEyeOff, FiAlertCircle, FiCheck } from 'react-icons/fi'
import { Spinner } from '../components/ui'

export default function SignupPage() {
  const { signup, loginWithGoogle, user, loading } = useAuth()
  const router = useRouter()
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirm: '' })
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard')
  }, [user, loading, router])

  const passStrength = (p: string) => {
    let s = 0
    if (p.length >= 8) s++; if (p.length >= 12) s++
    if (/[A-Z]/.test(p)) s++; if (/[0-9]/.test(p)) s++; if (/[^A-Za-z0-9]/.test(p)) s++
    return s
  }
  const strength = passStrength(form.password)
  const strengthColors = ['', '#ff3366', '#ff3366', '#ffc740', '#00f5ff', '#00ff88']
  const strengthLabels = ['', 'Weak', 'Weak', 'Fair', 'Good', 'Strong']

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) { setError('Passwords do not match'); return }
    setSubmitting(true)
    try {
      await signup(form.email, form.password, form.firstName, form.lastName)
      setDone(true)
    } catch (err: any) {
      const msg = err.code === 'auth/email-already-in-use'
        ? 'An account with this email already exists. Please log in.'
        : err.code === 'auth/weak-password' ? 'Password must be at least 8 characters.'
        : err.message || 'Signup failed'
      setError(msg)
    } finally { setSubmitting(false) }
  }

  const handleGoogle = async () => {
    try {
      await loginWithGoogle()
      router.replace('/dashboard')
    } catch (err: any) { setError(err.message) }
  }

  if (loading) return null

  // Email sent confirmation
  if (done) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-8">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="card max-w-md w-full text-center p-10">
          <div className="text-6xl mb-5">📧</div>
          <h2 className="font-display text-4xl mb-3">CHECK YOUR EMAIL</h2>
          <p className="text-muted text-sm mb-3">
            We sent a verification link to <strong className="text-cyan">{form.email}</strong>
          </p>
          <p className="text-muted text-xs mb-8">
            Click the link in the email to verify your account, then come back and log in.
          </p>
          <Link href="/login">
            <button className="btn btn-cyan w-full justify-center">Go to Login →</button>
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm">

        <Link href="/">
          <div className="flex items-center gap-2 mb-8 cursor-pointer">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan to-magenta
                          flex items-center justify-center font-display text-black text-xl">S</div>
            <span className="font-display text-2xl"><span className="text-cyan">S</span>RankIQ</span>
          </div>
        </Link>

        <h1 className="font-display text-4xl mb-1">CREATE ACCOUNT</h1>
        <p className="text-muted text-sm mb-6">Start free. No credit card required.</p>

        <button onClick={handleGoogle} className="w-full btn btn-ghost mb-4 gap-3 justify-center">
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.7 2.5 30.2 0 24 0 14.7 0 6.7 5.4 2.7 13.3l7.8 6C12.4 13 17.8 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17z"/>
            <path fill="#FBBC05" d="M10.5 28.7A14.6 14.6 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7L2.5 13.3A23.8 23.8 0 0 0 0 24c0 3.8.9 7.4 2.5 10.7l8-6z"/>
            <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2 1.4-4.6 2.2-7.7 2.2-6.2 0-11.5-4.2-13.4-9.9l-7.9 6.1C6.6 42.5 14.7 48 24 48z"/>
          </svg>
          Sign up with Google
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-xs text-muted">or with email</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red/10 border border-red/20 text-red text-sm mb-4">
            <FiAlertCircle size={14} className="flex-shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">First Name</label>
              <input type="text" value={form.firstName}
                onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                className="inp" placeholder="John" required />
            </div>
            <div>
              <label className="label">Last Name</label>
              <input type="text" value={form.lastName}
                onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                className="inp" placeholder="Doe" required />
            </div>
          </div>

          <div>
            <label className="label">Email Address</label>
            <div className="relative">
              <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={15} />
              <input type="email" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="inp pl-10" placeholder="you@example.com" required />
            </div>
          </div>

          <div>
            <label className="label">Password <span className="text-muted normal-case tracking-normal font-normal">(min. 8 chars)</span></label>
            <div className="relative">
              <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={15} />
              <input type={showPass ? 'text' : 'password'} value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="inp pl-10 pr-10" placeholder="Create a strong password" required />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white">
                {showPass ? <FiEyeOff size={15} /> : <FiEye size={15} />}
              </button>
            </div>
            {form.password && (
              <div className="mt-1.5">
                <div className="h-1 bg-surf3 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${(strength / 5) * 100}%`, background: strengthColors[strength] }} />
                </div>
                <p className="text-[11px] mt-1" style={{ color: strengthColors[strength] }}>
                  {strengthLabels[strength]}
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="label">Confirm Password</label>
            <div className="relative">
              <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={15} />
              <input type="password" value={form.confirm}
                onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                className="inp pl-10" placeholder="Repeat your password" required />
              {form.confirm && form.password === form.confirm && (
                <FiCheck className="absolute right-3 top-1/2 -translate-y-1/2 text-green" size={15} />
              )}
            </div>
          </div>

          <button type="submit" disabled={submitting} className="btn btn-cyan w-full justify-center gap-2 mt-2">
            {submitting && <Spinner size={16} />}
            {submitting ? 'Creating account...' : 'Create Account & Verify Email →'}
          </button>
        </form>

        <p className="text-center text-sm text-muted mt-5">
          Already have an account?{' '}
          <Link href="/login"><span className="text-cyan font-semibold cursor-pointer hover:underline">Log in</span></Link>
        </p>
      </motion.div>
    </div>
  )
}
