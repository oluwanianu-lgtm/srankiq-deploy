// pages/api/trends/index.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { analyzeTrends } from '../../../services/gemini'

// YouTube category IDs
const CATEGORY_MAP: Record<string, string> = {
  'Gaming': '20',
  'Music': '10',
  'Tech': '28',
  'Sports': '17',
  'News': '25',
  'Education': '27',
  'Entertainment': '24',
  'Finance': '24',
  'Fitness': '17',
  'Food': '26',
  'Travel': '19',
  'Comedy': '23',
  'Film': '1',
  'Fashion': '26',
  'Science': '28',
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { platform, category, niche } = req.query

    if (platform === 'YouTube') {
      const ytKey = process.env.YOUTUBE_API_KEY
      
      // Build URL — add category if selected
      let url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=US&maxResults=12&key=${ytKey}`
      
      const catId = category ? CATEGORY_MAP[category as string] : null
      if (catId) url += `&videoCategoryId=${catId}`

      const ytRes = await fetch(url)
      const ytData = await ytRes.json()

      if (ytData.items?.length > 0) {
        let items = ytData.items

        // If niche keyword filter provided, filter results
        if (niche && typeof niche === 'string' && niche.trim()) {
          const nicheL = niche.toLowerCase()
          const filtered = items.filter((item: any) =>
            item.snippet?.title?.toLowerCase().includes(nicheL) ||
            item.snippet?.description?.toLowerCase().includes(nicheL) ||
            item.snippet?.tags?.some((t: string) => t.toLowerCase().includes(nicheL))
          )
          if (filtered.length >= 3) items = filtered
          // else keep unfiltered — no results would be worse
        }

        const trends = items.map((item: any) => {
          const views = parseInt(item.statistics?.viewCount || '0')
          return {
            topic: item.snippet.title,
            category: item.snippet.channelTitle,
            viralityScore: Math.min(99, Math.max(1, Math.floor(views / 500000))),
            growth: `${views.toLocaleString()} views`,
            viewCount: views,
            contentIdea: `Create content inspired by: ${item.snippet.title}`,
            format: 'Video',
            thumbnail: item.snippet.thumbnails?.medium?.url,
            channelName: item.snippet.channelTitle,
            videoId: item.id,
            videoUrl: `https://youtube.com/watch?v=${item.id}`,
          }
        })

        const summaryText = category
          ? `Top trending ${category} videos right now`
          : niche
          ? `Top trending videos related to "${niche}"`
          : 'Top trending videos right now'

        return res.status(200).json({ trends, summary: summaryText })
      }
    }

    // Other platforms — Gemini AI
    const result = await analyzeTrends(platform as string)
    return res.status(200).json(result)
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
