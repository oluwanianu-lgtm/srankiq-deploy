// pages/api/keywords/analyze.ts
import type { NextApiRequest, NextApiResponse } from 'next'

const YT_KEY = process.env.YOUTUBE_API_KEY!
const GEMINI_KEY = process.env.GEMINI_API_KEY!

async function getYouTubeSuggestions(keyword: string): Promise<string[]> {
  try {
    const url = `https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&q=${encodeURIComponent(keyword)}&hl=en`
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    const text = await res.text()
    const match = text.match(/\[\[.*\]\]/)
    if (!match) return []
    const parsed = JSON.parse(match[0])
    return parsed.slice(0, 15).map((item: any[]) => item[0] as string).filter(s => s && s !== keyword)
  } catch { return [] }
}

async function getVideoCount(keyword: string): Promise<number> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=id&q=${encodeURIComponent(keyword)}&type=video&maxResults=1&key=${YT_KEY}`
    )
    const data = await res.json()
    return data.pageInfo?.totalResults || 0
  } catch { return 0 }
}

async function getTopChannels(keyword: string): Promise<any[]> {
  try {
    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(keyword)}&type=video&order=viewCount&maxResults=5&key=${YT_KEY}`
    )
    const searchData = await searchRes.json()
    const items = searchData.items || []
    if (!items.length) return []
    const channelIds = [...new Set(items.map((it: any) => it.snippet?.channelId).filter(Boolean))] as string[]
    const chRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelIds.join(',')}&key=${YT_KEY}`
    )
    const chData = await chRes.json()
    return (chData.items || []).map((ch: any) => ({
      channelId: ch.id,
      channelTitle: ch.snippet?.title,
      thumbnail: ch.snippet?.thumbnails?.default?.url,
      subscriberCount: parseInt(ch.statistics?.subscriberCount || '0'),
      viewCount: parseInt(ch.statistics?.viewCount || '0'),
      url: `https://youtube.com/channel/${ch.id}`,
    }))
  } catch { return [] }
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
  if (count < 1000) return Math.floor(Math.random() * 20 + 75)
  if (count < 10000) return Math.floor(Math.random() * 20 + 55)
  if (count < 100000) return Math.floor(Math.random() * 20 + 35)
  if (count < 500000) return Math.floor(Math.random() * 15 + 20)
  return Math.floor(Math.random() * 15 + 5)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const { keywords, platform } = req.body
  if (!keywords?.length) return res.status(400).json({ error: 'Keywords required' })
  const kwList: string[] = (keywords as string[]).slice(0, 5)

  try {
    const analysis: any[] = []
    const allTopChannels: any[] = []

    for (const kw of kwList) {
      const [suggestions, videoCount, topChannels] = await Promise.all([
        getYouTubeSuggestions(kw),
        getVideoCount(kw),
        getTopChannels(kw),
      ])

      let trend = 'Stable'
      try {
        const trendRes = await fetch(
          `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `Is the YouTube keyword "${kw}" trending Rising, Stable, or Declining in 2026? Reply with one word only.` }] }],
              generationConfig: { temperature: 0.3, maxOutputTokens: 10 },
            }),
          }
        )
        const trendData = await trendRes.json()
        const trendText = trendData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''
        if (trendText.includes('Rising')) trend = 'Rising'
        else if (trendText.includes('Declining')) trend = 'Declining'
      } catch { }

      analysis.push({
        keyword: kw, videoCount,
        volume: classifyVolume(videoCount),
        competition: classifyCompetition(videoCount),
        rankingChance: calcRankingChance(videoCount),
        trend, related: suggestions.slice(0, 5),
      })

      for (const ch of topChannels) {
        if (!allTopChannels.find(c => c.channelId === ch.channelId)) {
          allTopChannels.push({ ...ch, keyword: kw })
        }
      }
    }

    // 15 related keywords (all difficulties)
    const relatedKeywords: any[] = []
    for (const kw of kwList) {
      const suggestions = await getYouTubeSuggestions(kw)
      for (const s of suggestions) {
        if (!relatedKeywords.find(e => e.keyword === s) && s !== kw) {
          const vc = await getVideoCount(s)
          relatedKeywords.push({
            keyword: s, videoCount: vc,
            volume: classifyVolume(vc),
            competition: classifyCompetition(vc),
            rankingChance: calcRankingChance(vc),
            trend: 'Stable', related: [],
          })
        }
        if (relatedKeywords.length >= 15) break
      }
      if (relatedKeywords.length >= 15) break
    }

    // 20 EASY keywords — use Gemini to generate long-tail low-competition variants
    let easyKeywords: any[] = []
    try {
      const mainKw = kwList[0]
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Generate 20 long-tail, low-competition YouTube keyword variations for: "${mainKw}".
These should be very specific, niche keywords that smaller channels can rank for.
Avoid generic or highly competitive terms.
Return JSON only — a simple array of strings:
["keyword1","keyword2","keyword3",...,"keyword20"]`
              }]
            }],
            generationConfig: { temperature: 0.8, maxOutputTokens: 500 },
          }),
        }
      )
      const gData = await geminiRes.json()
      const text = gData.candidates?.[0]?.content?.parts?.[0]?.text || ''
      const s = text.indexOf('['), e = text.lastIndexOf(']')
      if (s !== -1 && e !== -1) {
        const rawList: string[] = JSON.parse(text.slice(s, e + 1))
        // Fetch video counts for first 10 (to avoid quota)
        for (const kw of rawList.slice(0, 20)) {
          const vc = await getVideoCount(kw)
          easyKeywords.push({
            keyword: kw, videoCount: vc,
            volume: classifyVolume(vc),
            competition: classifyCompetition(vc),
            rankingChance: calcRankingChance(vc),
            trend: 'Stable',
          })
        }
        // Sort by ranking chance descending (easier to rank = show first)
        easyKeywords.sort((a, b) => b.rankingChance - a.rankingChance)
      }
    } catch { /* optional */ }

    return res.status(200).json({
      analysis,
      relatedKeywords: relatedKeywords.slice(0, 15),
      easyKeywords: easyKeywords.slice(0, 20),
      topChannels: allTopChannels.slice(0, 8),
    })
  } catch (err: any) {
    console.error('keywords error:', err)
    return res.status(500).json({ error: 'Keyword analysis failed' })
  }
}
