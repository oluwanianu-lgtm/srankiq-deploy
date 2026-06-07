// pages/terms.tsx
import React from 'react'
import Head from 'next/head'
import Link from 'next/link'

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    body: [
      `These Terms of Service ("Terms") govern your use of SRankIQ at srankiq.com ("the Service"), operated by SRankIQ ("we", "us"). By creating an account or using the Service you agree to these Terms. If you do not agree, do not use the Service.`,
    ],
  },
  {
    title: '2. The Service',
    body: [
      `SRankIQ provides social media analytics, keyword research, trend discovery, competitor analysis, and AI-assisted content optimization tools. Features may change, improve, or be discontinued at any time.`,
      `AI-generated suggestions (titles, descriptions, hashtags, scores, and insights) are provided for guidance only. We do not guarantee any ranking, view count, growth, or revenue outcome from using the Service.`,
    ],
  },
  {
    title: '3. Your Account',
    body: [
      `You must provide accurate information when registering and keep your credentials secure. You are responsible for all activity under your account. You must be at least 13 years old (or the minimum age in your jurisdiction) to use the Service.`,
    ],
  },
  {
    title: '4. Connected Platforms & YouTube API Services',
    body: [
      `The Service lets you connect third-party social media accounts. You are responsible for complying with each platform's terms when using SRankIQ with that platform.`,
      `SRankIQ uses YouTube API Services. By connecting a YouTube account you also agree to the YouTube Terms of Service (https://www.youtube.com/t/terms). You can revoke SRankIQ's access to your Google data at any time via https://myaccount.google.com/permissions. Our handling of your data is described in our Privacy Policy.`,
    ],
  },
  {
    title: '5. Acceptable Use',
    body: [
      `You agree not to: misuse, reverse engineer, or disrupt the Service; use the Service to violate any law or any platform's terms; attempt to access other users' data; use automated means to scrape the Service; or resell the Service without our written permission.`,
    ],
  },
  {
    title: '6. Plans, Billing & Refunds',
    body: [
      `The Service offers free and paid plans. Paid plan features and prices are shown on the Billing page and may change with notice. Unless otherwise stated, subscription fees are billed in advance and are non-refundable except where required by law. You can cancel at any time; access continues until the end of the paid period.`,
    ],
  },
  {
    title: '7. Intellectual Property',
    body: [
      `The Service, including its design, code, and branding, is owned by SRankIQ. You retain ownership of content you submit. AI-generated outputs produced for you may be used by you freely; you are responsible for ensuring your use of any output complies with applicable laws and platform policies.`,
    ],
  },
  {
    title: '8. Disclaimers & Limitation of Liability',
    body: [
      `The Service is provided "as is" and "as available" without warranties of any kind, express or implied. Analytics data depends on third-party platforms and may be delayed, incomplete, or unavailable.`,
      `To the maximum extent permitted by law, SRankIQ shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits, revenue, data, or goodwill. Our total liability for any claim shall not exceed the amount you paid us in the 12 months before the claim.`,
    ],
  },
  {
    title: '9. Termination',
    body: [
      `You may stop using the Service at any time. We may suspend or terminate accounts that violate these Terms or where required for security or legal reasons. Upon termination, your right to use the Service ends; data deletion is handled per our Privacy Policy.`,
    ],
  },
  {
    title: '10. Changes & Contact',
    body: [
      `We may update these Terms from time to time; the current version will always be available on this page with its effective date. Continued use after changes constitutes acceptance.`,
      `Questions about these Terms: support@srankiq.com`,
    ],
  },
]

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-bg text-white">
      <Head>
        <title>Terms of Service — SRankIQ</title>
        <meta name="description" content="SRankIQ Terms of Service — the rules and conditions for using the SRankIQ platform." />
      </Head>

      {/* NAV */}
      <nav className="border-b border-white/5 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-gradient-to-br from-cyan to-magenta
                          flex items-center justify-center font-display text-black text-sm">S</div>
            <span className="font-display text-lg"><span className="text-cyan">S</span>RankIQ</span>
          </Link>
          <Link href="/" className="text-xs text-muted hover:text-white">← Back to home</Link>
        </div>
      </nav>

      {/* CONTENT */}
      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="font-display text-4xl mb-2">TERMS OF <span className="grad-text">SERVICE</span></h1>
        <p className="text-sm text-muted mb-12">Effective date: June 7, 2026</p>

        <div className="space-y-10">
          {SECTIONS.map(s => (
            <section key={s.title}>
              <h2 className="font-display text-xl text-cyan mb-3">{s.title}</h2>
              {s.body.map((p, i) => (
                <p key={i} className="text-sm leading-relaxed text-white/70 mb-3">{p}</p>
              ))}
            </section>
          ))}
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-10 px-6">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted">© 2026 SRankIQ. All rights reserved.</p>
          <div className="flex gap-6 text-xs text-muted">
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
            <a href="mailto:support@srankiq.com" className="hover:text-white">Support</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
