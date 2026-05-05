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
    const numMatch = line.match(/^\d+[\.\)]\s+(.+)/)
    if (numMatch) {
      const idea = numMatch[1].replace(/\*\*/g, '').trim()
      if (idea.length > 10) ideas.push(idea)
    }
  }
  return ideas.slice(0, 10)
}

// Detect if message is a clone blueprint and reformat it nicely
function preprocessMessage(message: string): string {
  if (!message.includes('cloned the YouTube channel') && !message.includes('channel blueprint')) {
    return message
  }
  // It's a blueprint message — instruct AI to use it as structured context
  return `I have a YouTube channel blueprint. Please analyze it and give me a complete, structured 30-day content plan with specific video titles, posting days, thumbnail tips, and growth actions for each day. Format your response with clear day-by-day sections.

BLUEPRINT:
${message}`
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const { message, history = [], platform = 'YouTube' } = req.body
  if (!message) return res.status(400).json({ error: 'message required' })

  const processedMessage = preprocessMessage(message)

  const systemPrompt = `You are SRankIQ AI, a world-class YouTube content strategist. Give COMPLETE, STRUCTURED, DETAILED responses.

RESPONSE RULES:
1. NEVER cut off mid-sentence or mid-list. Always finish everything completely.
2. Structure your response clearly with sections.
3. Use plain text only — no markdown (** ## * backticks).
4. For section headers use: ALL CAPS with Roman numerals (I. II. III.) or numbers
5. For numbered lists use: 1. 2. 3.
6. For sub-items use: - item
7. For key labels use: "Title:" "Hook:" "Thumbnail:" "Pillar:" "Day X:" etc.
8. Always give specific examples — real titles, real hooks, real strategies.
9. If asked for 30 days, give ALL 30 days with full details.
10. Never repeat a response already given in the conversation.
11. When given a blueprint, immediately start the 30-day plan without asking questions.`

  let fullPrompt = systemPrompt + '\n\n'

  if (history.length > 0) {
    fullPrompt += 'CONVERSATION HISTORY:\n'
    const recent = history.slice(-6)
    for (const m of recent) {
      const role = m.role === 'assistant' ? 'SRankIQ AI' : 'Creator'
      const content = m.content.length > 800 ? m.content.slice(0, 800) + '...' : m.content
      fullPrompt += `${role}: ${content}\n\n`
    }
    fullPrompt += '---\n\n'
  }

  fullPrompt += `Creator: ${processedMessage}\n\nSRankIQ AI (give a COMPLETE structured response — use clear sections, finish everything, never cut off):`

  const modelConfigs = [
    { model: 'gemini-2.5-flash', maxTokens: 8192 },
    { model: 'gemini-1.5-flash', maxTokens: 8192 },
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
            generationConfig: { temperature: 0.85, maxOutputTokens: maxTokens, topP: 0.95 },
          }),
        }
      )
      if (!r.ok) continue
      const data = await r.json()
      if (data.error) { console.error(model, data.error.message); continue }
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
      reply: 'Connection issue — please resend your message and I will give you a complete response!',
      ideas: [],
    })
  }

  const reply = stripMarkdown(rawReply)
  const ideas = extractIdeas(reply)
  return res.status(200).json({ reply, ideas })
}
