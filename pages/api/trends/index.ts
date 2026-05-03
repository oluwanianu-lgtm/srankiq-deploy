// pages/api/trends/index.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { analyzeTrends } from '../../../services/gemini'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { platform } = req.query
    if (!platform) return res.status(400).json({ error: 'platform required' })
    const result = await analyzeTrends(platform as string)
    return res.status(200).json(result)
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
