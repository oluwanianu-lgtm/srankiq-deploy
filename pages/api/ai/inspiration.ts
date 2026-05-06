// pages/api/ai/inspiration.ts
import type { NextApiRequest, NextApiResponse } from 'next'

const GEMINI_KEY = process.env.GEMINI_API_KEY!

const SYSTEM = `You are SRankIQ AI, an expert YouTube growth coach.

CRITICAL RULES:
1. ALWAYS respond directly to what the user just said. If they say "hello", greet them warmly. If they ask a follow-up question, answer it in the context of the conversation. Never respond with something unrelated.
2. You remember the full conversation. Use it naturally.
3. Plain text only — no **, no ##, no *, no backticks, no markdown ever.
4. Use numbered lists for multiple ideas. Use ALL CAPS for section headers in long answers.
5. Be specific — real video titles, real hooks, real strategies.
6. Always complete your full answer. Never cut off.

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

async function callGemini(model: string, contents: any[]): Promise<string | null> {
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
          contents,
          generationConfig: { temperature: 0.9, maxOutputTokens: 8192, topP: 0.95 },
        }),
      }
    )
    clearTimeout(t)
    if (!r.ok) { console.error(model, r.status, await r.text()); return null }
    const d = await r.json()
    if (d.error) { console.error(model, d.error); return null }
    return d.candidates?.[0]?.content?.parts?.[0]?.text ?? null
  } catch (e) {
    clearTimeout(t)
    console.error(model, e)
    return null
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { message, history = [] } = req.body
  if (!message?.trim()) return res.status(400).json({ error: 'message required' })

  // Build multi-turn contents array
  // System prompt goes into the first user message + a fake model reply
  // This is the correct pattern when systemInstruction is not available
  const contents: any[] = [
    {
      role: 'user',
      parts: [{ text: SYSTEM + '\n\nUnderstood. I am SRankIQ AI. I will follow all rules above.' }],
    },
    {
      role: 'model',
      parts: [{ text: 'Understood! I am SRankIQ AI, your YouTube growth coach. I will always respond directly to what you say, remember our conversation, use plain text, and give complete specific answers. How can I help you grow?' }],
    },
  ]

  // Add recent history — last 6 messages (3 exchanges), 500 char cap each
  const recent = history
    .filter((m: any) => !m.content?.includes('How can I help you grow your YouTube channel today?'))
    .slice(-6)

  for (const msg of recent) {
    contents.push({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: (msg.content || '').slice(0, 500) }],
    })
  }

  // Add current message
  contents.push({ role: 'user', parts: [{ text: message }] })

  // Fix alternating turns — Gemini requires strict user/model alternation
  // Start from index 2 (after our system bootstrap pair)
  const bootstrap = contents.slice(0, 2)
  const rest = contents.slice(2)
  const fixed: any[] = []
  for (const turn of rest) {
    if (fixed.length === 0) {
      if (turn.role === 'model') continue
      fixed.push(turn)
    } else if (fixed.at(-1)!.role === turn.role) {
      fixed.at(-1)!.parts[0].text += '\n' + turn.parts[0].text
    } else {
      fixed.push(turn)
    }
  }
  // Ensure ends with user
  if (!fixed.length || fixed.at(-1)!.role !== 'user') {
    fixed.push({ role: 'user', parts: [{ text: message }] })
  }

  const finalContents = [...bootstrap, ...fixed]

  // Try models in order
  let raw = await callGemini('gemini-2.5-flash', finalContents)
  if (!raw) raw = await callGemini('gemini-1.5-flash', finalContents)
  // Last resort: minimal, no history
  if (!raw) {
    raw = await callGemini('gemini-1.5-flash', [
      { role: 'user', parts: [{ text: SYSTEM + '\n\n' + message }] },
    ])
  }

  if (!raw) {
    return res.status(200).json({
      reply: 'Sorry, I had a brief issue. Please send your message again!',
      ideas: [],
    })
  }

  return res.status(200).json({ reply: clean(raw), ideas: extractIdeas(raw) })
}
