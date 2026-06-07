// pages/_app.tsx
import type { AppProps } from 'next/app'
import Head from 'next/head'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '../contexts/AuthContext'
import { PlatformProvider } from '../contexts/PlatformContext'
import '../styles/globals.css'

export default function App({ Component, pageProps }: AppProps) {
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
        <link rel="icon" href="/favicon.ico" />
        <title>SRankIQ — Social Media Ranking Intelligence</title>
      </Head>

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
