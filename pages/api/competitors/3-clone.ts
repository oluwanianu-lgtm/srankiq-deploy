// pages/api/competitors/3-clone.ts
import type { NextApiRequest, NextApiResponse } from 'next'

const GEMINI_KEY = process.env.GEMINI_API_KEY!
const YT_KEY = process.env.YOUTUBE_API_KEY!

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const { channelName, channelData } = req.body
  if (!channelName) return res.status(400).json({ error: 'channelName required' })

  const subs = channelData?.subscriberCountFormatted || 'unknown'
  const avgViews = channelData?.avgViewsFormatted || 'unknown'
  const keywords = channelData?.rankingKeywords?.join(', ') || ''
  const strategy = channelData?.contentStrategy || ''

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are an expert YouTube channel strategist. Create a complete channel clone blueprint based on "${channelName}" (${subs} subscribers, ${avgViews} avg views).

Channel strategy: ${strategy}
Top keywords: ${keywords}

Generate a comprehensive blueprint to replicate this channel's success. Return JSON only:
{
  "channelName": {
    "primary": "suggested channel name (similar style to ${channelName})",
    "alternatives": ["alt1", "alt2", "alt3"],
    "reasoning": "why this name works"
  },
  "channelDescription": "full optimized YouTube channel description (200-400 chars) with keywords",
  "channelTags": ["tag1","tag2","tag3","tag4","tag5","tag6","tag7","tag8","tag9","tag10"],
  "niche": "specific niche description",
  "targetAudience": "detailed target audience description",
  "contentPillars": [
    {"title": "pillar 1 name", "description": "what this content covers", "frequency": "X times per week"},
    {"title": "pillar 2 name", "description": "what this content covers", "frequency": "X times per week"},
    {"title": "pillar 3 name", "description": "what this content covers", "frequency": "X times per week"}
  ],
  "videoFormats": [
    {"format": "format name", "duration": "X-Y minutes", "description": "description", "example": "example title"},
    {"format": "format name", "duration": "X-Y minutes", "description": "description", "example": "example title"},
    {"format": "format name", "duration": "X-Y minutes", "description": "description", "example": "example title"}
  ],
  "uploadSchedule": "specific posting schedule recommendation",
  "thumbnailStyle": "detailed thumbnail design guide",
  "titleFormula": "title formula that works for this niche with examples",
  "firstVideoIdeas": ["video idea 1", "video idea 2", "video idea 3", "video idea 4", "video idea 5"],
  "monetizationPath": "monetization strategy description",
  "growthTips": ["tip 1", "tip 2", "tip 3", "tip 4"],
  "estimatedTimeToResults": "realistic timeline estimate"
}`
            }]
          }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 2000 },
        }),
      }
    )

    const data = await geminiRes.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const s = text.indexOf('{'), e = text.lastIndexOf('}')
    if (s === -1 || e === -1) throw new Error('No JSON in response')
    const blueprint = JSON.parse(text.slice(s, e + 1))
    return res.status(200).json({ blueprint, channelName })
  } catch (err: any) {
    console.error('3-clone error:', err)
    return res.status(500).json({ error: 'Clone generation failed' })
  }
}
