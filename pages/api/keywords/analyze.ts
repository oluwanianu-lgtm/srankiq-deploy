// pages/api/keywords/analyze.ts
// YouTube: REAL keyword stats — search result counts, avg views of top
// results, recency of top results, and real autocomplete suggestions.
// Costs zero Gemini tokens for YouTube. Other platforms: AI estimate (labeled).
import type { NextApiResponse } from 'next'
import { withApiAuth, AuthedRequest } from '../../../lib/serverAuth'
import { analyzeKeywords } from '../../../services/gemini'
import { getKeywordStats, getAutocomplete } from '../../../services/youtube'

function volumeBucket(avgViews: number) {
  if (avgViews > 500_000) return 'Very High'
  if (avgViews > 100_000) return 'High'
  if (avgViews > 20_000) return 'Medium'
  return 'Low'
}

function competitionBucket(totalResults: number) {
  if (totalResults > 500_000) return 'Very Hard'
  if (totalResults > 100_000) return 'Hard'
  if (totalResults > 20_000) return 'Medium'
  return 'Easy'
}

async function handler(req: AuthedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { keywords, platform } = req.body
    if (!keywords?.length || !platform) return res.status(400).json({ error: 'keywords and platform required' })

    const isYouTube = String(platform).toLowerCase().includes('you')

    if (isYouTube) {
      const capped: string[] = keywords.slice(0, 5) // protect YouTube API quota
      const analysis = await Promise.all(capped.map(async (kw) => {
        const [stats, related] = await Promise.all([getKeywordStats(kw), getAutocomplete(kw)])

        // Ranking chance: easier competition + fresh top results = higher chance
        const compPenalty = { 'Easy': 0, 'Medium': 20, 'Hard': 40, 'Very Hard': 60 }[competitionBucket(stats.totalResults)] || 0
        const recencyBonus = stats.recentTopVideos * 4 // up to +40 if all top 10 are recent
        const rankingChance = Math.min(95, Math.max(5, 85 - compPenalty + recencyBonus - 20))

        return {
          keyword: kw,
          volume: volumeBucket(stats.avgViews),
          avgTopViews: stats.avgViews,
          competition: competitionBucket(stats.totalResults),
          competingVideos: stats.totalResults,
          rankingChance,
          trend: stats.recentTopVideos >= 5 ? 'Rising' : stats.recentTopVideos >= 2 ? 'Stable' : 'Declining',
          related,
        }
      }))

      return res.status(200).json({ dataSource: 'youtube-api', analysis })
    }

    // Non-YouTube — AI estimate, labeled
    const result = await analyzeKeywords({ keywords, platform })
    return res.status(200).json({ dataSource: 'ai-estimate', ...result })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}

export default withApiAuth(handler)
