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
    const m = line.match(/^\d+[\.\)]\s+(.+)/)
    if (m) {
      const idea = m[1].replace(/\*\*/g, '').trim()
      if (idea.length > 8) ideas.push(idea)
    }
  }
  return ideas.slice(0, 10)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const { message, history = [], platform = 'YouTube' } = req.body
  if (!message) return res.status(400).json({ error: 'message required' })

  const isBlueprint = message.includes('cloned the YouTube channel') || message.includes('channel blueprint')

  const systemPrompt = `You are SRankIQ AI, a world-class YouTube growth strategist. Give COMPLETE, STRUCTURED, DETAILED responses.

RULES:
1. NEVER cut off. Always finish completely.
2. Use plain text ONLY — no **, ##, *, backticks ever.
3. Structure with: ALL CAPS section headers, numbered lists, "Day X:" / "Title:" / "Hook:" labels.
4. Be specific — real titles, real hooks, real strategies.
5. If given a blueprint, immediately create the full 30-day plan without asking questions.
6. Never repeat responses already given.`

  // Build prompt — handle blueprint specially to avoid token overflow
  let fullPrompt = systemPrompt + '\n\n'

  if (isBlueprint) {
    // Blueprint message — treat as direct instruction, skip history
    fullPrompt += `Creator request: ${message}\n\nSRankIQ AI (immediately give a COMPLETE 30-day content plan with Day 1 through Day 30, specific video titles, posting days, thumbnail tips for each day — start now, no preamble):`
  } else {
    // Normal message with history context
    if (history.length > 0) {
      fullPrompt += 'CONVERSATION HISTORY:\n'
      // Take last 4 messages max, truncate each to 400 chars to avoid token overflow
      const recent = history.slice(-4)
      for (const m of recent) {
        const role = m.role === 'assistant' ? 'SRankIQ AI' : 'Creator'
        const content = m.content.length > 400 ? m.content.slice(0, 400) + '...' : m.content
        fullPrompt += `${role}: ${content}\n\n`
      }
      fullPrompt += '---\n\n'
    }
    fullPrompt += `Creator: ${message}\n\nSRankIQ AI (give a COMPLETE detailed response — never cut off, always finish):`
  }

  const models = [
    { model: 'gemini-2.5-flash', maxTokens: 8192 },
    { model: 'gemini-1.5-flash', maxTokens: 8192 },
  ]

  let rawReply = ''

  for (const { model, maxTokens } of models) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
            generationConfig: { temperature: 0.85, maxOutputTokens: maxTokens, topP: 0.95 },
          }),
        }
      )
      if (!r.ok) { console.error(model, r.status); continue }
      const data = await r.json()
      if (data.error) { console.error(model, data.error?.message); continue }
      const finishReason = data.candidates?.[0]?.finishReason
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (text) {
        rawReply = text
        if (finishReason === 'MAX_TOKENS') {
          rawReply += '\n\n[Response was very long. Type "continue" to get the rest.]'
        }
        break
      }
    } catch (e) { console.error(model, e); continue }
  }

  if (!rawReply) {
    return res.status(200).json({
      reply: 'Connection issue — please resend your message and I will give you a complete detailed answer!',
      ideas: [],
    })
  }

  const reply = stripMarkdown(rawReply)
  const ideas = extractIdeas(reply)
  return res.status(200).json({ reply, ideas })
}
