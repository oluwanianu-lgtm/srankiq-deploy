// pages/billing.tsx
import React, { useState } from 'react'
import { motion } from 'framer-motion'
import DashboardLayout from '../components/layout/DashboardLayout'
import { withAuth } from '../lib/withAuth'
import { useAuth } from '../contexts/AuthContext'
import { FiCheck, FiZap } from 'react-icons/fi'
import toast from 'react-hot-toast'

const PLANS = [
  {
    name: 'Starter', price: 0, period: 'forever', color: '#6060a0',
    features: ['3 platforms', '10 keyword searches/day', 'Basic AI generation (5/day)', 'SEO scan (3/day)', 'Dashboard analytics'],
    limits: { platforms: 3, keywords: 10, ai: 5, scans: 3 },
  },
  {
    name: 'Basic', price: 5, period: 'month', color: '#b4ff00',
    features: ['5 platforms', '30 keyword searches/day', 'AI generation (30/day)', 'SEO scan (unlimited)', 'Analytics dashboard', 'Email support'],
    limits: { platforms: 5, keywords: 30, ai: 30, scans: -1 },
  },
  {
    name: 'Pro', price: 29, period: 'month', color: '#00f5ff', popular: true,
    features: ['All 7 platforms', 'Unlimited keyword research', 'Unlimited AI generation', 'Unlimited SEO scans', 'Competitor tracking (10)', 'Advanced analytics', 'Priority support', 'AI content ideas'],
    limits: { platforms: 7, keywords: -1, ai: -1, scans: -1 },
  },
  {
    name: 'Agency', price: 99, period: 'month', color: '#ff0090',
    features: ['Everything in Pro', 'Team collaboration (5 seats)', 'White-label reports', 'API access', 'Custom integrations', 'Dedicated account manager', 'Priority phone support', 'Custom AI training'],
    limits: { platforms: 7, keywords: -1, ai: -1, scans: -1 },
  },
]

function BillingPage() {
  const { profile } = useAuth()
  const [annual, setAnnual] = useState(false)

  const handleUpgrade = (plan: string) => {
    if (plan === profile?.plan) return
    if (plan === 'Starter') return
    toast('Payment integration coming soon! We\'re setting up Stripe.', { icon: '🚧' })
  }

  return (
    <DashboardLayout title="Billing">
      <div className="p-6 max-w-5xl">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold">💳 Billing & Plans</h1>
            <p className="text-muted text-sm">
              Current plan: <span className="text-cyan font-bold capitalize">{profile?.plan}</span>
            </p>
          </div>
          <div className="flex items-center gap-3 bg-surf2 p-1 rounded-xl">
            <button onClick={() => setAnnual(false)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all
                         ${!annual ? 'bg-white/10 text-white' : 'text-muted'}`}>Monthly</button>
            <button onClick={() => setAnnual(true)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2
                         ${annual ? 'bg-white/10 text-white' : 'text-muted'}`}>
              Annual <span className="badge-green text-[9px]">-20%</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {PLANS.map((plan, i) => {
            const isCurrent = profile?.plan?.toLowerCase() === plan.name.toLowerCase()
            const price = annual && plan.price > 0 ? Math.round(plan.price * 0.8) : plan.price

            return (
              <motion.div key={plan.name}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className={`card relative flex flex-col ${plan.popular ? 'border-cyan/30 shadow-cyan' : ''} ${isCurrent ? 'border-white/20' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 badge-cyan text-[10px] whitespace-nowrap">
                    Most Popular
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 right-4 badge-green text-[10px]">Current Plan</div>
                )}

                <div className="mb-4">
                  <div className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: plan.color }}>
                    {plan.name}
                  </div>
                  <div className="flex items-end gap-1">
                    <span className="font-display text-4xl" style={{ color: plan.color }}>
                      ${price}
                    </span>
                    <span className="text-muted text-sm mb-1.5">/{plan.period}</span>
                  </div>
                  {annual && plan.price > 0 && (
                    <div className="text-xs text-green mt-1">Save ${Math.round(plan.price * 0.2 * 12)}/year</div>
                  )}
                </div>

                <ul className="space-y-2 flex-1 mb-5">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-xs text-white/70">
                      <FiCheck size={12} className="flex-shrink-0 mt-0.5" style={{ color: plan.color }} />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleUpgrade(plan.name)}
                  disabled={isCurrent}
                  className={`btn w-full justify-center text-sm ${
                    isCurrent ? 'btn-ghost opacity-50 cursor-not-allowed' :
                    plan.popular ? 'btn-cyan' : 'btn-ghost'
                  }`}
                  style={!isCurrent && !plan.popular ? { borderColor: plan.color + '40', color: plan.color } : {}}>
                  {isCurrent ? '✓ Current Plan' : plan.price === 0 ? 'Downgrade' : `Upgrade to ${plan.name}`}
                </button>
              </motion.div>
            )
          })}
        </div>

        {/* Current usage */}
        <div className="card">
          <h3 className="font-bold text-white mb-4">📊 This Month's Usage</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Keyword Searches', used: 47, limit: profile?.plan === 'starter' ? 300 : -1 },
              { label: 'AI Generations', used: 23, limit: profile?.plan === 'starter' ? 150 : -1 },
              { label: 'SEO Scans', used: 12, limit: profile?.plan === 'starter' ? 90 : -1 },
              { label: 'Competitors Tracked', used: 2, limit: profile?.plan === 'starter' ? 0 : 10 },
            ].map(u => (
              <div key={u.label}>
                <div className="flex justify-between mb-1.5">
                  <span className="text-xs text-muted">{u.label}</span>
                  <span className="text-xs font-bold text-cyan">
                    {u.used}{u.limit === -1 ? '' : `/${u.limit}`}
                  </span>
                </div>
                <div className="progress">
                  <div className="progress-fill bg-cyan" style={{
                    width: u.limit === -1 ? '30%' : `${Math.min((u.used / u.limit) * 100, 100)}%`
                  }} />
                </div>
                {u.limit !== -1 && u.limit > 0 && u.used / u.limit > 0.8 && (
                  <p className="text-[10px] text-gold mt-1">⚠ Approaching limit</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Invoice note */}
        <div className="card bg-surf2/50 mt-4 text-center py-6 text-sm text-muted">
          <FiZap className="mx-auto mb-2 text-cyan" size={20} />
          Payment powered by Stripe. Cancel anytime. No hidden fees.
          <br />Questions? Email <span className="text-cyan">billing@srankiq.com</span>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default withAuth(BillingPage)
