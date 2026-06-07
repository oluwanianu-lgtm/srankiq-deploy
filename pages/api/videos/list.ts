// pages/api/videos/list.ts — the signed-in user's uploads
import type { NextApiResponse } from 'next'
import { withApiAuth, AuthedRequest } from '../../../lib/serverAuth'
import { listMyVideos } from '../../../services/youtube'

async function handler(req: AuthedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { accessToken } = req.body
    if (!accessToken) return res.status(400).json({ error: 'accessToken required' })
    const videos = await listMyVideos(accessToken, 25)
    return res.status(200).json({ videos })
  } catch (err: any) {
    const expired = /invalid credentials|401|invalid_token/i.test(err.message)
    return res.status(expired ? 401 : 500).json({
      error: expired ? 'TOKEN_EXPIRED' : err.message,
    })
  }
}

export default withApiAuth(handler)
