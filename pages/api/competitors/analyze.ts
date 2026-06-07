// pages/api/competitors/analyze.ts
// YouTube: REAL data from YouTube Data API + Gemini for strategy insights only.
// Other platforms: AI estimate (clearly labeled) until their APIs are connected.
import type { NextApiResponse } from 'next'
import { withApiAuth, AuthedRequest } from '../../../lib/serverAuth'
import { analyzeCompetitor, generateCompetitorInsights } from '../../../services/gemini'
import { resolveChannel, getPublicChannelVideos } from '../../../services/youtube'

async function handler(req: AuthedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { channelName, platform, niche } = req.body
    if (!channelName || !platform) return res.status(400).json({ error: 'channelName and platform required' })

    const isYouTube = String(platform).toLowerCase().includes('you')

    if (isYouTube) {
      const channel = await resolveChannel(channelName)
      if (!channel) return res.status(404).json({ error: `No YouTube channel found for "${channelName}"` })

      const videos = await getPublicChannelVideos(channel.id, 15)

      // Real computed metrics
      const avgViews = videos.length
        ? Math.round(videos.reduce((s, v) => s + v.views, 0) / videos.length) : 0
      const engagementVals = videos
        .filter(v => v.views > 0)
        .map(v => ((v.likes + v.comments) / v.views) * 100)
      const engagementRate = engagementVals.length
        ? (engagementVals.reduce((a, b) => a + b, 0) / engagementVals.length).toFixed(2) + '%' : 'N/A'

      let postingFrequency = 'N/A'
      if (videos.length >= 2) {
        const newest = new Date(videos[0].publishedAt).getTime()
        const oldest = new Date(videos[videos.length - 1].publishedAt).getTime()
        const weeks = Math.max(0.5, (newest - oldest) / (7 * 24 * 3600 * 1000))
        postingFrequency = `~${(videos.length / weeks).toFixed(1)} videos/week`
      }

      const allTags = videos.flatMap(v => v.tags)
      let insights: any = {
        contentStrategy: '', topContentTypes: [], rankingKeywords: [],
        strengths: [], weaknesses: [], opportunities: [],
      }
      try {
        insights = await generateCompetitorInsights({
        name: channel.name,
        subscribers: channel.subscribers,
        avgViews,
        engagementRate,
        postingFrequency,
        recentTitles: videos.map(v => v.title).slice(0, 10),
        topTags: Array.from(new Set(allTags)),
        niche: niche || 'general',
        })
      } catch (e) {
        console.error('Competitor insights failed (returning real data anyway):', e)
      }

      return res.status(200).json({
        dataSource: 'youtube-api', // REAL data
        name: channel.name,
        platform: 'YouTube',
        thumbnail: channel.thumbnail,
        estimatedSubscribers: channel.subscribers.toLocaleString(),
        totalViews: channel.views.toLocaleString(),
        videoCount: channel.videoCount,
        avgViews: avgViews.toLocaleString(),
        engagementRate,
        postingFrequency,
        recentVideos: videos.map(v => {
          const days = Math.floor((Date.now() - new Date(v.publishedAt).getTime()) / 86400000)
          const age = days < 1 ? 'today' : days < 30 ? `${days}d ago` : days < 365 ? `${Math.floor(days / 30)}mo ago` : `${Math.floor(days / 365)}y ago`
          return { id: v.id, title: v.title, views: v.views, likes: v.likes,
                   thumbnail: (v as any).thumbnail, url: (v as any).url, age }
        }),
        channelId: channel.id,
        niche: niche || 'general',
        ...insights,
      })
    }

    // Non-YouTube platforms — AI estimate, labeled as such
    const result = await analyzeCompetitor({ channelName, platform, niche: niche || 'general' })
    return res.status(200).json({ dataSource: 'ai-estimate', ...result })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}

export default withApiAuth(handler)
