// pages/api/ai/inspiration.ts
import type { NextApiRequest, NextApiResponse } from 'next'

const GEMINI_KEY = process.env.GEMINI_API_KEY!

const SYSTEM = `You are SRankIQ AI, an expert YouTube growth coach built into the SRankIQ platform.

CRITICAL RULES:
1. ALWAYS respond directly to what the user just said. If they say "hello", say hello back. If they ask a follow-up, answer it based on what was discussed before. Never respond to something unrelated to the current message.
2. You have memory of this conversation. Use it naturally — reference earlier topics when relevant.
3. Plain text only. No **, no ##, no *, no backticks, no markdown.
4. Use numbered lists for multiple ideas. Use ALL CAPS for section headers in long structured answers.
5. Be specific. Real video titles, real hooks, real strategies. Never vague advice.
6. Always complete your full answer. Never cut off mid-response.

You help with: video ideas, titles, hooks, thumbnails, content calendars, channel growth, SEO, competitor research, monetization, audience building.`

function clean(text: string): string {
  return text
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.*?)\*\*/gs, '$1')
    .replace(/__(.*?)__/gs, '$1')
    .replace(/\*(.*?)\*/gs, '$1')
    .replace(/_(.*?)_/gs, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`(.*?)`/g, '$1')
    .replace(/^---+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function extractIdeas(text: string): string[] {
  return text.split('\n')
    .map(l => l.match(/^\d+[.)]\s+(.+)/)?.[1]?.replace(/\*\*/g, '').trim())
    .filter((x): x is string => !!x && x.length > 8)
    .slice(0, 10)
}

async function gemini(model: string, contents: any[]): Promise<string | null> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 28000)
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents,
          generationConfig: { temperature: 0.9, maxOutputTokens: 8192, topP: 0.95 },
        }),
      }
    )
    clearTimeout(t)
    if (!r.ok) return null
    const d = await r.json()
    return d.candidates?.[0]?.content?.parts?.[0]?.text ?? null
  } catch {
    clearTimeout(t)
    return null
  }
}

function buildContents(history: { role: string; content: string }[], message: string) {
  // Convert history to Gemini format (role: user | model)
  // Only keep last 6 messages (3 exchanges), max 500 chars each
  const turns = history
    .filter(m => !m.content?.includes('How can I help you grow'))
    .slice(-6)
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content.slice(0, 500) }],
    }))

  // Add current message
  turns.push({ role: 'user', parts: [{ text: message }] })

  // Gemini requires strict alternation — fix duplicates
  const fixed: typeof turns = []
  for (const turn of turns) {
    if (fixed.length === 0) {
      if (turn.role === 'model') continue // must start with user
      fixed.push(turn)
    } else if (fixed.at(-1)!.role === turn.role) {
      fixed.at(-1)!.parts[0].text += '\n' + turn.parts[0].text
    } else {
      fixed.push(turn)
    }
  }

  // Must end with user
  if (!fixed.length || fixed.at(-1)!.role !== 'user') {
    fixed.push({ role: 'user', parts: [{ text: message }] })
  }

  return fixed
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { message, history = [] } = req.body
  if (!message?.trim()) return res.status(400).json({ error: 'message required' })

  const contents = buildContents(history, message)

  // Try best model first, fall back
  let raw = await gemini('gemini-2.5-flash', contents)
  if (!raw) raw = await gemini('gemini-1.5-flash', contents)
  // Last resort: no history at all
  if (!raw) raw = await gemini('gemini-1.5-flash', [{ role: 'user', parts: [{ text: message }] }])

  if (!raw) {
    return res.status(200).json({
      reply: 'Sorry, I had a brief issue connecting. Please send your message again!',
      ideas: [],
    })
  }

  const reply = clean(raw)
  return res.status(200).json({ reply, ideas: extractIdeas(reply) })
}
