// pages/privacy.tsx
import Head from 'next/head'
import Link from 'next/link'

export default function PrivacyPolicy() {
  return (
    <>
      <Head>
        <title>Privacy Policy — SRankIQ</title>
        <meta name="description" content="SRankIQ Privacy Policy" />
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
            <Link href="/terms" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Terms of Service</Link>
            <Link href="/login" style={{ color: '#00d4ff', textDecoration: 'none' }}>Sign In</Link>
          </div>
        </header>

        {/* Content */}
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '60px 24px 80px' }}>
          <div style={{ marginBottom: 40 }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Legal</div>
            <h1 style={{ fontSize: 36, fontWeight: 800, margin: 0, marginBottom: 12 }}>Privacy Policy</h1>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: 0 }}>Last updated: May 6, 2026</p>
          </div>

          <div style={{ lineHeight: 1.8, fontSize: 15, color: 'rgba(255,255,255,0.75)' }}>

            <div style={{ padding: '16px 20px', background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.15)', borderRadius: 10, marginBottom: 36, fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>
              Your privacy matters to us. SRankIQ collects only the data necessary to provide the Service, never sells your personal information, and gives you full control over your connected accounts.
            </div>

            <Section title="1. Who We Are">
              SRankIQ ("we", "us", "our") is a social media ranking intelligence platform accessible at srankiq.com. This Privacy Policy explains how we collect, use, disclose, and protect your information when you use our Service. By using SRankIQ, you agree to the collection and use of information in accordance with this policy.
            </Section>

            <Section title="2. Information We Collect">
              <strong style={{ color: '#fff' }}>Account Information:</strong> When you create an account, we collect your name, email address, and password (stored securely via Firebase Authentication).
              <br /><br />
              <strong style={{ color: '#fff' }}>Connected Platform Data:</strong> When you connect social media accounts (YouTube, TikTok, Instagram, Facebook, Twitter/X, LinkedIn), we access data permitted by those platforms' APIs, which may include: public profile information, channel/account statistics, video/post metrics, follower counts, engagement rates, and audience demographics. We access only what is necessary for the Service.
              <br /><br />
              <strong style={{ color: '#fff' }}>Usage Data:</strong> We may collect information about how you use the Service, including pages visited, features used, search queries, and time spent. This helps us improve the platform.
              <br /><br />
              <strong style={{ color: '#fff' }}>Device Information:</strong> We may collect basic device and browser information for security and analytics purposes.
            </Section>

            <Section title="3. How We Use Your Information">
              We use your information to:
              <ul style={{ marginTop: 8, paddingLeft: 20, color: 'rgba(255,255,255,0.65)' }}>
                <li style={{ marginBottom: 6 }}>Provide, operate, and maintain the SRankIQ platform</li>
                <li style={{ marginBottom: 6 }}>Display your social media analytics and insights</li>
                <li style={{ marginBottom: 6 }}>Generate AI-powered content recommendations</li>
                <li style={{ marginBottom: 6 }}>Process subscription payments and manage your account</li>
                <li style={{ marginBottom: 6 }}>Send service-related communications (account updates, billing)</li>
                <li style={{ marginBottom: 6 }}>Improve and develop new features</li>
                <li style={{ marginBottom: 6 }}>Detect and prevent fraud or abuse</li>
                <li>Comply with legal obligations</li>
              </ul>
              We do not use your data to train AI models or sell it to advertisers.
            </Section>

            <Section title="4. TikTok API Data">
              SRankIQ uses the TikTok API to access data from your connected TikTok account. In accordance with TikTok's Platform Policy:
              <ul style={{ marginTop: 8, paddingLeft: 20, color: 'rgba(255,255,255,0.65)' }}>
                <li style={{ marginBottom: 6 }}>We access only the data required to provide analytics and growth insights</li>
                <li style={{ marginBottom: 6 }}>We do not post content to TikTok on your behalf without explicit action from you</li>
                <li style={{ marginBottom: 6 }}>We do not share your TikTok data with third parties except as described in this policy</li>
                <li style={{ marginBottom: 6 }}>You can revoke TikTok access at any time via Settings → Connections or through TikTok's app settings</li>
                <li>TikTok data is stored securely and deleted upon disconnection of your account</li>
              </ul>
            </Section>

            <Section title="5. Data Sharing and Disclosure">
              We do not sell, rent, or trade your personal information. We may share your information only in these limited circumstances:
              <br /><br />
              <strong style={{ color: '#fff' }}>Service Providers:</strong> We use trusted third-party services to operate SRankIQ, including Firebase (authentication and database), Stripe (payments), and Google AI (Gemini API for AI features). These providers access your data only to perform services on our behalf and are bound by confidentiality agreements.
              <br /><br />
              <strong style={{ color: '#fff' }}>Legal Requirements:</strong> We may disclose your information if required by law, court order, or government request.
              <br /><br />
              <strong style={{ color: '#fff' }}>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction with prior notice.
            </Section>

            <Section title="6. Data Retention">
              We retain your account information and connected platform data for as long as your account is active or as needed to provide the Service. If you delete your account, we will delete your personal data within 30 days, except where retention is required by law. Analytics data that has been anonymised and aggregated may be retained for product improvement purposes.
            </Section>

            <Section title="7. Data Security">
              We implement industry-standard security measures to protect your data, including encrypted storage via Firebase, HTTPS for all data transmission, and access controls limiting who can view your data. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
            </Section>

            <Section title="8. Your Rights and Choices">
              Depending on your location, you may have the following rights:
              <ul style={{ marginTop: 8, paddingLeft: 20, color: 'rgba(255,255,255,0.65)' }}>
                <li style={{ marginBottom: 6 }}><strong style={{ color: '#fff' }}>Access:</strong> Request a copy of the data we hold about you</li>
                <li style={{ marginBottom: 6 }}><strong style={{ color: '#fff' }}>Correction:</strong> Request correction of inaccurate data</li>
                <li style={{ marginBottom: 6 }}><strong style={{ color: '#fff' }}>Deletion:</strong> Request deletion of your account and associated data</li>
                <li style={{ marginBottom: 6 }}><strong style={{ color: '#fff' }}>Portability:</strong> Request your data in a portable format</li>
                <li style={{ marginBottom: 6 }}><strong style={{ color: '#fff' }}>Opt-out:</strong> Disconnect any social media account at any time via Settings</li>
                <li><strong style={{ color: '#fff' }}>Object:</strong> Object to certain types of processing of your data</li>
              </ul>
              To exercise any of these rights, contact us at <a href="mailto:privacy@srankiq.com" style={{ color: '#00d4ff', textDecoration: 'none' }}>privacy@srankiq.com</a>.
            </Section>

            <Section title="9. Cookies">
              SRankIQ uses cookies and similar technologies to maintain your session, remember your preferences, and analyse usage patterns. You can control cookies through your browser settings, though disabling cookies may affect certain features of the Service.
            </Section>

            <Section title="10. Children's Privacy">
              SRankIQ is not directed at children under 13 years of age. We do not knowingly collect personal information from children under 13. If we become aware that a child under 13 has provided us with personal information, we will take steps to delete such information promptly.
            </Section>

            <Section title="11. International Data Transfers">
              Your information may be processed and stored in countries other than your own. By using the Service, you consent to the transfer of your information to countries that may have different data protection laws than your country of residence.
            </Section>

            <Section title="12. Changes to This Policy">
              We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the new policy on this page and updating the "Last updated" date. We encourage you to review this policy periodically. Your continued use of the Service after changes constitutes acceptance of the updated policy.
            </Section>

            <Section title="13. Contact Us">
              If you have any questions, concerns, or requests regarding this Privacy Policy or how we handle your data, please contact us:
              <div style={{ marginTop: 12, padding: '16px 20px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)' }}>
                <div><strong style={{ color: '#fff' }}>SRankIQ — Privacy Team</strong></div>
                <div>Email: <a href="mailto:privacy@srankiq.com" style={{ color: '#00d4ff', textDecoration: 'none' }}>privacy@srankiq.com</a></div>
                <div>Website: <a href="https://srankiq.com" style={{ color: '#00d4ff', textDecoration: 'none' }}>srankiq.com</a></div>
              </div>
            </Section>

          </div>

          {/* Footer nav */}
          <div style={{ marginTop: 60, paddingTop: 32, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 24, fontSize: 13 }}>
            <Link href="/terms" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>Terms of Service</Link>
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
