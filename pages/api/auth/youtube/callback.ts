// pages/api/auth/youtube/callback.ts
// Exchanges the OAuth code for access + refresh tokens, stores them server-side
// (Firestore, under the user's uid), then redirects back to the dashboard.
import type { NextApiRequest, NextApiResponse } from 'next'
import { getApps, initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

function adminApp() {
  if (getApps().length) return getApps()[0]
  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const code = String(req.query.code || '')
  const uid = String(req.query.state || '')
  const origin = process.env.NEXT_PUBLIC_SITE_URL || `https://${req.headers.host}`

  if (req.query.error) return res.redirect(`/settings?yt=cancelled`)
  if (!code || !uid) return res.redirect(`/settings?yt=error`)

  try {
    const redirectUri = `${origin}/api/auth/youtube/callback`
    // exchange code → tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })
    const tokens = await tokenRes.json()
    if (tokens.error) {
      console.error('Token exchange error:', tokens)
      return res.redirect(`/settings?yt=error`)
    }

    // fetch the channel so we can store id/name immediately
    let channel: any = null
    try {
      const chRes = await fetch(
        'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
        { headers: { Authorization: `Bearer ${tokens.access_token}` } }
      )
      const chData = await chRes.json()
      const c = chData.items?.[0]
      if (c) channel = {
        id: c.id, name: c.snippet.title, thumbnail: c.snippet.thumbnails?.high?.url,
        subscribers: parseInt(c.statistics.subscriberCount) || 0,
        views: parseInt(c.statistics.viewCount) || 0,
        videos: parseInt(c.statistics.videoCount) || 0,
      }
    } catch {}

    // store tokens server-side (refresh token persists across deploys & sessions)
    const db = getFirestore(adminApp())
    await db.collection('users').doc(uid).set({
      youtube: {
        connected: true,
        refreshToken: tokens.refresh_token || null,   // long-lived
        accessToken: tokens.access_token,             // short-lived (refreshed automatically)
        expiresAt: Date.now() + (tokens.expires_in || 3600) * 1000,
        channelId: channel?.id || null,
        channelName: channel?.name || null,
        subscribers: channel?.subscribers || 0,
        views: channel?.views || 0,
        videoCount: channel?.videos || 0,
        profilePic: channel?.thumbnail || null,
        updatedAt: Date.now(),
      },
    }, { merge: true })

    return res.redirect(`/settings?yt=connected`)
  } catch (err) {
    console.error('OAuth callback failed:', err)
    return res.redirect(`/settings?yt=error`)
  }
}
