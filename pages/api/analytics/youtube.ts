// pages/api/analytics/youtube.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getChannelData, getTopVideos } from '../../../services/youtube'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { accessToken } = req.body
    if (!accessToken) return res.status(400).json({ error: 'accessToken required' })

    const [channel, videos] = await Promise.all([
      getChannelData(accessToken),
      getTopVideos(accessToken, 10),
    ])

    return res.status(200).json({ channel, videos })
  } catch (err: any) {
    console.error('YouTube analytics error:', err)
    return res.status(500).json({ error: err.message })
  }
}
