// pages/api/auth/tiktok/token.ts
// Exchanges TikTok authorization code for access token
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { code } = req.body
  if (!code) return res.status(400).json({ error: 'Missing code' })

  const clientKey = process.env.TIKTOK_CLIENT_KEY!
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET!
  const redirectUri = process.env.NEXT_PUBLIC_TIKTOK_REDIRECT_URI!

  try {
    const params = new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      code: code as string,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    })

    const response = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })

    const data = await response.json()

    if (data.error || !data.access_token) {
      console.error('TikTok token error:', data)
      return res.status(400).json({ error: data.error_description || 'Token exchange failed' })
    }

    return res.status(200).json({
      access_token: data.access_token,
      open_id: data.open_id,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      scope: data.scope,
    })
  } catch (err: any) {
    console.error('TikTok token exchange error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
