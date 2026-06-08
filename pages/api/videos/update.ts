// pages/api/videos/update.ts — push metadata edits live to YouTube
import type { NextApiResponse } from 'next'
import { withApiAuth, AuthedRequest } from '../../../lib/serverAuth'
import { updateVideoMetadata } from '../../../services/youtube'

async function handler(req: AuthedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { accessToken, videoId, title, description, tags, privacyStatus, categoryId, madeForKids, defaultLanguage, recordingDate } = req.body
    if (!accessToken || !videoId) return res.status(400).json({ error: 'accessToken and videoId required' })
    if (title !== undefined && (!title.trim() || title.length > 100))
      return res.status(400).json({ error: 'Title must be 1-100 characters' })

    const result = await updateVideoMetadata(accessToken, videoId, { title, description, tags, privacyStatus, categoryId, madeForKids, defaultLanguage, recordingDate })
    return res.status(200).json({ success: true, ...result })
  } catch (err: any) {
    const expired = err.message === 'TOKEN_EXPIRED'
    return res.status(expired ? 401 : 500).json({
      error: expired ? 'TOKEN_EXPIRED' : err.message,
    })
  }
}

export default withApiAuth(handler)
