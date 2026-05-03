// pages/api/ai/seo.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { analyzeSEO } from '../../../services/gemini'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { title, description, tags, platform } = req.body
    if (!title || !platform) return res.status(400).json({ error: 'title and platform required' })

    const result = await analyzeSEO({ title, description: description || '', tags: tags || [], platform })
    return res.status(200).json(result)
  } catch (err: any) {
    console.error('SEO API error:', err)
    return res.status(500).json({ error: err.message || 'SEO analysis failed' })
  }
}
