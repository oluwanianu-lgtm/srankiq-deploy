// pages/api/competitors/analyze.ts
import type { NextApiRequest, NextApiResponse } from 'next'

const YT_KEY = process.env.YOUTUBE_API_KEY!
const GEMINI_KEY = process.env.GEMINI_API_KEY!

function parseDuration(iso: string): string {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return ''
  const h = parseInt(match[1] || '0'), m = parseInt(match[2] || '0'), s = parseInt(match[3] || '0')
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${m}:${String(s).padStart(2,'0')}`
}

function formatNum(n: number): string {
  if (n >= 1e9) return `${(n/1e9).toFixed(1)}B`
  if (n >= 1e6) return `${(n/1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n/1e3).toFixed(1)}K`
  return `${n}`
}

function calcVideoSEOScore(video: any): number {
  let score = 0
  const title = video.snippet?.title || ''
  const desc = video.snippet?.description || ''
  const tags = video.snippet?.tags || []
  if (title.length >= 40 && title.length <= 70) score += 30
  else if (title.length >= 20) score += 15
  if (desc.length >= 500) score += 30
  else if (desc.length >= 200) score += 20
  else if (desc.length >= 50) score += 10
  if (tags.length >= 10) score += 20
  else score += tags.length * 2
  const views = parseInt(video.statistics?.viewCount || '0')
  const likes = parseInt(video.statistics?.likeCount || '0')
  const ratio = views > 0 ? likes / views : 0
  if (ratio >= 0.05) score += 20
  else if (ratio >= 0.02) score += 12
  else if (ratio >= 0.01) score += 6
  return Math.min(100, score)
}

function estimateNewSubs(subs: number, avgViews: number): string {
  const rate = subs > 1_000_000 ? 0.005 : subs > 100_000 ? 0.01 : 0.02
  return formatNum(Math.round(avgViews * rate * 4))
}

function estimateRevenue(views: number): string {
  const rev = (views / 1000) * 3.5
  if (rev >= 1000) return `$${(rev/1000).toFixed(0)}K–$${((rev*2.5)/1000).toFixed(0)}K`
  return `$${Math.round(rev)}–$${Math.round(rev*2.5)}`
}

async function findChannelId(name: string): Promise<string | null> {
  // Strategy 1: search by channel type
  const clean = name.replace(/^@/, '').trim()
  
  // Try forHandle first (works for @handles)
  const handleRes = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=id,snippet&forHandle=${encodeURIComponent(clean)}&key=${YT_KEY}`
  )
  const handleData = await handleRes.json()
  if (handleData.items?.[0]?.id) return handleData.items[0].id

  // Try forUsername
  const userRes = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=id,snippet&forUsername=${encodeURIComponent(clean)}&key=${YT_KEY}`
  )
  const userData = await userRes.json()
  if (userData.items?.[0]?.id) return userData.items[0].id

  // Try search
  const searchRes = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(clean)}&type=channel&maxResults=3&key=${YT_KEY}`
  )
  const searchData = await searchRes.json()
  
  if (searchData.items?.length > 0) {
    // Pick the best match — prefer exact title match
    const exact = searchData.items.find((it: any) =>
      it.snippet?.channelTitle?.toLowerCase() === clean.toLowerCase()
    )
    const item = exact || searchData.items[0]
    return item.id?.channelId || item.snippet?.channelId || null
  }

  return null
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { channelName, platform, niche } = req.body
  if (!channelName) return res.status(400).json({ error: 'Channel name required' })

  try {
    const channelId = await findChannelId(channelName)

    if (!channelId) {
      return res.status(404).json({ error: `Channel "${channelName}" not found. Try the exact channel name or @handle.` })
    }

    // Get full channel details
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

    // Get top 5 most-viewed videos
    const videosRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&type=video&order=viewCount&maxResults=5&key=${YT_KEY}`
    )
    const videosData = await videosRes.json()
    const videoItems = videosData.items || []

    let trendingVideos: any[] = []

    if (videoItems.length > 0) {
      const videoIds = videoItems.map((v: any) => v.id?.videoId).filter(Boolean).join(',')
      const statsRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoIds}&key=${YT_KEY}`
      )
      const statsData = await statsRes.json()

      trendingVideos = (statsData.items || []).slice(0, 5).map((v: any) => {
        const views = parseInt(v.statistics?.viewCount || '0')
        const likes = parseInt(v.statistics?.likeCount || '0')
        const comments = parseInt(v.statistics?.commentCount || '0')
        return {
          id: v.id,
          title: v.snippet?.title,
          thumbnail: v.snippet?.thumbnails?.medium?.url || v.snippet?.thumbnails?.default?.url,
          publishedAt: v.snippet?.publishedAt,
          duration: parseDuration(v.contentDetails?.duration || ''),
          views, viewsFormatted: formatNum(views),
          likes, likesFormatted: formatNum(likes),
          comments, commentsFormatted: formatNum(comments),
          seoScore: calcVideoSEOScore(v),
          estimatedRevenue: estimateRevenue(views),
          estimatedSubsGained: formatNum(Math.round(views * 0.008)),
          url: `https://youtube.com/watch?v=${v.id}`,
          tags: v.snippet?.tags?.slice(0, 5) || [],
        }
      })
    }

    // Gemini analysis
    let contentStrategy = '', rankingKeywords: string[] = [], strengths: string[] = [], opportunities: string[] = []
    try {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Analyze YouTube channel "${channel.snippet?.title || channelName}" in the ${niche || 'general'} niche with ${formatNum(subscriberCount)} subscribers. Return JSON only:
{"contentStrategy":"2-3 sentence strategy","rankingKeywords":["kw1","kw2","kw3","kw4","kw5","kw6","kw7","kw8","kw9","kw10"],"strengths":["s1","s2","s3"],"opportunities":["o1","o2","o3"]}` }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 600 },
          }),
        }
      )
      const gd = await geminiRes.json()
      const text = gd.candidates?.[0]?.content?.parts?.[0]?.text || ''
      const s = text.indexOf('{'), e = text.lastIndexOf('}')
      if (s !== -1 && e !== -1) {
        const parsed = JSON.parse(text.slice(s, e + 1))
        contentStrategy = parsed.contentStrategy || ''
        rankingKeywords = parsed.rankingKeywords || []
        strengths = parsed.strengths || []
        opportunities = parsed.opportunities || []
      }
    } catch { /* optional */ }

    const channelSEOScore = trendingVideos.length > 0
      ? Math.round(trendingVideos.reduce((a, v) => a + v.seoScore, 0) / trendingVideos.length) : 65

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
      newSubsLast28Days: estimateNewSubs(subscriberCount, avgViewsPerVideo),
      estimatedMonthlyRevenue: estimateRevenue(avgViewsPerVideo * Math.min(videoCount, 12)),
      contentStrategy, rankingKeywords, strengths, opportunities, trendingVideos,
    })
  } catch (err: any) {
    console.error('competitors error:', err)
    return res.status(500).json({ error: 'Analysis failed. Please try again.' })
  }
}
