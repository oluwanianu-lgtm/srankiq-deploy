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

function buildPrompt(message: string, history: any[], platform: string): string {
  const isBlueprint = message.includes('cloned the YouTube channel') || message.includes('channel blueprint')

  const systemPrompt = `You are SRankIQ AI, a world-class YouTube growth strategist. Give COMPLETE, DETAILED responses.
RULES: Never cut off. Plain text only — no **, ##, backticks. Use numbered lists and ALL CAPS section headers.
Be specific with real titles, hooks, strategies. If given a blueprint, immediately create the full 30-day plan.`

  let prompt = systemPrompt + '\n\n'

  if (isBlueprint) {
    // Blueprint: skip history entirely to avoid token overflow
    prompt += `Creator: ${message}\n\nSRankIQ AI (give a COMPLETE 30-day plan, Day 1 through Day 30, specific video titles, posting days, thumbnail tips for each):`
  } else {
    // Normal: keep only last 3 exchanges, strictly truncated to 200 chars each
    if (history.length > 0) {
      const recent = history.slice(-6) // last 3 exchanges (user+ai pairs)
      prompt += 'RECENT CHAT:\n'
      for (const m of recent) {
        const role = m.role === 'assistant' ? 'AI' : 'Creator'
        const content = m.content.length > 200 ? m.content.slice(0, 200) + '...' : m.content
        prompt += `${role}: ${content}\n`
      }
      prompt += '\n---\n\n'
    }
    prompt += `Creator: ${message}\n\nSRankIQ AI (complete, detailed answer):`
  }

  return prompt
}

async function callGemini(prompt: string, model: string): Promise<string | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 25000) // 25s timeout

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.85, maxOutputTokens: 8192, topP: 0.95 },
        }),
      }
    )
    clearTimeout(timeout)
    if (!r.ok) return null
    const data = await r.json()
    if (data.error) return null
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null
  } catch (e) {
    clearTimeout(timeout)
    return null
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const { message, history = [], platform = 'YouTube' } = req.body
  if (!message) return res.status(400).json({ error: 'message required' })

  const prompt = buildPrompt(message, history, platform)

  // Try models in order
  let rawReply = await callGemini(prompt, 'gemini-2.5-flash')
  if (!rawReply) rawReply = await callGemini(prompt, 'gemini-1.5-flash')

  // Last resort: try with NO history to guarantee a response
  if (!rawReply) {
    const minimalPrompt = `You are SRankIQ AI, a YouTube growth strategist. Answer this completely: ${message}`
    rawReply = await callGemini(minimalPrompt, 'gemini-1.5-flash')
  }

  if (!rawReply) {
    return res.status(200).json({
      reply: 'I had a brief connection issue. Please send your message again — I\'m ready to give you a complete detailed answer!',
      ideas: [],
    })
  }

  const reply = stripMarkdown(rawReply)
  const ideas = extractIdeas(reply)
  return res.status(200).json({ reply, ideas })
}
