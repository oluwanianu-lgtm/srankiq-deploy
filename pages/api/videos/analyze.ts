// pages/api/videos/analyze.ts — SEO scan any public video by ID
import type { NextApiResponse } from 'next'
import { withApiAuth, AuthedRequest } from '../../../lib/serverAuth'
import { getVideoDetails } from '../../../services/youtube'
import { analyzeSEO } from '../../../services/gemini'

async function handler(req: AuthedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { videoId } = req.body
    if (!videoId) return res.status(400).json({ error: 'videoId required' })

    const video = await getVideoDetails(videoId)
    if (!video) return res.status(404).json({ error: 'Video not found' })

    const seo = await analyzeSEO({
      title: video.title,
      description: video.description.slice(0, 1500),
      tags: video.tags,
      platform: 'YouTube',
    })

    const engagement = video.views
      ? +(((video.likes + video.comments) / video.views) * 100).toFixed(2) : 0

    return res.status(200).json({
      video: { id: video.id, title: video.title, channel: video.channel,
               views: video.views, engagement, tagCount: video.tags.length },
      seo,
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}

export default withApiAuth(handler)
