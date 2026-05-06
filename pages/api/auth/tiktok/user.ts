// pages/api/auth/tiktok/user.ts
// Fetches TikTok user profile using access token
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { access_token, open_id } = req.body
  if (!access_token || !open_id) return res.status(400).json({ error: 'Missing token or open_id' })

  try {
    const fields = 'open_id,union_id,avatar_url,display_name,username,follower_count,following_count,likes_count,video_count'

    const response = await fetch(
      `https://open.tiktokapis.com/v2/user/info/?fields=${fields}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
      }
    )

    const data = await response.json()

    if (data.error?.code !== 'ok' && data.error?.code !== 0) {
      console.error('TikTok user info error:', data)
      return res.status(400).json({ error: data.error?.message || 'Failed to fetch user info' })
    }

    const user = data.data?.user
    if (!user) return res.status(400).json({ error: 'No user data returned' })

    return res.status(200).json({
      open_id: user.open_id,
      display_name: user.display_name,
      username: user.username,
      avatar_url: user.avatar_url,
      follower_count: user.follower_count,
      following_count: user.following_count,
      likes_count: user.likes_count,
      video_count: user.video_count,
    })
  } catch (err: any) {
    console.error('TikTok user fetch error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
