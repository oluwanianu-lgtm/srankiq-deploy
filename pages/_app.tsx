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

        {/* Favicon — ICO is the ONLY format that reliably shows in browser tabs */}
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />

        <meta name="theme-color" content="#0a0a12" />
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
