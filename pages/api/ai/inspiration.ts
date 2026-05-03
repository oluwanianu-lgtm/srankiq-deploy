// pages/api/ai/inspiration.ts
import type { NextApiRequest, NextApiResponse } from 'next'

const GEMINI_KEY = process.env.GEMINI_API_KEY!
const MODEL = 'gemini-2.5-flash'

const SYSTEM = `You are an expert YouTube and social media content strategist. You help creators brainstorm viral video ideas, write compelling hooks, optimize titles, and build content strategies.

When giving video ideas, always format them as a numbered list so they can be extracted.
Be specific, actionable, and data-driven. Reference real trends when possible.
Keep responses concise but packed with value. Use emojis sparingly for emphasis.`

function extractIdeas(text: string): string[] {
  const lines = text.split('\n')
  const ideas: string[] = []
  for (const line of lines) {
    const match = line.match(/^\d+[\.\)]\s+(.+)/)
    if (match) {
      ideas.push(match[1].replace(/\*\*/g, '').trim())
    }
  }
  return ideas.slice(0, 8)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { message, history = [], platform = 'YouTube' } = req.body
  if (!message) return res.status(400).json({ error: 'message required' })

  try {
    const contents = [
      { role: 'user', parts: [{ text: SYSTEM }] },
      { role: 'model', parts: [{ text: `Understood. I'm ready to help with ${platform} content strategy.` }] },
      ...history.slice(-10).map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      { role: 'user', parts: [{ text: `[Platform: ${platform}] ${message}` }] },
    ]

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${MODEL}:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: { temperature: 0.85, maxOutputTokens: 1024 },
        }),
      }
    )

    const data = await geminiRes.json()
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not generate a response.'
    const ideas = extractIdeas(reply)

    return res.status(200).json({ reply, ideas })
  } catch (err: any) {
    console.error('inspiration error:', err)
    return res.status(500).json({ error: 'Failed to generate response' })
  }
}
