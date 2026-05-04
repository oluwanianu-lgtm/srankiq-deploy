// pages/api/ai/inspiration.ts
import type { NextApiRequest, NextApiResponse } from 'next'

const GEMINI_KEY = process.env.GEMINI_API_KEY!

const SYSTEM = `You are SRankIQ, an expert YouTube and social media content strategist. Help creators build viral channels with specific, actionable advice.

IMPORTANT FORMATTING - follow strictly:
- Never use markdown symbols: no **, ##, ###, *, __, or backticks
- Use plain text only
- For section headers use emojis or ALL CAPS
- For numbered lists use: 1. 2. 3.
- For bullet points use: - item
- Be specific, practical, and energetic`

function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.+?)\*\*/gs, '$1')
    .replace(/__(.+?)__/gs, '$1')
    .replace(/\*(.+?)\*/gs, '$1')
    .replace(/_(.+?)_/gs, '$1')
    .replace(/`{3}[\s\S]*?`{3}/g, '')
    .replace(/`(.+?)`/g, '$1')
    .replace(/^---+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function extractIdeas(text: string): string[] {
  const lines = text.split('\n')
  const ideas: string[] = []
  for (const line of lines) {
    const match = line.match(/^\d+[\.\)]\s+(.+)/)
    if (match) ideas.push(match[1].replace(/\*\*/g, '').trim())
  }
  return ideas.slice(0, 8)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const { message, history = [], platform = 'YouTube' } = req.body
  if (!message) return res.status(400).json({ error: 'message required' })

  try {
    const contents: any[] = [
      { role: 'user', parts: [{ text: SYSTEM }] },
      { role: 'model', parts: [{ text: `Got it. I will give specific ${platform} advice using plain text only — no markdown, no asterisks, no hashtags.` }] },
    ]

    // Add conversation history (last 8 messages)
    const recent = history.slice(-8)
    for (const m of recent) {
      contents.push({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })
    }

    contents.push({
      role: 'user',
      parts: [{ text: `[Platform: ${platform}]\n\n${message}` }],
    })

    // Try gemini-2.5-flash first, fallback to gemini-1.5-flash
    const models = ['gemini-2.5-flash', 'gemini-1.5-flash']
    let rawReply = ''

    for (const model of models) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${GEMINI_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents,
              generationConfig: { temperature: 0.8, maxOutputTokens: 1200 },
            }),
          }
        )

        if (!geminiRes.ok) continue

        const data = await geminiRes.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text
        if (text) { rawReply = text; break }
      } catch { continue }
    }

    if (!rawReply) {
      return res.status(200).json({
        reply: 'I had trouble connecting right now. Please try again in a moment!',
        ideas: [],
      })
    }

    const reply = stripMarkdown(rawReply)
    const ideas = extractIdeas(reply)
    return res.status(200).json({ reply, ideas })
  } catch (err: any) {
    console.error('inspiration error:', err)
    return res.status(200).json({
      reply: 'Something went wrong on my end. Please try your question again!',
      ideas: [],
    })
  }
}
