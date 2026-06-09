// pages/api/auth/youtube/token.ts
// Returns a currently-valid access token for the signed-in user (auto-refreshed).
// The dashboard calls this instead of relying on the old 1-hour implicit token.
import type { NextApiResponse } from 'next'
import { withApiAuth, AuthedRequest } from '../../../../lib/serverAuth'
import { getValidYouTubeToken } from '../../../../lib/youtubeToken'

async function handler(req: AuthedRequest, res: NextApiResponse) {
  try {
    const result = await getValidYouTubeToken(req.uid)
    if (result.needsReconnect) {
      return res.status(200).json({ connected: false, needsReconnect: true })
    }
    return res.status(200).json({
      connected: true,
      accessToken: result.accessToken,
      channelId: result.channelId,
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}

export default withApiAuth(handler)
