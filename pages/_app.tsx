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
        <title>SRankIQ — Social Media Ranking Intelligence</title>
        <meta name="description" content="AI-powered YouTube growth platform. Analyze competitors, find trending keywords, clone winning channels, and grow faster." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Favicon */}
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="alternate icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        {/* Open Graph */}
        <meta property="og:title" content="SRankIQ — Social Media Ranking Intelligence" />
        <meta property="og:description" content="AI-powered YouTube growth platform" />
        <meta property="og:image" content="/og-image.png" />
        <meta property="og:type" content="website" />
        {/* Theme color */}
        <meta name="theme-color" content="#0d0d0d" />
      </Head>
      <AuthProvider>
        <PlatformProvider>
          <Component {...pageProps} />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#1a1a2e',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                fontSize: '13px',
              },
              success: { iconTheme: { primary: '#00ff88', secondary: '#0d0d0d' } },
              error: { iconTheme: { primary: '#ff0090', secondary: '#0d0d0d' } },
            }}
          />
        </PlatformProvider>
      </AuthProvider>
    </>
  )
}
