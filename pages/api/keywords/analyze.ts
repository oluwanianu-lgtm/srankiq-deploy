// pages/api/keywords/analyze.ts
// Deep keyword intelligence from real YouTube search data:
// search-result counts, top-10 ranking videos with full stats, engagement,
// freshness, opportunity verdicts, plus AI title suggestions per keyword.
import type { NextApiResponse } from 'next'
import { withApiAuth, AuthedRequest } from '../../../lib/serverAuth'
import { analyzeKeywords, generateTitles } from '../../../services/gemini'
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
function verdictFor(rankingChance: number, volume: string, competition: string) {
  if (rankingChance >= 70 && (volume === 'High' || volume === 'Very High'))
    return { emoji: '🔥', label: 'Golden opportunity', detail: 'High demand and you can realistically rank — prioritize this keyword.' }
  if (rankingChance >= 70)
    return { emoji: '🌱', label: 'Easy win', detail: 'Lower traffic, but very easy to rank — great for building authority.' }
  if (rankingChance >= 45)
    return { emoji: '✅', label: 'Good target', detail: 'Worth pursuing with a strong title and thumbnail.' }
  if (volume === 'Very High' || volume === 'High')
    return { emoji: '⚔️', label: 'Very competitive', detail: 'Big traffic but crowded — you need a unique angle to break in.' }
  return { emoji: '🤔', label: 'Low priority', detail: 'Low traffic and hard to rank — consider a more specific variation.' }
}
function timeAgo(dateStr: string) {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  if (days < 1) return 'today'
  if (days < 30) return `${days}d ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

async function handler(req: AuthedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { keywords, platform } = req.body
    if (!keywords?.length || !platform) return res.status(400).json({ error: 'keywords and platform required' })

    const isYouTube = String(platform).toLowerCase().includes('you')

    if (isYouTube) {
      const capped: string[] = keywords.slice(0, 10)
      const analysis = await Promise.all(capped.map(async (kw) => {
        const [stats, related] = await Promise.all([getKeywordStats(kw), getAutocomplete(kw)])

        const volume = volumeBucket(stats.avgViews)
        const competition = competitionBucket(stats.totalResults)
        const compPenalty = { 'Easy': 0, 'Medium': 20, 'Hard': 40, 'Very Hard': 60 }[competition] || 0
        const recencyBonus = stats.recentTopVideos * 4
        const rankingChance = Math.min(95, Math.max(5, 85 - compPenalty + recencyBonus - 20))
        const freshness = stats.recentTopVideos * 10 // % of top 10 from last 90 days

        const avgMin = Math.round(stats.avgDurationSec / 60)

        return {
          keyword: kw,
          volume,
          avgTopViews: stats.avgViews,
          competition,
          competingVideos: stats.totalResults,
          rankingChance,
          trend: stats.recentTopVideos >= 5 ? 'Rising' : stats.recentTopVideos >= 2 ? 'Stable' : 'Declining',
          freshness,
          avgEngagement: stats.avgEngagement,
          idealLength: avgMin <= 1 ? 'Short (under 60s)' : `~${avgMin} min`,
          verdict: verdictFor(rankingChance, volume, competition),
          related,
          // Tags actually used by the videos ranking right now — proven to rank
          recommendedTags: (() => {
            const freq: Record<string, number> = {}
            stats.topVideos.forEach((v: any) => (v.tags || []).forEach((t: string) => {
              const key = t.toLowerCase().trim()
              if (key.length > 1 && key.length < 40) freq[key] = (freq[key] || 0) + 1
            }))
            return Object.entries(freq)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 15)
              .map(([tag, count]) => ({ tag, usedBy: count }))
          })(),
          topVideos: stats.topVideos.map((v: any) => ({
            ...v, age: timeAgo(v.publishedAt),
          })),
        }
      }))

      // One resilient AI call for title suggestions across all keywords
      let titleIdeas: Record<string, string[]> = {}
      try {
        const result = await generateTitles({
          topic: `videos that could rank for these search terms: ${capped.join('; ')}`,
          platform: 'YouTube', style: 'high click-through, keyword-first', keywords: capped,
        })
        const titles: string[] = result?.titles || []
        capped.forEach((kw, idx) => {
          titleIdeas[kw] = titles.slice(idx * 2, idx * 2 + 2)
        })
      } catch { /* suggestions are a bonus — never fail the request */ }

      return res.status(200).json({
        dataSource: 'youtube-api',
        analysis: analysis.map(a => ({ ...a, titleIdeas: titleIdeas[a.keyword] || [] })),
      })
    }

    const result = await analyzeKeywords({ keywords, platform })
    const normalized = (result?.analysis || []).map((r: any) => ({
      keyword: r.keyword || '', volume: r.volume || 'Medium',
      avgTopViews: 0, competition: r.competition || 'Medium',
      competingVideos: 0, rankingChance: r.rankingChance ?? 50,
      trend: r.trend || 'Stable', freshness: 0, avgEngagement: 0,
      idealLength: '—',
      verdict: { emoji: '🤖', label: 'AI estimate', detail: 'This platform has no public data API yet — figures are AI estimates.' },
      related: r.related || [], topVideos: [], titleIdeas: [],
    }))
    return res.status(200).json({ dataSource: 'ai-estimate', analysis: normalized })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}

export default withApiAuth(handler)
