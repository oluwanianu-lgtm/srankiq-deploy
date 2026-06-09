// lib/youtubeToken.ts
// Returns a valid YouTube access token for a user, refreshing it automatically
// using the stored refresh token. This is what keeps users connected without
// re-auth (the VidIQ behavior).

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

export interface YTTokenResult {
  accessToken: string | null
  channelId: string | null
  needsReconnect: boolean
}

/**
 * Get a valid access token for the user. If the stored one is still fresh, return it.
 * Otherwise use the refresh token to mint a new one and persist it.
 * Returns needsReconnect=true only if there's no refresh token (user never did code flow).
 */
export async function getValidYouTubeToken(uid: string): Promise<YTTokenResult> {
  const db = getFirestore(adminApp())
  const ref = db.collection('users').doc(uid)
  const snap = await ref.get()
  const yt = snap.data()?.youtube
  if (!yt || !yt.connected) return { accessToken: null, channelId: null, needsReconnect: true }

  // still valid (60s buffer)
  if (yt.accessToken && yt.expiresAt && Date.now() < yt.expiresAt - 60000) {
    return { accessToken: yt.accessToken, channelId: yt.channelId || null, needsReconnect: false }
  }

  // need to refresh
  if (!yt.refreshToken) {
    // legacy connection (implicit flow) — no refresh token available
    return { accessToken: yt.accessToken || null, channelId: yt.channelId || null, needsReconnect: !yt.accessToken }
  }

  try {
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        refresh_token: yt.refreshToken,
        grant_type: 'refresh_token',
      }),
    })
    const data = await r.json()
    if (data.error || !data.access_token) {
      // refresh token revoked/expired → user must reconnect
      return { accessToken: null, channelId: yt.channelId || null, needsReconnect: true }
    }
    const newToken = data.access_token
    const expiresAt = Date.now() + (data.expires_in || 3600) * 1000
    await ref.set({ youtube: { ...yt, accessToken: newToken, expiresAt, updatedAt: Date.now() } }, { merge: true })
    return { accessToken: newToken, channelId: yt.channelId || null, needsReconnect: false }
  } catch {
    return { accessToken: yt.accessToken || null, channelId: yt.channelId || null, needsReconnect: false }
  }
}
