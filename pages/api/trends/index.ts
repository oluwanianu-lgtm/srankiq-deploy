// pages/api/trends/index.ts
// YouTube: real trending videos by region, paginated (pageToken).
// Other platforms: AI-generated ideas (no public trend APIs yet).
import type { NextApiResponse } from 'next'
import { withApiAuth, AuthedRequest } from '../../../lib/serverAuth'
import { analyzeTrends } from '../../../services/gemini'
import { getTrendingVideos, searchTrendingByCategory, searchTopVideos } from '../../../services/youtube'

function formatNum(n: number) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return String(n)
}

async function handler(req: AuthedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { platform, region, pageToken, category, q } = req.query
    if (!platform) return res.status(400).json({ error: 'platform required' })

    const isYouTube = String(platform).toLowerCase().includes('you')

    if (isYouTube) {
      const useCategory = category && category !== 'All'
      const { videos, nextPageToken } = q
        ? await searchTopVideos(
            q as string, (region as string) || 'US', (pageToken as string) || undefined)
        : useCategory
        ? await searchTrendingByCategory(
            category as string, (region as string) || 'US', (pageToken as string) || undefined)
        : await getTrendingVideos(
            (region as string) || 'US', 24, (pageToken as string) || undefined)
      const maxVpd = Math.max(...videos.map((v: any) => v.viewsPerDay), 1)

      const trends = videos.map((v: any) => ({
        topic: v.title,
        channel: v.channel,
        category: v.category,
        thumbnail: v.thumbnail,
        viralityScore: Math.max(40, Math.round((v.viewsPerDay / maxVpd) * 100)),
        growth: `${formatNum(v.viewsPerDay)} views/day`,
        totalViews: formatNum(v.views),
        contentIdea: `Put your own spin on this for your niche — it's pulling ${formatNum(v.viewsPerDay)} views/day right now`,
        format: v.isShort ? 'Short video' : 'Long video',
        videoUrl: `https://youtube.com/watch?v=${v.id}`,
      }))

      return res.status(200).json({
        dataSource: 'youtube-api',
        trends,
        nextPageToken,
        summary: '',
      })
    }

    const result = await analyzeTrends(platform as string)
    return res.status(200).json({ dataSource: 'ai-estimate', nextPageToken: null, ...result })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}

export default withApiAuth(handler)
