// pages/api/competitors/2-suggestions.ts
import type { NextApiRequest, NextApiResponse } from 'next'

const YT_KEY = process.env.YOUTUBE_API_KEY!
const GEMINI_KEY = process.env.GEMINI_API_KEY!

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const { channelName, keywords, niche, categoryId, excludeId } = req.body

  try {
    // Strategy 1: Search YouTube for real channels with similar keywords
    const searchQuery = keywords || channelName
    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=channel&maxResults=12&key=${YT_KEY}`
    )
    const searchData = await searchRes.json()
    const items = (searchData.items || []).filter((it: any) => {
      const id = it.id?.channelId
      return id && id !== excludeId
    }).slice(0, 8)

    if (items.length > 0) {
      const channelIds = items.map((it: any) => it.id?.channelId).filter(Boolean).join(',')
      const chRes = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelIds}&key=${YT_KEY}`
      )
      const chData = await chRes.json()
      const channels = (chData.items || []).map((ch: any) => ({
        id: ch.id,
        name: ch.snippet?.title,
        thumbnail: ch.snippet?.thumbnails?.default?.url,
        subscriberCount: parseInt(ch.statistics?.subscriberCount || '0'),
        videoCount: parseInt(ch.statistics?.videoCount || '0'),
        viewCount: parseInt(ch.statistics?.viewCount || '0'),
        description: ch.snippet?.description?.slice(0, 100) || '',
        channelUrl: `https://youtube.com/channel/${ch.id}`,
      }))
      return res.status(200).json({ suggestions: channels.slice(0, 6) })
    }

    // Fallback: Gemini names only
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `List 6 real YouTube channels similar to "${channelName}" in the ${niche || 'general'} niche. Return ONLY a JSON array: ["Name1","Name2","Name3","Name4","Name5","Name6"]` }] }],
          generationConfig: { temperature: 0.6, maxOutputTokens: 150 },
        }),
      }
    )
    const gData = await geminiRes.json()
    const text = gData.candidates?.[0]?.content?.parts?.[0]?.text || '[]'
    const s = text.indexOf('['), e = text.lastIndexOf(']')
    if (s === -1 || e === -1) return res.status(200).json({ suggestions: [] })
    const names: string[] = JSON.parse(text.slice(s, e + 1))
    const fallback = names.filter(n => n && n !== channelName).slice(0, 6).map(name => ({
      id: null, name, thumbnail: null, subscriberCount: 0, videoCount: 0, viewCount: 0,
      description: '', channelUrl: null,
    }))
    return res.status(200).json({ suggestions: fallback })
  } catch (err) {
    console.error('2-suggestions error:', err)
    return res.status(200).json({ suggestions: [] })
  }
}
