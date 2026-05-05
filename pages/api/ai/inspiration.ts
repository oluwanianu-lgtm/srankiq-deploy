// pages/api/ai/inspiration.ts
import type { NextApiRequest, NextApiResponse } from 'next'

const GEMINI_KEY = process.env.GEMINI_API_KEY!

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
  const ideas: string[] = []
  for (const line of text.split('\n')) {
    const match = line.match(/^\d+[\.\)]\s+(.+)/)
    if (match) ideas.push(match[1].replace(/\*\*/g, '').trim())
  }
  return ideas.slice(0, 8)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const { message, history = [], platform = 'YouTube' } = req.body
  if (!message) return res.status(400).json({ error: 'message required' })

  const systemPrompt = `You are SRankIQ AI, a world-class ${platform} content strategist and growth expert. Your job is to give COMPLETE, DETAILED, SPECIFIC answers. Never cut off mid-sentence. Always finish every thought completely.

RULES:
- Answer the EXACT question asked — never deflect or ask for more info if context was already given
- Give COMPLETE answers — if listing 30 days of content, list ALL 30 days
- Use plain text only — no markdown (**bold**, ##headers, *italic*, backticks)
- Use numbered lists (1. 2. 3.) and dashes (- item) for structure
- Be specific with real examples, real titles, real strategies
- Never repeat the same response twice`

  // Build prompt with full conversation context as a single text block
  let fullPrompt = systemPrompt + '\n\n'

  if (history.length > 0) {
    fullPrompt += 'PREVIOUS CONVERSATION:\n'
    const recent = history.slice(-6)
    for (const m of recent) {
      const role = m.role === 'assistant' ? 'SRankIQ AI' : 'Creator'
      fullPrompt += `${role}: ${m.content}\n\n`
    }
    fullPrompt += '---\n\n'
  }

  fullPrompt += `Creator asks: ${message}\n\nSRankIQ AI (give a complete, detailed, specific answer — do not cut off):`

  const models = ['gemini-2.5-flash', 'gemini-1.5-flash']
  let rawReply = ''

  for (const model of models) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
            // Increase token limit to prevent cutoff
            generationConfig: { temperature: 0.85, maxOutputTokens: 2048 },
          }),
        }
      )
      if (!r.ok) continue
      const data = await r.json()
      if (data.error) { console.error(model, data.error); continue }
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (text) { rawReply = text; break }
    } catch (e) { console.error(model, e); continue }
  }

  if (!rawReply) {
    return res.status(200).json({
      reply: `I had a connection issue. Please resend your message and I will give you a complete, detailed answer!`,
      ideas: [],
    })
  }

  const reply = stripMarkdown(rawReply)
  const ideas = extractIdeas(reply)
  return res.status(200).json({ reply, ideas })
}
