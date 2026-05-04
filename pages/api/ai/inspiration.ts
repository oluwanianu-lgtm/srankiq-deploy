// pages/api/ai/2-inspiration.ts  (replace inspiration.ts)
import type { NextApiRequest, NextApiResponse } from 'next'

const GEMINI_KEY = process.env.GEMINI_API_KEY!
const MODEL = 'gemini-2.5-flash'

const SYSTEM = `You are SRankIQ, an expert YouTube and social media content strategist. Help creators build viral channels with specific, actionable advice.

CRITICAL FORMATTING RULES - you MUST follow these:
- Never use markdown symbols like **, ##, ###, *, __, or backticks
- Never use asterisks for bold or headers
- Use plain text only
- For headers/sections, use ALL CAPS or emojis instead of ## or **
- For bold emphasis, just write it normally or use CAPS
- For lists, use numbered lists (1. 2. 3.) or bullet dashes (-)
- Be specific, data-driven, and actionable
- Keep responses concise but packed with value`

function stripMarkdown(text: string): string {
  return text
    // Remove ### headers
    .replace(/#{1,6}\s+/g, '')
    // Remove **bold** and __bold__
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    // Remove *italic* and _italic_
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    // Remove backtick code
    .replace(/`(.+?)`/g, '$1')
    // Remove triple backtick blocks
    .replace(/```[\s\S]*?```/g, '')
    // Remove horizontal rules
    .replace(/^---+$/gm, '')
    // Clean up extra blank lines (max 2 newlines)
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function extractIdeas(text: string): string[] {
  const lines = text.split('\n')
  const ideas: string[] = []
  for (const line of lines) {
    const match = line.match(/^\d+[\.\)]\s+(.+)/)
    if (match) ideas.push(match[1].trim())
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
      { role: 'model', parts: [{ text: `Understood. I will give specific ${platform} advice using plain text only, no markdown formatting.` }] },
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
    const rawReply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not generate a response.'
    const reply = stripMarkdown(rawReply)
    const ideas = extractIdeas(reply)

    return res.status(200).json({ reply, ideas })
  } catch (err: any) {
    console.error('2-inspiration error:', err)
    return res.status(500).json({ error: 'Failed to generate response' })
  }
}
