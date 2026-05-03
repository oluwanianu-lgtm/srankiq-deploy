// pages/forgot-password.tsx
import React, { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { FiMail, FiArrowLeft } from 'react-icons/fi'
import { Spinner } from '../components/ui'

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await resetPassword(email)
      setSent(true)
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <Link href="/login">
          <div className="flex items-center gap-2 mb-8 cursor-pointer">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan to-magenta
                          flex items-center justify-center font-display text-black text-xl">S</div>
            <span className="font-display text-2xl"><span className="text-cyan">S</span>RankIQ</span>
          </div>
        </Link>

        {sent ? (
          <div className="card text-center p-8">
            <div className="text-5xl mb-4">📧</div>
            <h2 className="font-display text-3xl mb-2">CHECK YOUR EMAIL</h2>
            <p className="text-muted text-sm mb-6">
              Password reset instructions sent to <strong className="text-cyan">{email}</strong>
            </p>
            <Link href="/login">
              <button className="btn btn-cyan w-full justify-center">Back to Login →</button>
            </Link>
          </div>
        ) : (
          <>
            <h1 className="font-display text-4xl mb-1">RESET PASSWORD</h1>
            <p className="text-muted text-sm mb-8">Enter your email and we'll send reset instructions.</p>

            {error && (
              <div className="p-3 rounded-lg bg-red/10 border border-red/20 text-red text-sm mb-4">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Email Address</label>
                <div className="relative">
                  <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={15} />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    className="inp pl-10" placeholder="you@example.com" required />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn btn-cyan w-full justify-center gap-2">
                {loading && <Spinner size={15} />}
                {loading ? 'Sending...' : 'Send Reset Link →'}
              </button>
            </form>

            <Link href="/login">
              <div className="flex items-center gap-2 text-muted text-sm mt-6 cursor-pointer hover:text-white transition-colors">
                <FiArrowLeft size={14} /> Back to Login
              </div>
            </Link>
          </>
        )}
      </motion.div>
    </div>
  )
}
