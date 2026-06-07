// pages/api/trends/index.ts
// YouTube: REAL trending videos from YouTube Data API (by region).
// Other platforms: AI estimate (labeled) until their APIs are connected.
import type { NextApiResponse } from 'next'
import { withApiAuth, AuthedRequest } from '../../../lib/serverAuth'
import { analyzeTrends } from '../../../services/gemini'
import { getTrendingVideos } from '../../../services/youtube'

function formatNum(n: number) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return String(n)
}

async function handler(req: AuthedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { platform, region } = req.query
    if (!platform) return res.status(400).json({ error: 'platform required' })

    const isYouTube = String(platform).toLowerCase().includes('you')

    if (isYouTube) {
      const videos = await getTrendingVideos((region as string) || 'US', 12)
      const maxVpd = Math.max(...videos.map(v => v.viewsPerDay), 1)

      const trends = videos.map(v => ({
        topic: v.title.length > 80 ? v.title.slice(0, 77) + '…' : v.title,
        channel: v.channel,
        category: v.category,
        viralityScore: Math.max(40, Math.round((v.viewsPerDay / maxVpd) * 100)),
        growth: `${formatNum(v.viewsPerDay)} views/day`,
        totalViews: formatNum(v.views),
        contentIdea: `Create your own take on this for your niche — it's pulling ${formatNum(v.viewsPerDay)} views/day right now`,
        format: v.isShort ? 'Short video' : 'Long video',
        videoUrl: `https://youtube.com/watch?v=${v.id}`,
      }))

      return res.status(200).json({
        dataSource: 'youtube-api', // REAL data
        trends,
        summary: `Live trending videos on YouTube (${(region as string) || 'US'}) right now, ranked by view velocity.`,
      })
    }

    // Non-YouTube — AI estimate, labeled
    const result = await analyzeTrends(platform as string)
    return res.status(200).json({ dataSource: 'ai-estimate', ...result })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}

export default withApiAuth(handler)
