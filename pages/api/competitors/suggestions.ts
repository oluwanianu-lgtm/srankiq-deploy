// pages/api/competitors/suggestions.ts  (replaces old Gemini-only version)
import type { NextApiRequest, NextApiResponse } from 'next'

const YT_KEY = process.env.YOUTUBE_API_KEY!
const GEMINI_KEY = process.env.GEMINI_API_KEY!

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const { channelName, keywords, niche, excludeId } = req.body

  try {
    // Use YouTube search to find real similar channels
    const searchQuery = `${keywords || channelName} ${niche || ''}`.trim()

    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=channel&maxResults=10&key=${YT_KEY}`
    )
    const searchData = await searchRes.json()
    const items = (searchData.items || []).filter((it: any) => {
      const id = it.id?.channelId
      return id && id !== excludeId
    })

    if (items.length > 0) {
      const channelIds = items.slice(0, 8).map((it: any) => it.id?.channelId).filter(Boolean).join(',')

      const chRes = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelIds}&key=${YT_KEY}`
      )
      const chData = await chRes.json()

      const channels = (chData.items || [])
        .filter((ch: any) => ch.snippet?.title?.toLowerCase() !== (channelName || '').toLowerCase())
        .slice(0, 6)
        .map((ch: any) => ({
          id: ch.id,
          name: ch.snippet?.title,
          thumbnail: ch.snippet?.thumbnails?.default?.url || ch.snippet?.thumbnails?.medium?.url,
          subscriberCount: parseInt(ch.statistics?.subscriberCount || '0'),
          videoCount: parseInt(ch.statistics?.videoCount || '0'),
          viewCount: parseInt(ch.statistics?.viewCount || '0'),
          channelUrl: `https://youtube.com/channel/${ch.id}`,
        }))

      if (channels.length > 0) {
        return res.status(200).json({ suggestions: channels })
      }
    }

    // Fallback to Gemini if YouTube search returns nothing useful
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `List 6 real YouTube channels similar to "${channelName}" in the ${niche || 'general'} niche. Return ONLY a JSON array of channel names, no explanation, no markdown: ["Name1","Name2","Name3","Name4","Name5","Name6"]` }] }],
          generationConfig: { temperature: 0.5, maxOutputTokens: 150 },
        }),
      }
    )
    const gData = await geminiRes.json()
    const text = (gData.candidates?.[0]?.content?.parts?.[0]?.text || '[]')
      .replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim()
    const s = text.indexOf('['), e = text.lastIndexOf(']')
    if (s === -1 || e === -1) return res.status(200).json({ suggestions: [] })

    const names: string[] = JSON.parse(text.slice(s, e + 1))
    const fallback = names
      .filter(n => n && n.toLowerCase() !== (channelName || '').toLowerCase())
      .slice(0, 6)
      .map(name => ({ id: null, name, thumbnail: null, subscriberCount: 0, videoCount: 0, viewCount: 0, channelUrl: null }))

    return res.status(200).json({ suggestions: fallback })
  } catch (err) {
    console.error('suggestions error:', err)
    return res.status(200).json({ suggestions: [] })
  }
}
