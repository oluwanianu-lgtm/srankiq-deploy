// pages/api/competitors/analyze.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { analyzeCompetitor } from '../../../services/gemini'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { channelName, platform, niche } = req.body
    if (!channelName || !platform) return res.status(400).json({ error: 'channelName and platform required' })
    const result = await analyzeCompetitor({ channelName, platform, niche: niche || 'general' })
    return res.status(200).json(result)
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
