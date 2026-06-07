// pages/api/ai/ideas.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiAuth } from '../../../lib/serverAuth'
import { generateContentIdeas } from '../../../services/gemini'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { niche, platform, count, audience } = req.body
    if (!niche || !platform) return res.status(400).json({ error: 'niche and platform required' })
    const result = await generateContentIdeas({ niche, platform, count: count || 8, audience: audience || 'general' })
    return res.status(200).json(result)
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}

export default withApiAuth(handler)
