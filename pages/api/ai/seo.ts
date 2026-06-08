// pages/api/ai/seo.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiAuth } from '../../../lib/serverAuth'

const GEMINI_KEY = process.env.GEMINI_API_KEY!

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { title, description, tags, platform } = req.body
  if (!title) return res.status(400).json({ error: 'title required' })

  const prompt = `You are an expert YouTube SEO analyst. Analyze this content and return a JSON SEO report.

Platform: ${platform || 'YouTube'}
Title: "${title}"
Description: "${description || '(none)'}"
Tags: ${Array.isArray(tags) ? tags.join(', ') : (tags || '(none)')}

Return ONLY valid JSON, no markdown, no explanation:
{
  "score": <overall SEO score 0-100>,
  "titleScore": <title SEO score 0-100>,
  "descriptionScore": <description quality score 0-100>,
  "tagsScore": <tags/keywords score 0-100>,
  "viralScore": <viral potential score 0-100>,
  "engagementPrediction": "<Low|Medium|High|Very High>",
  "suggestions": [
    "<specific actionable suggestion 1>",
    "<specific actionable suggestion 2>",
    "<specific actionable suggestion 3>",
    "<specific actionable suggestion 4>"
  ]
}

Scoring guide:
- titleScore: Check length (55-70 chars is ideal), has keyword at start, emotional hook, number or power word
- descriptionScore: Check if it has keywords, call to action, timestamps, links mentioned
- tagsScore: Check if tags are relevant, specific, mix of broad and niche terms
- viralScore: Emotional hook strength, trending potential, curiosity gap, shareability
- Overall score = weighted average (title 40%, description 30%, tags 30%)`

  try {
    const ctrl = new AbortController()
    const timeout = setTimeout(() => ctrl.abort(), 25000)

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2048,
          },
        }),
      }
    )
    clearTimeout(timeout)

    if (!r.ok) {
      const err = await r.json()
      console.error('Gemini error:', err)
      return res.status(500).json({ error: 'AI service error' })
    }

    const data = await r.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const clean = text.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim()

    let result: any = null
    try {
      result = JSON.parse(clean)
    } catch {
      const start = clean.indexOf('{')
      const end = clean.lastIndexOf('}')
      if (start !== -1 && end !== -1) {
        try { result = JSON.parse(clean.slice(start, end + 1)) } catch { /* fall through */ }
      }
    }

    // If the AI response still couldn't be parsed, score with heuristics
    // so the user always gets a useful result instead of an error.
    if (!result) {
      const t = String(title)
      const d = String(description || '')
      const tagArr = Array.isArray(tags) ? tags : String(tags || '').split(',').map(s => s.trim()).filter(Boolean)
      const titleScore = Math.min(100, (t.length >= 40 && t.length <= 70 ? 70 : 45) + (/\d/.test(t) ? 12 : 0) + (/how|why|best|top|secret|\?/i.test(t) ? 13 : 0))
      const descriptionScore = d.length > 200 ? 75 : d.length > 50 ? 55 : 25
      const tagsScore = tagArr.length >= 10 ? 80 : tagArr.length >= 5 ? 60 : tagArr.length > 0 ? 40 : 15
      const suggestions: string[] = []
      if (t.length < 40) suggestions.push('Your title is short — aim for 40–70 characters with your main keyword near the front.')
      if (!/\d/.test(t)) suggestions.push('Try adding a number (e.g. "5 ways…") — numbered titles tend to get more clicks.')
      if (d.length < 100) suggestions.push('Add a fuller description (200+ chars) with keywords, timestamps, and a call to action.')
      if (tagArr.length < 8) suggestions.push('Add more tags — a mix of broad and specific terms (aim for 10–15).')
      if (!suggestions.length) suggestions.push('Solid foundation — test variations of your title to push click-through higher.')
      result = {
        score: Math.round(titleScore * 0.4 + descriptionScore * 0.3 + tagsScore * 0.3),
        titleScore, descriptionScore, tagsScore,
        viralScore: Math.round((titleScore + tagsScore) / 2),
        engagementPrediction: 'Medium', suggestions,
      }
    }

    return res.status(200).json({
      score: Math.min(100, Math.max(0, result.score || 60)),
      titleScore: Math.min(100, Math.max(0, result.titleScore || 60)),
      descriptionScore: Math.min(100, Math.max(0, result.descriptionScore || 50)),
      tagsScore: Math.min(100, Math.max(0, result.tagsScore || 50)),
      viralScore: Math.min(100, Math.max(0, result.viralScore || 65)),
      engagementPrediction: result.engagementPrediction || 'Medium',
      suggestions: Array.isArray(result.suggestions) ? result.suggestions.slice(0, 5) : [],
    })
  } catch (err: any) {
    console.error('SEO scan error:', err)
    return res.status(500).json({ error: err.message || 'SEO scan failed' })
  }
}

export default withApiAuth(handler)
