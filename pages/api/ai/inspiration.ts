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

  const systemPrompt = `You are SRankIQ AI, an expert ${platform} content strategist. Give specific, actionable advice to help creators grow viral channels. FORMATTING RULES - strictly follow: Never use markdown symbols (**, ##, *, __, backticks). Use plain text only. For lists use numbers (1. 2. 3.) or dashes (- item). Be energetic, specific, and practical.`

  try {
    // Build valid Gemini conversation — must alternate user/model
    const contents: any[] = []

    // Add history, ensuring proper alternation
    const recentHistory = history.slice(-10)
    for (const m of recentHistory) {
      const role = m.role === 'assistant' ? 'model' : 'user'
      // Skip if same role as last added (Gemini requires alternating)
      if (contents.length > 0 && contents[contents.length - 1].role === role) continue
      contents.push({ role, parts: [{ text: m.content }] })
    }

    // Always end with the current user message
    // If last in contents is 'user', we need to add as continuation
    if (contents.length === 0 || contents[contents.length - 1].role === 'model') {
      contents.push({ role: 'user', parts: [{ text: `${systemPrompt}\n\n${message}` }] })
    } else {
      // Last was user, add model placeholder then new user message
      contents.push({ role: 'model', parts: [{ text: 'Understood, let me help you with that.' }] })
      contents.push({ role: 'user', parts: [{ text: message }] })
    }

    const models = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-pro']
    let rawReply = ''

    for (const model of models) {
      try {
        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${GEMINI_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents,
              generationConfig: { temperature: 0.8, maxOutputTokens: 1200 },
              systemInstruction: { parts: [{ text: systemPrompt }] },
            }),
          }
        )
        if (!r.ok) { console.error(`${model} returned ${r.status}`); continue }
        const data = await r.json()
        if (data.error) { console.error(`${model} error:`, data.error); continue }
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text
        if (text) { rawReply = text; break }
      } catch (e) { console.error(`${model} threw:`, e); continue }
    }

    if (!rawReply) {
      // Last resort: simple single-turn call with no history
      try {
        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\nUser question: ${message}` }] }],
              generationConfig: { temperature: 0.8, maxOutputTokens: 1200 },
            }),
          }
        )
        const data = await r.json()
        rawReply = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      } catch { /* ignore */ }
    }

    if (!rawReply) {
      return res.status(200).json({
        reply: `Great question about ${platform} strategy! To give you the best advice, could you tell me more about your channel niche and current subscriber count? That way I can give you a personalized action plan.`,
        ideas: [],
      })
    }

    const reply = stripMarkdown(rawReply)
    const ideas = extractIdeas(reply)
    return res.status(200).json({ reply, ideas })
  } catch (err: any) {
    console.error('inspiration error:', err)
    return res.status(200).json({
      reply: `I can help you with your ${platform} strategy! What specific area would you like to focus on — video ideas, titles, thumbnails, or growth tactics?`,
      ideas: [],
    })
  }
}
