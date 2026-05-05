// pages/api/trends/index.ts
import type { NextApiRequest, NextApiResponse } from 'next'

const GEMINI_KEY = process.env.GEMINI_API_KEY!

// Correct YouTube category IDs
const CATEGORY_MAP: Record<string, string> = {
  'Gaming': '20',
  'Music': '10',
  'Tech': '28',
  'Sports': '17',
  'News': '25',
  'Education': '27',
  'Entertainment': '24',
  'Comedy': '23',
  'Film': '1',
  'Fashion': '26',
  'Science': '28',  // Science uses Tech category (28)
  'Food': '26',
  'Travel': '19',
  'Finance': '24',
  'Fitness': '17',
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { platform, category, niche } = req.query

  try {
    if (platform === 'YouTube' || !platform) {
      const ytKey = process.env.YOUTUBE_API_KEY!

      const catId = (category && category !== 'All') ? CATEGORY_MAP[category as string] : null

      // Try with category first, fallback to no category if empty
      const fetchTrends = async (withCategory: boolean) => {
        let url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=US&maxResults=20&key=${ytKey}`
        if (withCategory && catId) url += `&videoCategoryId=${catId}`
        const r = await fetch(url)
        const d = await r.json()
        return d.items || []
      }

      let items = await fetchTrends(true)

      // If category returned nothing, fallback to all trending
      if (!items.length && catId) {
        items = await fetchTrends(false)
      }

      if (!items.length) {
        return res.status(200).json({ trends: [], summary: 'No trends found right now. Try again in a moment.' })
      }

      // Filter by niche keyword if provided
      if (niche && typeof niche === 'string' && niche.trim()) {
        const nicheL = niche.toLowerCase()
        const filtered = items.filter((item: any) =>
          item.snippet?.title?.toLowerCase().includes(nicheL) ||
          item.snippet?.description?.toLowerCase().includes(nicheL) ||
          (item.snippet?.tags || []).some((t: string) => t.toLowerCase().includes(nicheL))
        )
        // Only apply niche filter if we have enough results
        if (filtered.length >= 2) items = filtered
      }

      const trends = items.map((item: any) => {
        const views = parseInt(item.statistics?.viewCount || '0')
        const likes = parseInt(item.statistics?.likeCount || '0')
        const comments = parseInt(item.statistics?.commentCount || '0')
        return {
          topic: item.snippet.title,
          category: item.snippet.channelTitle,
          viralityScore: Math.min(99, Math.max(10, Math.floor(views / 200000))),
          growth: `${(views / 1000).toFixed(0)}K views`,
          viewCount: views,
          likes,
          comments,
          engagement: views > 0 ? `${((likes / views) * 100).toFixed(1)}%` : '0%',
          contentIdea: `Create a video inspired by: ${item.snippet.title}`,
          format: 'Video',
          thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
          channelName: item.snippet.channelTitle,
          videoId: item.id,
          videoUrl: `https://youtube.com/watch?v=${item.id}`,
          publishedAt: item.snippet.publishedAt,
        }
      })

      const summary = catId
        ? `Top trending ${category} videos on YouTube`
        : niche
        ? `Top YouTube videos related to "${niche}"`
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
              text: `List 8 trending content topics on ${platform} right now in ${category || 'general'} niche${niche ? ` related to ${niche}` : ''}. Return JSON only, no markdown:
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
