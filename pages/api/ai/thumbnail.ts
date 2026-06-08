// pages/api/ai/thumbnail.ts — AI thumbnail generation
import type { NextApiResponse } from 'next'
import { withApiAuth, AuthedRequest } from '../../../lib/serverAuth'
import { generateThumbnail } from '../../../services/gemini'

async function handler(req: AuthedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { title, style, platform } = req.body
    if (!title) return res.status(400).json({ error: 'title required' })

    const img = await generateThumbnail({
      title,
      style: style || 'bold and dramatic',
      platform: platform || 'YouTube',
    })

    return res.status(200).json({ image: `data:${img.mimeType};base64,${img.base64}` })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}

export default withApiAuth(handler)

export const config = { api: { responseLimit: '8mb' } }
