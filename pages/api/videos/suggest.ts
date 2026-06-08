// pages/api/videos/suggest.ts — VidIQ-style fix/add suggestions for a video
import type { NextApiResponse } from 'next'
import { withApiAuth, AuthedRequest } from '../../../lib/serverAuth'
import { generateTitles, generateDescription, generateHashtags } from '../../../services/gemini'

// Deterministic optimization checklist — instant, accurate, no AI needed
function buildChecklist(v: { title: string; description: string; tags: string[] }) {
  const fixes: { severity: 'high' | 'medium' | 'low'; label: string; detail: string }[] = []
  const t = v.title || ''
  const d = v.description || ''
  const tags = v.tags || []

  // Title checks
  if (t.length < 30) fixes.push({ severity: 'high', label: 'Title too short', detail: `Your title is ${t.length} characters. Aim for 40–70 with your main keyword near the front.` })
  else if (t.length > 100) fixes.push({ severity: 'medium', label: 'Title too long', detail: 'Over 100 characters gets cut off in search. Trim to 70 or fewer.' })
  if (!/\d/.test(t)) fixes.push({ severity: 'low', label: 'No number in title', detail: 'Numbers ("5 ways…", "in 2026") tend to lift click-through.' })
  if (!/how|why|best|top|secret|ultimate|\?|!/i.test(t)) fixes.push({ severity: 'low', label: 'Weak hook', detail: 'Add a curiosity or power word (how, why, best, secret) to pull clicks.' })

  // Description checks
  if (d.length < 100) fixes.push({ severity: 'high', label: 'Description too thin', detail: `Only ${d.length} characters. Aim for 200+ with keywords, a summary, and a call to action.` })
  if (!/https?:\/\//.test(d)) fixes.push({ severity: 'low', label: 'No links in description', detail: 'Add links to related videos or your socials to boost session time.' })
  if (!/\d{1,2}:\d{2}/.test(d) && d.length > 200) fixes.push({ severity: 'low', label: 'No timestamps', detail: 'Chapters/timestamps improve watch time and rank well.' })

  // Tag checks
  if (tags.length === 0) fixes.push({ severity: 'high', label: 'No tags used', detail: 'This video has zero tags — add 10–15 relevant tags so YouTube can categorize it.' })
  else if (tags.length < 8) fixes.push({ severity: 'medium', label: 'Too few tags', detail: `Only ${tags.length} tags. Aim for 10–15 with a mix of broad and specific terms.` })

  // Score: start at 100, subtract weighted penalties
  let score = 100
  fixes.forEach(f => { score -= f.severity === 'high' ? 22 : f.severity === 'medium' ? 11 : 5 })
  score = Math.max(10, Math.min(100, score))

  return { score, fixes }
}

async function handler(req: AuthedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { title, description, tags, niche } = req.body
    if (!title) return res.status(400).json({ error: 'title required' })
    const tagArr: string[] = Array.isArray(tags) ? tags : []

    const checklist = buildChecklist({ title, description: description || '', tags: tagArr })

    // AI "what to add" — better title, fuller description, recommended tags
    const topic = niche || title
    const [titlesRes, descRes, tagsRes] = await Promise.allSettled([
      generateTitles({ topic: title, platform: 'YouTube', style: 'engaging', keywords: [] }),
      generateDescription({ title, platform: 'YouTube', keywords: tagArr.slice(0, 5), tone: 'engaging' }),
      generateHashtags({ topic, platform: 'YouTube', count: 15 }),
    ])

    const suggestedTitles = titlesRes.status === 'fulfilled'
      ? (titlesRes.value?.titles || []).map((x: any) => (typeof x === 'string' ? x : x?.title)).filter(Boolean).slice(0, 3)
      : []
    const suggestedDescription = descRes.status === 'fulfilled' ? (descRes.value || '') : ''
    const suggestedTags = tagsRes.status === 'fulfilled'
      ? (tagsRes.value?.hashtags || []).map((h: any) => (h.tag || '').replace(/^#/, '')).filter(Boolean).slice(0, 15)
      : []

    return res.status(200).json({
      ...checklist,
      suggestedTitles,
      suggestedDescription,
      suggestedTags,
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}

export default withApiAuth(handler)
