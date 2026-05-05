// pages/api/trends/index.ts
import type { NextApiRequest, NextApiResponse } from 'next'

const GEMINI_KEY = process.env.GEMINI_API_KEY!

// Use YouTube SEARCH for every category — much more accurate than category IDs
// Category IDs on YouTube are unreliable and return wrong content
const CATEGORY_KEYWORDS: Record<string, string> = {
  'Gaming': 'gaming gameplay video game playthrough 2025',
  'Music': 'music video song official 2025',
  'Tech': 'technology gadgets AI phone review 2025',
  'Sports': 'sports highlights football basketball 2025',
  'News': 'news today breaking news 2025',
  'Education': 'how to learn tutorial educational 2025',
  'Entertainment': 'entertainment funny viral trending 2025',
  'Comedy': 'comedy funny video sketch humor 2025',
  'Film': 'movie film trailer review 2025',
  'Fashion': 'fashion style outfit lookbook clothing 2025',
  'Science': 'science experiment facts discovery 2025',
  'Food': 'food cooking recipe restaurant 2025',
  'Travel': 'travel vlog destination adventure 2025',
  'Finance': 'finance money investing stocks crypto 2025',
  'Fitness': 'fitness workout gym exercise training 2025',
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { platform, category, niche } = req.query
  const cat = (category as string) || 'All'
  const nicheStr = (niche as string) || ''

  try {
    if (platform === 'YouTube' || !platform) {
      const ytKey = process.env.YOUTUBE_API_KEY!
      let items: any[] = []

      if (cat === 'All' && !nicheStr) {
        // General trending — use mostPopular chart
        const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=US&maxResults=20&key=${ytKey}`
        const r = await fetch(url)
        const d = await r.json()
        items = d.items || []
      } else {
        // Use SEARCH for specific categories — much more accurate
        const searchQuery = nicheStr || CATEGORY_KEYWORDS[cat] || cat
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&order=viewCount&maxResults=20&regionCode=US&publishedAfter=${getDateMonthsAgo(6)}&key=${ytKey}`
        const r = await fetch(searchUrl)
        const d = await r.json()
        const searchItems = d.items || []

        if (searchItems.length > 0) {
          const videoIds = searchItems.map((it: any) => it.id?.videoId).filter(Boolean).join(',')
          if (videoIds) {
            const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoIds}&key=${ytKey}`
            const sr = await fetch(statsUrl)
            const sd = await sr.json()
            items = sd.items || []
          }
        }

        // Fallback if search returned nothing
        if (!items.length) {
          const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=US&maxResults=20&key=${ytKey}`
          const r = await fetch(url)
          const d = await r.json()
          items = d.items || []
        }
      }

      const trends = items.map((item: any) => {
        const views = parseInt(item.statistics?.viewCount || '0')
        const likes = parseInt(item.statistics?.likeCount || '0')
        const comments = parseInt(item.statistics?.commentCount || '0')
        const id = item.id?.videoId || item.id
        return {
          topic: item.snippet?.title,
          category: item.snippet?.channelTitle,
          viralityScore: Math.min(99, Math.max(5, Math.floor(views / 200000))),
          growth: `${(views / 1000).toFixed(0)}K views`,
          viewCount: views,
          likes,
          comments,
          engagement: views > 0 ? `${((likes / views) * 100).toFixed(1)}%` : '0%',
          contentIdea: `Create a video inspired by: ${item.snippet?.title}`,
          format: 'Video',
          thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url,
          channelName: item.snippet?.channelTitle,
          videoId: id,
          videoUrl: `https://youtube.com/watch?v=${id}`,
          publishedAt: item.snippet?.publishedAt,
        }
      })

      const summary = cat !== 'All'
        ? `Top trending ${cat} videos on YouTube`
        : nicheStr
        ? `Top YouTube videos related to "${nicheStr}"`
        : 'Top trending videos on YouTube right now'

      return res.status(200).json({ trends, summary })
    }

    // Non-YouTube: Gemini
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `List 8 trending content topics on ${platform} right now in ${cat || 'general'} niche${nicheStr ? ` related to ${nicheStr}` : ''}. Return JSON array only, no markdown:
[{"topic":"title","category":"niche","viralityScore":85,"growth":"+2.3M views","contentIdea":"Create content about...","format":"Reel","thumbnail":null,"videoUrl":null}]`
            }]
          }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 800 },
        }),
      }
    )
    const gData = await geminiRes.json()
    const text = (gData.candidates?.[0]?.content?.parts?.[0]?.text || '[]')
      .replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim()
    const s = text.indexOf('['), e = text.lastIndexOf(']')
    if (s === -1) return res.status(200).json({ trends: [], summary: 'No trends found.' })
    const trends = JSON.parse(text.slice(s, e + 1))
    return res.status(200).json({ trends, summary: `Trending on ${platform}` })
  } catch (err: any) {
    console.error('trends error:', err)
    return res.status(500).json({ error: err.message, trends: [] })
  }
}

function getDateMonthsAgo(months: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() - months)
  return d.toISOString()
}
