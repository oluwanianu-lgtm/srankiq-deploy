// pages/terms.tsx
import Head from 'next/head'
import Link from 'next/link'

export default function TermsOfService() {
  return (
    <>
      <Head>
        <title>Terms of Service — SRankIQ</title>
        <meta name="description" content="SRankIQ Terms of Service" />
      </Head>
      <div style={{ minHeight: '100vh', background: '#0a0a12', color: '#e8e8e8', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

        {/* Header */}
        <header style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="lg1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00d4ff" />
                  <stop offset="100%" stopColor="#7b2fff" />
                </linearGradient>
              </defs>
              <rect width="40" height="40" rx="10" fill="#0d0d14" />
              <rect x="0.75" y="0.75" width="38.5" height="38.5" rx="9.25" stroke="url(#lg1)" strokeOpacity="0.5" strokeWidth="1.5" />
              <path d="M13 13.8C13 12.2536 14.2536 11 15.8 11H23.2C24.7464 11 26 12.2536 26 13.8C26 15.3464 24.7464 16.6 23.2 16.6H16.6C15.0536 16.6 13.8 17.8536 13.8 19.4C13.8 20.9464 15.0536 22.2 16.6 22.2H22.2C23.7464 22.2 25 23.4536 25 25C25 26.5464 23.7464 27.8 22.2 27.8H15" stroke="url(#lg1)" strokeWidth="2.2" strokeLinecap="round" />
              <rect x="28" y="24" width="2.5" height="4" rx="1" fill="url(#lg1)" opacity="0.95" />
              <rect x="31.5" y="20.5" width="2.5" height="7.5" rx="1" fill="url(#lg1)" opacity="0.75" />
              <circle cx="30.5" cy="12" r="1.5" fill="#00d4ff" opacity="0.85" />
            </svg>
            <span style={{ fontWeight: 700, fontSize: 16, background: 'linear-gradient(90deg,#00d4ff,#7b2fff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              SRankIQ
            </span>
          </Link>
          <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
            <Link href="/privacy" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Privacy Policy</Link>
            <Link href="/login" style={{ color: '#00d4ff', textDecoration: 'none' }}>Sign In</Link>
          </div>
        </header>

        {/* Content */}
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '60px 24px 80px' }}>
          <div style={{ marginBottom: 40 }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Legal</div>
            <h1 style={{ fontSize: 36, fontWeight: 800, margin: 0, marginBottom: 12 }}>Terms of Service</h1>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: 0 }}>Last updated: May 6, 2026</p>
          </div>

          <div style={{ lineHeight: 1.8, fontSize: 15, color: 'rgba(255,255,255,0.75)' }}>

            <Section title="1. Acceptance of Terms">
              By accessing or using SRankIQ ("the Service", "we", "us", or "our") at srankiq.com, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service. These terms apply to all visitors, users, and others who access the Service.
            </Section>

            <Section title="2. Description of Service">
              SRankIQ is a social media ranking intelligence platform that provides AI-powered analytics, content strategy, competitor research, keyword insights, and growth tools for content creators and businesses. The Service connects to third-party platforms including YouTube, TikTok, Instagram, Facebook, Twitter/X, and LinkedIn via their official APIs to retrieve data on your behalf.
            </Section>

            <Section title="3. User Accounts">
              To use SRankIQ you must create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to provide accurate, current, and complete information during registration and to update such information as necessary. We reserve the right to suspend or terminate your account if any information is found to be inaccurate or in violation of these terms.
            </Section>

            <Section title="4. Third-Party Platform Connections">
              SRankIQ integrates with third-party platforms including TikTok, YouTube, Instagram, Facebook, Twitter/X, and LinkedIn. By connecting your accounts you authorise SRankIQ to access your account data in accordance with the permissions you grant. We access only the data necessary to provide the Service. You may revoke access at any time through your account settings or directly through the third-party platform. Your use of connected platforms is also subject to those platforms' own terms of service.
            </Section>

            <Section title="5. Data We Access from Connected Platforms">
              When you connect a TikTok, YouTube, Instagram, or other social media account, we may access: your public profile information, video/post performance metrics, follower counts, engagement data, and channel analytics. We do not post content on your behalf, and we do not access private messages or contacts unless explicitly stated and consented to.
            </Section>

            <Section title="6. Acceptable Use">
              You agree not to use SRankIQ to: (a) violate any applicable laws or regulations; (b) infringe on the intellectual property rights of others; (c) attempt to gain unauthorised access to any part of the Service; (d) use automated means to scrape or extract data beyond what is provided by the Service; (e) resell or redistribute data obtained through the Service without authorisation; (f) engage in any activity that disrupts or interferes with the Service.
            </Section>

            <Section title="7. Subscription and Payments">
              SRankIQ offers paid subscription plans. By subscribing you agree to pay all fees associated with your chosen plan. Subscriptions are billed on a recurring basis (monthly or annually) and will automatically renew unless cancelled before the renewal date. All fees are non-refundable except where required by law. We reserve the right to change pricing with 30 days notice to existing subscribers.
            </Section>

            <Section title="8. Intellectual Property">
              All content, features, and functionality of SRankIQ — including but not limited to text, graphics, logos, icons, and software — are the exclusive property of SRankIQ and are protected by intellectual property laws. You may not copy, reproduce, distribute, or create derivative works without express written permission. You retain ownership of any content or data you provide or generate through the Service.
            </Section>

            <Section title="9. Privacy">
              Your use of the Service is also governed by our <Link href="/privacy" style={{ color: '#00d4ff', textDecoration: 'none' }}>Privacy Policy</Link>, which is incorporated into these Terms by reference. Please review our Privacy Policy to understand our practices regarding the collection and use of your information.
            </Section>

            <Section title="10. Disclaimers">
              The Service is provided on an "as is" and "as available" basis without warranties of any kind, either express or implied. SRankIQ does not warrant that the Service will be uninterrupted, error-free, or free of viruses or other harmful components. Analytics and growth projections provided by the Service are estimates only and not guarantees of results.
            </Section>

            <Section title="11. Limitation of Liability">
              To the maximum extent permitted by law, SRankIQ shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use the Service, even if SRankIQ has been advised of the possibility of such damages. Our total liability to you for any claim arising from these terms or the Service shall not exceed the amount you paid to us in the 12 months preceding the claim.
            </Section>

            <Section title="12. Termination">
              We may terminate or suspend your access to the Service at any time, with or without cause, with or without notice. Upon termination, your right to use the Service will immediately cease. You may cancel your account at any time through your account settings. Provisions of these Terms that by their nature should survive termination shall survive.
            </Section>

            <Section title="13. Changes to Terms">
              We reserve the right to modify these Terms at any time. We will notify you of material changes by posting the updated Terms on this page and updating the "Last updated" date. Your continued use of the Service after any changes constitutes your acceptance of the new Terms. We encourage you to review these Terms periodically.
            </Section>

            <Section title="14. Governing Law">
              These Terms shall be governed by and construed in accordance with applicable laws. Any disputes arising from these Terms or your use of the Service shall be resolved through binding arbitration or in a court of competent jurisdiction.
            </Section>

            <Section title="15. Contact Us">
              If you have any questions about these Terms of Service, please contact us at:
              <div style={{ marginTop: 12, padding: '16px 20px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)' }}>
                <div><strong style={{ color: '#fff' }}>SRankIQ</strong></div>
                <div>Email: <a href="mailto:legal@srankiq.com" style={{ color: '#00d4ff', textDecoration: 'none' }}>legal@srankiq.com</a></div>
                <div>Website: <a href="https://srankiq.com" style={{ color: '#00d4ff', textDecoration: 'none' }}>srankiq.com</a></div>
              </div>
            </Section>
          </div>

          {/* Footer nav */}
          <div style={{ marginTop: 60, paddingTop: 32, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 24, fontSize: 13 }}>
            <Link href="/privacy" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>Privacy Policy</Link>
            <Link href="/login" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>Sign In</Link>
            <Link href="/" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>Home</Link>
          </div>
        </div>
      </div>
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <h2 style={{ fontSize: 17, fontWeight: 700, color: '#fff', marginBottom: 10, marginTop: 0 }}>{title}</h2>
      <div style={{ color: 'rgba(255,255,255,0.65)', lineHeight: 1.85, fontSize: 14 }}>{children}</div>
    </div>
  )
}
