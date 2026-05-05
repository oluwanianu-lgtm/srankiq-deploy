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
  return ideas.slice(0, 10)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const { message, history = [], platform = 'YouTube' } = req.body
  if (!message) return res.status(400).json({ error: 'message required' })

  const systemPrompt = `You are SRankIQ AI, a world-class ${platform} content strategist and growth expert. You operate at the level of the best AI assistants — giving COMPLETE, THOROUGH, DETAILED responses with no shortcuts.

ABSOLUTE RULES:
1. NEVER cut off mid-sentence or mid-list. Always complete every thought fully.
2. If asked for a 30-day content plan, give ALL 30 days with full details for each day.
3. If asked for video ideas, give complete titles, hooks, thumbnails, and descriptions.
4. Answer the EXACT question asked — never deflect or ask for more info if context exists.
5. Use plain text only — no markdown (no **, ##, *, backticks).
6. Use numbered lists (1. 2. 3.) and section headers in CAPS.
7. Be specific with real examples — channel names, video titles, view counts.
8. Never repeat a response you already gave in this conversation.
9. Go deep — surface-level answers are not acceptable.`

  // Build single-turn prompt with full history as context
  let fullPrompt = systemPrompt + '\n\n'

  if (history.length > 0) {
    fullPrompt += 'CONVERSATION HISTORY:\n'
    const recent = history.slice(-8)
    for (const m of recent) {
      const role = m.role === 'assistant' ? 'SRankIQ AI' : 'Creator'
      // Truncate very long history entries to save tokens
      const content = m.content.length > 1000 ? m.content.slice(0, 1000) + '...' : m.content
      fullPrompt += `${role}: ${content}\n\n`
    }
    fullPrompt += '---\n\n'
  }

  fullPrompt += `Creator: ${message}\n\nSRankIQ AI (give a COMPLETE, THOROUGH response — never stop mid-list, never cut off, finish everything fully):`

  // Try models in order — gemini-2.5-flash supports up to 65k output tokens
  const modelConfigs = [
    { model: 'gemini-2.5-flash', maxTokens: 8192 },
    { model: 'gemini-1.5-flash', maxTokens: 8192 },
    { model: 'gemini-1.5-pro', maxTokens: 8192 },
  ]

  let rawReply = ''

  for (const { model, maxTokens } of modelConfigs) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
            generationConfig: {
              temperature: 0.85,
              maxOutputTokens: maxTokens,
              topP: 0.95,
            },
          }),
        }
      )

      if (!r.ok) {
        console.error(`${model} HTTP ${r.status}`)
        continue
      }

      const data = await r.json()

      // Check for finish reason — if MAX_TOKENS, the response was cut off
      const finishReason = data.candidates?.[0]?.finishReason
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text

      if (text) {
        rawReply = text
        // If cut off by token limit, append a note
        if (finishReason === 'MAX_TOKENS') {
          rawReply += '\n\n[Response was very long. Type "continue" to get the rest.]'
        }
        break
      }
    } catch (e) {
      console.error(`${model} error:`, e)
      continue
    }
  }

  if (!rawReply) {
    return res.status(200).json({
      reply: 'I had a connection issue. Please resend your message!',
      ideas: [],
    })
  }

  const reply = stripMarkdown(rawReply)
  const ideas = extractIdeas(reply)
  return res.status(200).json({ reply, ideas })
}
