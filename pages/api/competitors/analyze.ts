// pages/api/competitors/analyze.ts
import type { NextApiRequest, NextApiResponse } from 'next'

const YT_KEY = process.env.YOUTUBE_API_KEY!
const GEMINI_KEY = process.env.GEMINI_API_KEY!

function parseDuration(iso: string): string {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return ''
  const h = parseInt(match[1] || '0')
  const m = parseInt(match[2] || '0')
  const s = parseInt(match[3] || '0')
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatNum(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return `${n}`
}

// SEO score from video metadata
function calcVideoSEOScore(video: any): number {
  let score = 0
  const title = video.snippet?.title || ''
  const desc = video.snippet?.description || ''
  const tags = video.snippet?.tags || []

  // Title scoring (max 30)
  if (title.length >= 40 && title.length <= 70) score += 30
  else if (title.length >= 20) score += 15

  // Description scoring (max 30)
  if (desc.length >= 500) score += 30
  else if (desc.length >= 200) score += 20
  else if (desc.length >= 50) score += 10

  // Tags scoring (max 20)
  if (tags.length >= 10) score += 20
  else score += tags.length * 2

  // Engagement scoring (max 20)
  const views = parseInt(video.statistics?.viewCount || '0')
  const likes = parseInt(video.statistics?.likeCount || '0')
  const ratio = views > 0 ? likes / views : 0
  if (ratio >= 0.05) score += 20
  else if (ratio >= 0.02) score += 12
  else if (ratio >= 0.01) score += 6

  return Math.min(100, score)
}

// Estimate new subscribers in last 28 days from avg view-to-sub conversion
function estimateNewSubs(subs: number, avgViews: number): string {
  // Industry average: ~0.5–2% of viewers subscribe on popular channels
  const conversionRate = subs > 1_000_000 ? 0.005 : subs > 100_000 ? 0.01 : 0.02
  const estimated = Math.round(avgViews * conversionRate * 4) // ~4 videos/month
  return formatNum(estimated)
}

// Estimate revenue from views (YouTube RPM $2-$8 typical)
function estimateRevenue(views: number): string {
  const rpm = 3.5 // conservative average RPM
  const revenue = (views / 1000) * rpm
  if (revenue >= 1000) return `$${(revenue / 1000).toFixed(0)}K–$${((revenue * 2.5) / 1000).toFixed(0)}K`
  return `$${Math.round(revenue)}–$${Math.round(revenue * 2.5)}`
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { channelName, platform, niche } = req.body
  if (!channelName) return res.status(400).json({ error: 'Channel name required' })

  try {
    // Step 1: Search for the channel
    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(channelName)}&type=channel&maxResults=1&key=${YT_KEY}`
    )
    const searchData = await searchRes.json()
    const channelItem = searchData.items?.[0]

    if (!channelItem) {
      return res.status(404).json({ error: 'Channel not found' })
    }

    const channelId = channelItem.id?.channelId || channelItem.snippet?.channelId

    // Step 2: Get full channel details with stats
    const chRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails,brandingSettings&id=${channelId}&key=${YT_KEY}`
    )
    const chData = await chRes.json()
    const channel = chData.items?.[0]

    if (!channel) return res.status(404).json({ error: 'Channel details not found' })

    const stats = channel.statistics
    const subscriberCount = parseInt(stats?.subscriberCount || '0')
    const totalViews = parseInt(stats?.viewCount || '0')
    const videoCount = parseInt(stats?.videoCount || '0')
    const avgViewsPerVideo = videoCount > 0 ? Math.round(totalViews / videoCount) : 0

    // Step 3: Get top 5 most-viewed recent videos
    const videosRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&type=video&order=viewCount&maxResults=5&key=${YT_KEY}`
    )
    const videosData = await videosRes.json()
    const videoItems = videosData.items || []

    let trendingVideos: any[] = []

    if (videoItems.length > 0) {
      const videoIds = videoItems.map((v: any) => v.id?.videoId).filter(Boolean).join(',')

      // Step 4: Get full stats for each video
      const statsRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoIds}&key=${YT_KEY}`
      )
      const statsData = await statsRes.json()

      trendingVideos = (statsData.items || []).slice(0, 5).map((v: any) => {
        const views = parseInt(v.statistics?.viewCount || '0')
        const likes = parseInt(v.statistics?.likeCount || '0')
        const comments = parseInt(v.statistics?.commentCount || '0')
        const seoScore = calcVideoSEOScore(v)

        return {
          id: v.id,
          title: v.snippet?.title,
          thumbnail: v.snippet?.thumbnails?.medium?.url || v.snippet?.thumbnails?.default?.url,
          publishedAt: v.snippet?.publishedAt,
          duration: parseDuration(v.contentDetails?.duration || ''),
          views,
          viewsFormatted: formatNum(views),
          likes,
          likesFormatted: formatNum(likes),
          comments,
          commentsFormatted: formatNum(comments),
          seoScore,
          estimatedRevenue: estimateRevenue(views),
          // Subscriber gain estimate: big videos drive more subs
          estimatedSubsGained: formatNum(Math.round(views * 0.008)),
          url: `https://youtube.com/watch?v=${v.id}`,
          tags: v.snippet?.tags?.slice(0, 5) || [],
        }
      })
    }

    // Step 5: Gemini for content strategy + ranking keywords
    let contentStrategy = ''
    let rankingKeywords: string[] = []
    let strengths: string[] = []
    let opportunities: string[] = []

    try {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Analyze YouTube channel "${channelName}" in the ${niche || 'general'} niche with ${formatNum(subscriberCount)} subscribers. Return JSON only:
{
  "contentStrategy": "2-3 sentence strategy summary",
  "rankingKeywords": ["kw1","kw2","kw3","kw4","kw5","kw6","kw7","kw8","kw9","kw10"],
  "strengths": ["strength1","strength2","strength3"],
  "opportunities": ["opportunity1","opportunity2","opportunity3"]
}`
              }]
            }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 600 },
          }),
        }
      )
      const geminiData = await geminiRes.json()
      const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''
      const start = text.indexOf('{')
      const end = text.lastIndexOf('}')
      if (start !== -1 && end !== -1) {
        const parsed = JSON.parse(text.slice(start, end + 1))
        contentStrategy = parsed.contentStrategy || ''
        rankingKeywords = parsed.rankingKeywords || []
        strengths = parsed.strengths || []
        opportunities = parsed.opportunities || []
      }
    } catch { /* Gemini optional */ }

    // Channel-level SEO score (average of video SEO scores + channel completeness)
    const channelSEOScore = trendingVideos.length > 0
      ? Math.round(trendingVideos.reduce((a, v) => a + v.seoScore, 0) / trendingVideos.length)
      : 65

    const newSubsEstimate = estimateNewSubs(subscriberCount, avgViewsPerVideo)
    const channelRevenueEstimate = estimateRevenue(avgViewsPerVideo * Math.min(videoCount, 12))

    return res.status(200).json({
      name: channel.snippet?.title || channelName,
      platform: 'YouTube',
      channelId,
      thumbnail: channel.snippet?.thumbnails?.medium?.url,
      channelUrl: `https://youtube.com/channel/${channelId}`,
      subscriberCount,
      subscriberCountFormatted: formatNum(subscriberCount),
      totalViews,
      totalViewsFormatted: formatNum(totalViews),
      videoCount,
      avgViewsPerVideo,
      avgViewsFormatted: formatNum(avgViewsPerVideo),
      channelSEOScore,
      newSubsLast28Days: newSubsEstimate,
      estimatedMonthlyRevenue: channelRevenueEstimate,
      contentStrategy,
      rankingKeywords,
      strengths,
      opportunities,
      trendingVideos,
    })
  } catch (err: any) {
    console.error('competitors error:', err)
    return res.status(500).json({ error: 'Analysis failed' })
  }
}
