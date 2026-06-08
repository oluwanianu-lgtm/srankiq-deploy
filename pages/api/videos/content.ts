// pages/api/videos/content.ts — lazy-loaded tab content (videos/shorts/live/playlists)
import type { NextApiResponse } from 'next'
import { withApiAuth, AuthedRequest } from '../../../lib/serverAuth'
import { listMyVideos, getMyLiveStreams, getMyPlaylists } from '../../../services/youtube'

async function handler(req: AuthedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { accessToken, type } = req.body
    if (!accessToken) return res.status(400).json({ error: 'accessToken required' })

    if (type === 'live') {
      return res.status(200).json({ items: await getMyLiveStreams(accessToken, 25) })
    }
    if (type === 'playlists') {
      return res.status(200).json({ items: await getMyPlaylists(accessToken, 25) })
    }
    // videos + shorts both come from uploads; the client splits by duration
    const all = await listMyVideos(accessToken, 50)
    return res.status(200).json({ items: all })
  } catch (err: any) {
    const expired = /invalid credentials|401|invalid_token|TOKEN_EXPIRED/i.test(err.message)
    return res.status(expired ? 401 : 500).json({ error: expired ? 'TOKEN_EXPIRED' : err.message })
  }
}

export default withApiAuth(handler)
