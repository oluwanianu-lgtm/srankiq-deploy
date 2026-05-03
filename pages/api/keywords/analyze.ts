// pages/api/keywords/analyze.ts
import type { NextApiRequest, NextApiResponse } from 'next'

const YT_KEY = process.env.YOUTUBE_API_KEY!
const GEMINI_KEY = process.env.GEMINI_API_KEY!

// Fetch YouTube search suggestions via the internal suggest API
async function getYouTubeSuggestions(keyword: string): Promise<string[]> {
  try {
    const url = `https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&q=${encodeURIComponent(keyword)}&hl=en`
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    const text = await res.text()
    // Response format: window.google.ac.h(["keyword",[["suggestion1",...],["suggestion2",...],...]])
    const match = text.match(/\[\[.*\]\]/)
    if (!match) return []
    const parsed = JSON.parse(match[0])
    return parsed.slice(0, 15).map((item: any[]) => item[0] as string).filter(s => s && s !== keyword)
  } catch {
    return []
  }
}

// Get video count for a keyword (proxy for search volume)
async function getVideoCount(keyword: string): Promise<number> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=id&q=${encodeURIComponent(keyword)}&type=video&maxResults=1&key=${YT_KEY}`
    )
    const data = await res.json()
    return data.pageInfo?.totalResults || 0
  } catch {
    return 0
  }
}

// Get top channels for a keyword with real subscriber counts
async function getTopChannels(keyword: string): Promise<any[]> {
  try {
    // Search for top videos with this keyword
    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(keyword)}&type=video&order=viewCount&maxResults=5&key=${YT_KEY}`
    )
    const searchData = await searchRes.json()
    const items = searchData.items || []

    if (!items.length) return []

    // Get unique channel IDs
    const channelIds = [...new Set(items.map((it: any) => it.snippet?.channelId).filter(Boolean))] as string[]

    // Fetch channel stats
    const chRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelIds.join(',')}&key=${YT_KEY}`
    )
    const chData = await chRes.json()

    return (chData.items || []).map((ch: any) => ({
      channelId: ch.id,
      channelTitle: ch.snippet?.title,
      thumbnail: ch.snippet?.thumbnails?.default?.url,
      subscriberCount: parseInt(ch.statistics?.subscriberCount || '0'),
      videoCount: parseInt(ch.statistics?.videoCount || '0'),
      viewCount: parseInt(ch.statistics?.viewCount || '0'),
      url: `https://youtube.com/channel/${ch.id}`,
    }))
  } catch {
    return []
  }
}

function classifyVolume(count: number): string {
  if (count >= 500000) return 'Very High'
  if (count >= 100000) return 'High'
  if (count >= 20000) return 'Medium'
  return 'Low'
}

function classifyCompetition(count: number): string {
  if (count >= 500000) return 'Hard'
  if (count >= 100000) return 'Medium'
  return 'Easy'
}

function calcRankingChance(count: number): number {
  // Fewer competing videos = higher ranking chance
  if (count < 1000) return Math.floor(Math.random() * 20 + 75)   // 75-95
  if (count < 10000) return Math.floor(Math.random() * 20 + 55)  // 55-75
  if (count < 100000) return Math.floor(Math.random() * 20 + 35) // 35-55
  if (count < 500000) return Math.floor(Math.random() * 15 + 20) // 20-35
  return Math.floor(Math.random() * 15 + 5)                       // 5-20
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { keywords, platform } = req.body
  if (!keywords?.length) return res.status(400).json({ error: 'Keywords required' })

  // Limit to 5 keywords max
  const kwList: string[] = (keywords as string[]).slice(0, 5)

  try {
    const analysis: any[] = []
    const allTopChannels: any[] = []

    for (const kw of kwList) {
      // Run in parallel: suggestions + video count + top channels
      const [suggestions, videoCount, topChannels] = await Promise.all([
        getYouTubeSuggestions(kw),
        getVideoCount(kw),
        getTopChannels(kw),
      ])

      // Pick up to 3 related from suggestions for this keyword
      const related = suggestions.slice(0, 5)

      // Determine trend using Gemini for context
      let trend = 'Stable'
      try {
        const trendRes = await fetch(
          `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `Is the YouTube keyword "${kw}" trending Rising, Stable, or Declining right now in 2025? Reply with exactly one word: Rising, Stable, or Declining` }] }],
              generationConfig: { temperature: 0.3, maxOutputTokens: 10 },
            }),
          }
        )
        const trendData = await trendRes.json()
        const trendText = trendData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''
        if (trendText.includes('Rising')) trend = 'Rising'
        else if (trendText.includes('Declining')) trend = 'Declining'
        else trend = 'Stable'
      } catch { /* keep Stable */ }

      analysis.push({
        keyword: kw,
        videoCount,
        volume: classifyVolume(videoCount),
        competition: classifyCompetition(videoCount),
        rankingChance: calcRankingChance(videoCount),
        trend,
        related,
      })

      // Collect top channels, dedup by channelId
      for (const ch of topChannels) {
        if (!allTopChannels.find(c => c.channelId === ch.channelId)) {
          allTopChannels.push({ ...ch, keyword: kw })
        }
      }
    }

    // Now expand the related keywords into full 15 keywords per input keyword
    // We fetch suggestions for each input keyword and deduplicate
    const expandedKeywords: any[] = []
    for (const kw of kwList) {
      const suggestions = await getYouTubeSuggestions(kw)
      for (const s of suggestions) {
        if (!expandedKeywords.find(e => e.keyword === s) && s !== kw) {
          const vc = await getVideoCount(s)
          expandedKeywords.push({
            keyword: s,
            videoCount: vc,
            volume: classifyVolume(vc),
            competition: classifyCompetition(vc),
            rankingChance: calcRankingChance(vc),
            trend: 'Stable',
            related: [],
          })
        }
        if (expandedKeywords.length >= 15) break
      }
      if (expandedKeywords.length >= 15) break
    }

    return res.status(200).json({
      analysis,
      relatedKeywords: expandedKeywords.slice(0, 15),
      topChannels: allTopChannels.slice(0, 8),
    })
  } catch (err: any) {
    console.error('keywords error:', err)
    return res.status(500).json({ error: 'Keyword analysis failed' })
  }
}
