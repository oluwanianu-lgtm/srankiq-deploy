// pages/privacy.tsx
import React from 'react'
import Head from 'next/head'
import Link from 'next/link'

const SECTIONS = [
  {
    title: '1. Who We Are',
    body: [
      `SRankIQ ("we", "us", "our") operates srankiq.com, a social media analytics and content optimization platform. This Privacy Policy explains what information we collect, how we use it, and the choices you have. By using SRankIQ you agree to this policy.`,
    ],
  },
  {
    title: '2. Information We Collect',
    body: [
      `Account information: when you sign up we collect your name, email address, and password (stored as a secure hash via Firebase Authentication). If you sign in with Google, we receive your name, email address, and profile picture from your Google account.`,
      `Connected platform data: if you choose to connect a social media account (such as YouTube), we access data from that platform with your explicit permission, including your channel name, subscriber count, view counts, video titles, descriptions, tags, and engagement statistics.`,
      `Content you submit: titles, descriptions, keywords, and other text you enter into our tools for analysis or generation.`,
      `Usage data: basic technical information such as pages visited and features used, to operate and improve the service.`,
    ],
  },
  {
    title: '3. Google User Data & YouTube API Services',
    body: [
      `SRankIQ uses the YouTube API Services. By connecting your YouTube account, you agree to be bound by the YouTube Terms of Service (https://www.youtube.com/t/terms). Google's Privacy Policy applies to Google's handling of your data and is available at https://policies.google.com/privacy.`,
      `When you connect YouTube, we request read access to your channel and video statistics. We use this data solely to display your analytics inside your SRankIQ dashboard and to generate optimization insights for you. We do not sell Google user data, do not use it for advertising, and do not share it with third parties except as required to provide the service to you.`,
      `SRankIQ's use and transfer of information received from Google APIs adheres to the Google API Services User Data Policy (https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements.`,
      `Stored platform data: connection tokens and cached channel statistics are stored securely in your user profile in Google Firebase (Firestore) and are accessible only to your account.`,
      `Revoking access: you can disconnect YouTube at any time from your SRankIQ Settings page, or revoke SRankIQ's access directly via your Google security settings at https://myaccount.google.com/permissions. Upon disconnection we delete the stored access token and cached channel data associated with that connection.`,
    ],
  },
  {
    title: '4. How We Use Information',
    body: [
      `To provide the service: authenticate you, display your analytics, run keyword and trend research, and generate AI-powered content suggestions.`,
      `AI processing: text you submit (such as a video topic or description) may be processed by our AI provider (Google Gemini) to generate suggestions. We send only the content needed for the feature you are using.`,
      `To communicate with you: service-related messages such as account verification and password reset emails.`,
      `We do not sell your personal information to anyone.`,
    ],
  },
  {
    title: '5. Data Storage & Security',
    body: [
      `Your data is stored in Google Firebase (Authentication and Firestore) with industry-standard security. Access to your data is protected by authentication on every request, and database rules ensure each user can only access their own records. No method of transmission or storage is 100% secure, but we take reasonable measures to protect your information.`,
    ],
  },
  {
    title: '6. Data Retention & Deletion',
    body: [
      `We retain your data while your account is active. You may delete saved reports, keyword history, and platform connections at any time from within the app.`,
      `To delete your account and all associated data, contact us at support@srankiq.com and we will complete the deletion within 30 days.`,
    ],
  },
  {
    title: '7. Cookies',
    body: [
      `We use essential cookies and similar technologies (such as Firebase Authentication tokens) to keep you signed in and to operate the service. We do not use third-party advertising cookies.`,
    ],
  },
  {
    title: '8. Children',
    body: [
      `SRankIQ is not directed at children under 13 (or the minimum age in your jurisdiction), and we do not knowingly collect data from them.`,
    ],
  },
  {
    title: '9. Changes to This Policy',
    body: [
      `We may update this policy from time to time. We will post the updated version on this page with a revised effective date. Continued use of the service after changes means you accept the updated policy.`,
    ],
  },
  {
    title: '10. Contact Us',
    body: [
      `Questions or requests about your data: support@srankiq.com`,
    ],
  },
]

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-bg text-white">
      <Head>
        <title>Privacy Policy — SRankIQ</title>
        <meta name="description" content="SRankIQ Privacy Policy — how we collect, use, and protect your data, including Google and YouTube account data." />
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
        <h1 className="font-display text-4xl mb-2">PRIVACY <span className="grad-text">POLICY</span></h1>
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
