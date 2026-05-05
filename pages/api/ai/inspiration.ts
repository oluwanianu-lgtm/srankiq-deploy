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

  const systemPrompt = `You are SRankIQ AI, an expert ${platform} content strategist. Your job is to directly answer whatever the user asks with specific, actionable advice. NEVER ask the user for more information if they already gave you context. NEVER repeat the same response. Always give a direct, detailed answer to the exact question asked. FORMATTING: Never use markdown (**, ##, *, backticks). Use plain text. For lists use 1. 2. 3. or dashes. Be specific, energetic and practical.`

  try {
    // Build a single prompt that includes full history as context
    // This avoids Gemini's strict alternating role requirement
    let fullPrompt = systemPrompt + '\n\n'

    if (history.length > 0) {
      fullPrompt += 'CONVERSATION SO FAR:\n'
      const recent = history.slice(-8)
      for (const m of recent) {
        const role = m.role === 'assistant' ? 'SRankIQ AI' : 'User'
        fullPrompt += `${role}: ${m.content}\n\n`
      }
      fullPrompt += '---\n\n'
    }

    fullPrompt += `User: ${message}\n\nSRankIQ AI (respond directly and specifically to the user message above):`

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
              generationConfig: { temperature: 0.85, maxOutputTokens: 1200 },
            }),
          }
        )
        if (!r.ok) continue
        const data = await r.json()
        if (data.error) continue
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text
        if (text) { rawReply = text; break }
      } catch { continue }
    }

    if (!rawReply) {
      return res.status(200).json({
        reply: `Here is my direct answer to "${message}":\n\nI need to be honest — my connection to the AI model had a hiccup. Please try sending your message again and I will give you a full, detailed response right away!`,
        ideas: [],
      })
    }

    const reply = stripMarkdown(rawReply)
    const ideas = extractIdeas(reply)
    return res.status(200).json({ reply, ideas })
  } catch (err: any) {
    console.error('inspiration error:', err)
    return res.status(200).json({
      reply: `Something went wrong. Please try again!`,
      ideas: [],
    })
  }
}
