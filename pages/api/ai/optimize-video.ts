// pages/api/ai/optimize-video.ts
import type { NextApiRequest, NextApiResponse } from 'next'

const GEMINI_KEY = process.env.GEMINI_API_KEY!

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { title, description, tags, views, likes } = req.body
  if (!title) return res.status(400).json({ error: 'title required' })

  const engagementRate = views > 0 ? ((likes / views) * 100).toFixed(1) : '0'
  const titleLen = title.length

  // Calculate basic SEO score
  let seoScore = 0
  if (titleLen >= 55 && titleLen <= 70) seoScore += 30
  else if (titleLen >= 40) seoScore += 20
  else seoScore += 10
  if (description?.length >= 500) seoScore += 25
  else if (description?.length >= 200) seoScore += 15
  else if (description?.length >= 50) seoScore += 8
  if (tags?.length >= 10) seoScore += 20
  else seoScore += (tags?.length || 0) * 2
  const ratio = views > 0 ? likes / views : 0
  if (ratio >= 0.05) seoScore += 25
  else if (ratio >= 0.02) seoScore += 15
  else if (ratio >= 0.01) seoScore += 8
  seoScore = Math.min(100, seoScore)

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Analyze this YouTube video and suggest improvements:
Title: "${title}" (${titleLen} chars)
Description length: ${description?.length || 0} chars
Tags: ${tags?.join(', ') || 'none'}
Views: ${views}, Likes: ${likes}, Engagement: ${engagementRate}%

Return JSON only:
{
  "suggestedTitle": "improved title between 55-70 chars",
  "suggestedKeywords": ["kw1","kw2","kw3","kw4","kw5","kw6","kw7","kw8"],
  "descriptionTip": "one specific tip to improve the description for better SEO"
}`
            }]
          }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 400 },
        }),
      }
    )
    const data = await geminiRes.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const s = text.indexOf('{'), e = text.lastIndexOf('}')
    if (s !== -1 && e !== -1) {
      const parsed = JSON.parse(text.slice(s, e + 1))
      return res.status(200).json({ ...parsed, seoScore })
    }
    return res.status(200).json({ seoScore, suggestedKeywords: [], suggestedTitle: '', descriptionTip: '' })
  } catch (err) {
    return res.status(200).json({ seoScore, suggestedKeywords: [], suggestedTitle: title, descriptionTip: 'Add more keywords to your description' })
  }
}
