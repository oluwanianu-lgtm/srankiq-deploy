// pages/api/keywords/analyze.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { analyzeKeywords } from '../../../services/gemini'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { keywords, platform } = req.body
    if (!keywords?.length || !platform) return res.status(400).json({ error: 'keywords and platform required' })
    const result = await analyzeKeywords({ keywords, platform })
    return res.status(200).json(result)
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
