import type { NextApiRequest, NextApiResponse } from 'next'
import { analyzeTrends } from '../../../services/gemini'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { platform } = req.query
    if (!platform) return res.status(400).json({ error: 'platform required' })
    
    // For YouTube, fetch real trending videos
    if (platform === 'YouTube') {
      const ytKey = process.env.YOUTUBE_API_KEY
      const ytRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=US&maxResults=10&key=${ytKey}`
      )
      const ytData = await ytRes.json()
      
      if (ytData.items && ytData.items.length > 0) {
        const trends = ytData.items.map((item: any) => ({
          topic: item.snippet.title,
          category: item.snippet.categoryId,
          viralityScore: Math.min(99, Math.floor(parseInt(item.statistics.viewCount || '0') / 100000)),
          growth: `${Number(item.statistics.viewCount || 0).toLocaleString()} views`,
          contentIdea: `Create content similar to: ${item.snippet.title}`,
          format: 'Video',
          thumbnail: item.snippet.thumbnails?.medium?.url,
          channelName: item.snippet.channelTitle,
          videoId: item.id,
        }))
        return res.status(200).json({ trends, summary: 'Real trending videos from YouTube' })
      }
    }
    
    // Fallback to Gemini AI for other platforms
    const result = await analyzeTrends(platform as string)
    return res.status(200).json(result)
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
