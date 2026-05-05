// pages/api/trends/index.ts
import type { NextApiRequest, NextApiResponse } from 'next'

const GEMINI_KEY = process.env.GEMINI_API_KEY!

// YouTube category IDs - only use for categories with accurate YouTube mapping
const YT_CATEGORY_ID: Record<string, string> = {
  'Gaming': '20',
  'Music': '10',
  'Sports': '17',
  'News': '25',
  'Education': '27',
  'Entertainment': '24',
  'Comedy': '23',
  'Film': '1',
  'Travel': '19',
}

// For these categories, use keyword search instead of category ID
// because YouTube category IDs don't match well
const KEYWORD_SEARCH: Record<string, string> = {
  'Tech': 'technology gadgets AI software',
  'Fashion': 'fashion style outfit clothing',
  'Science': 'science experiment discovery research',
  'Food': 'food cooking recipe chef',
  'Fitness': 'fitness workout gym exercise',
  'Finance': 'money finance investing stock market',
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { platform, category, niche } = req.query
  const cat = category as string || 'All'
  const nicheStr = niche as string || ''

  try {
    if (platform === 'YouTube' || !platform) {
      const ytKey = process.env.YOUTUBE_API_KEY!

      // Decide fetch strategy
      const catId = (cat && cat !== 'All') ? YT_CATEGORY_ID[cat] : null
      const kwSearch = (cat && cat !== 'All') ? KEYWORD_SEARCH[cat] : null

      let items: any[] = []

      if (catId) {
        // Use YouTube category ID
        const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=US&maxResults=20&videoCategoryId=${catId}&key=${ytKey}`
        const r = await fetch(url)
        const d = await r.json()
        items = d.items || []
      } else if (kwSearch || nicheStr) {
        // Use search API with keyword for better niche matching
        const searchQuery = nicheStr || kwSearch || ''
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&order=viewCount&maxResults=20&regionCode=US&key=${ytKey}`
        const r = await fetch(searchUrl)
        const d = await r.json()
        const searchItems = d.items || []

        if (searchItems.length > 0) {
          const videoIds = searchItems.map((it: any) => it.id?.videoId).filter(Boolean).join(',')
          const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoIds}&key=${ytKey}`
          const sr = await fetch(statsUrl)
          const sd = await sr.json()
          items = sd.items || []
        }
      } else {
        // All categories — most popular overall
        const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=US&maxResults=20&key=${ytKey}`
        const r = await fetch(url)
        const d = await r.json()
        items = d.items || []
      }

      // Apply niche keyword filter on top of results
      if (nicheStr && items.length > 0) {
        const nicheL = nicheStr.toLowerCase()
        const filtered = items.filter((item: any) =>
          item.snippet?.title?.toLowerCase().includes(nicheL) ||
          item.snippet?.description?.toLowerCase().includes(nicheL) ||
          (item.snippet?.tags || []).some((t: string) => t.toLowerCase().includes(nicheL))
        )
        if (filtered.length >= 3) items = filtered
      }

      // Fallback if still empty
      if (!items.length) {
        const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=US&maxResults=20&key=${ytKey}`
        const r = await fetch(url)
        const d = await r.json()
        items = d.items || []
      }

      const trends = items.map((item: any) => {
        const views = parseInt(item.statistics?.viewCount || '0')
        const likes = parseInt(item.statistics?.likeCount || '0')
        const comments = parseInt(item.statistics?.commentCount || '0')
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
          videoId: item.id?.videoId || item.id,
          videoUrl: `https://youtube.com/watch?v=${item.id?.videoId || item.id}`,
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
              text: `List 8 trending content topics on ${platform} right now in ${cat || 'general'} niche${nicheStr ? ` related to ${nicheStr}` : ''}. Return JSON only, no markdown:
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
