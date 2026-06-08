// pages/api/niche/analyze.ts — Niche Finder: real YouTube-data analysis of sub-niches
import type { NextApiResponse } from 'next'
import { withApiAuth, AuthedRequest } from '../../../lib/serverAuth'
import { analyzeNiche } from '../../../services/youtube'
import { callGemini, safeJSON } from '../../../services/gemini'

async function handler(req: AuthedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { seed, region } = req.body
    if (!seed) return res.status(400).json({ error: 'seed keyword required' })

    // Use AI ONLY to expand the seed into related sub-niche search terms.
    // Every metric after this comes from the real YouTube API.
    let subNiches: string[] = []
    try {
      const raw = await callGemini(
        `List 6 specific YouTube sub-niche search phrases related to "${seed}". Return ONLY a JSON array of short strings, e.g. ["...","..."]. No commentary.`
      )
      const parsed = safeJSON(raw)
      if (Array.isArray(parsed)) subNiches = parsed.filter((x: any) => typeof x === 'string').slice(0, 6)
    } catch { /* fall through to heuristic */ }
    if (subNiches.length === 0) {
      subNiches = [seed, `${seed} for beginners`, `best ${seed}`, `${seed} 2026`, `how to ${seed}`, `${seed} tips`]
    }
    // Always include the seed itself first
    const terms = Array.from(new Set([seed, ...subNiches])).slice(0, 7)

    // Analyze each term with REAL YouTube data (sequential to respect quota)
    const results = []
    for (const term of terms) {
      try { results.push(await analyzeNiche(term, region || 'US')) }
      catch (e: any) { /* skip failed term, keep going */ }
    }
    results.sort((a, b) => b.opportunityScore - a.opportunityScore)

    return res.status(200).json({ seed, results })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}

export default withApiAuth(handler)
