// pages/_app.tsx
import type { AppProps } from 'next/app'
import Head from 'next/head'
import Script from 'next/script'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '../contexts/AuthContext'
import { PlatformProvider } from '../contexts/PlatformContext'
import LoadingScreen from '../components/LoadingScreen'
import '../styles/globals.css'

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [fading, setFading] = useState(false)

  // initial splash — show briefly on first load
  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 1100)
    const t2 = setTimeout(() => setLoading(false), 1600)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  // show loader on route changes
  useEffect(() => {
    const start = () => { setLoading(true); setFading(false) }
    const done = () => { setFading(true); setTimeout(() => setLoading(false), 450) }
    router.events.on('routeChangeStart', start)
    router.events.on('routeChangeComplete', done)
    router.events.on('routeChangeError', done)
    return () => {
      router.events.off('routeChangeStart', start)
      router.events.off('routeChangeComplete', done)
      router.events.off('routeChangeError', done)
    }
  }, [router])

  return (
    <>
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="SRankIQ — The only tool that ranks you on every platform. AI-powered social media SEO, analytics, and optimization." />
        <meta property="og:title" content="SRankIQ — Social Media Ranking Intelligence" />
        <meta property="og:description" content="7 platforms. AI content. SEO scanning. Real-time keyword ranking." />
        <meta property="og:type" content="website" />
        <meta name="theme-color" content="#030309" />
        <link rel="icon" href="/brand/logo-icon-cyan.png" />
        <title>SRankIQ — Social Media Ranking Intelligence</title>
      </Head>

      {/* Google Identity Services — required for YouTube connect/reconnect */}
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />

      {loading && <LoadingScreen fading={fading} />}

      <AuthProvider>
        <PlatformProvider>
          <Component {...pageProps} />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#0e0e24',
                color: '#f0f0ff',
                border: '1px solid rgba(255,255,255,0.1)',
                fontFamily: 'Outfit, sans-serif',
                fontSize: '13px',
              },
              success: { iconTheme: { primary: '#00ff88', secondary: '#000' } },
              error: { iconTheme: { primary: '#ff3366', secondary: '#fff' } },
            }}
          />
        </PlatformProvider>
      </AuthProvider>
    </>
  )
}
