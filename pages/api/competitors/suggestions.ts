// pages/api/competitors/suggestions.ts
import type { NextApiRequest, NextApiResponse } from 'next'

const YT_KEY = process.env.YOUTUBE_API_KEY!
const GEMINI_KEY = process.env.GEMINI_API_KEY!

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { channelName, keywords, niche, excludeId } = req.body

  try {
    // Ask Gemini to suggest 6 similar YouTube channels
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `List 6 real YouTube channels similar to "${channelName}" in the ${niche || 'general'} niche that cover topics like: ${keywords || channelName}.
Return ONLY a JSON array of channel names, no explanation:
["ChannelName1","ChannelName2","ChannelName3","ChannelName4","ChannelName5","ChannelName6"]`
            }]
          }],
          generationConfig: { temperature: 0.6, maxOutputTokens: 200 },
        }),
      }
    )
    const data = await geminiRes.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]'
    const start = text.indexOf('['), end = text.lastIndexOf(']')
    if (start === -1 || end === -1) return res.status(200).json({ suggestions: [] })
    
    const names: string[] = JSON.parse(text.slice(start, end + 1))
    const filtered = names.filter(n => n && n !== channelName).slice(0, 6)
    
    return res.status(200).json({ suggestions: filtered })
  } catch (err) {
    console.error('suggestions error:', err)
    return res.status(200).json({ suggestions: [] })
  }
}
