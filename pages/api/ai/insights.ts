// pages/api/ai/insights.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiAuth } from '../../../lib/serverAuth'
import { getDashboardInsights } from '../../../services/gemini'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { platform, subscribers, views, niche } = req.body
    const result = await getDashboardInsights({ platform, subscribers, views, niche })
    return res.status(200).json(result)
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}

export default withApiAuth(handler)
