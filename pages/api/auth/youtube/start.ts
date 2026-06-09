// pages/api/auth/youtube/start.ts
// Begins the server-side OAuth code flow (gets a refresh token → stays connected).
import type { NextApiRequest, NextApiResponse } from 'next'

const SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/youtube.force-ssl',
  'https://www.googleapis.com/auth/yt-analytics.readonly',
  'openid', 'email', 'profile',
].join(' ')

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // uid passed through state so the callback knows which user to attach tokens to
  const uid = String(req.query.uid || '')
  if (!uid) return res.status(400).send('Missing uid')

  const origin = process.env.NEXT_PUBLIC_SITE_URL || `https://${req.headers.host}`
  const redirectUri = `${origin}/api/auth/youtube/callback`

  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',     // ← this is what yields a refresh token
    prompt: 'consent',          // ensure refresh token is returned even on re-connect
    include_granted_scopes: 'true',
    state: uid,
  })
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`)
}
