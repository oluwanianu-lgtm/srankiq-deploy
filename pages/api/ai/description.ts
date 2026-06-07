// pages/api/ai/description.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiAuth } from '../../../lib/serverAuth'
import { generateDescription } from '../../../services/gemini'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { title, platform, keywords, tone } = req.body
    if (!title || !platform) return res.status(400).json({ error: 'title and platform required' })
    const result = await generateDescription({ title, platform, keywords: keywords || [], tone: tone || 'professional' })
    return res.status(200).json({ description: result })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}

export default withApiAuth(handler)
