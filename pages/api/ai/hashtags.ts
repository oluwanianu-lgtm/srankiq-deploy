// pages/api/ai/hashtags.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { generateHashtags } from '../../../services/gemini'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { topic, platform, count } = req.body
    if (!topic || !platform) return res.status(400).json({ error: 'topic and platform required' })
    const result = await generateHashtags({ topic, platform, count: count || 20 })
    return res.status(200).json(result)
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
