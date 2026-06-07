// pages/api/ai/inspiration.ts
// SRankIQ AI — data-aware growth consultant.
// If the user pastes a YouTube video link or channel (@handle / URL),
// we fetch REAL stats from the YouTube API and inject them into the
// conversation so the analysis is grounded in actual numbers.
import type { NextApiRequest, NextApiResponse } from 'next'
import { resolveChannel, getPublicChannelVideos } from '../../../services/youtube'

const GEMINI_KEY = process.env.GEMINI_API_KEY!
const YT_KEY = process.env.YOUTUBE_API_KEY!

const SYSTEM = `You are SRankIQ AI, a senior YouTube growth consultant with 10+ years of experience growing channels from zero to millions of subscribers. You work inside the SRankIQ platform.

CRITICAL RULES:
1. ALWAYS respond directly to what the user just said. If they say "hello", greet them warmly. If they ask a follow-up, answer in the context of the conversation. Never respond with something unrelated.
2. You remember the full conversation. Use it naturally.
3. Plain text only — no **, no ##, no *, no backticks, no markdown ever.
4. Use numbered lists for multiple ideas. Use ALL CAPS for section headers in long answers.
5. Be specific — real video titles, real hooks, real strategies, real numbers and benchmarks.
6. Always complete your full answer. Never cut off.

WHEN REAL DATA IS PROVIDED (marked LIVE DATA below):
- Act like a paid consultant delivering an audit. Reference the actual numbers.
- Compare metrics against benchmarks: average YouTube engagement is 3-5 percent likes-to-views; under 2 percent is weak, over 6 percent is excellent. Channels posting under 1 video per week grow significantly slower.
- Structure deep analyses with sections like: SNAPSHOT, WHAT IS WORKING, WHAT IS HOLDING THEM BACK, CONTENT STRATEGY ANALYSIS, TITLE AND PACKAGING REVIEW, SPECIFIC RECOMMENDATIONS (numbered, prioritized), 30 DAY ACTION PLAN.
- Diagnose patterns: posting frequency, title styles that win vs lose, video length sweet spots, engagement outliers, upload consistency.
- Every recommendation must be concrete enough to act on today.

You help with: channel audits, video analysis, content ideas, titles, hooks, thumbnails, content calendars, SEO, competitor research, monetization, audience growth.`

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

const fmt = (n: number) =>
  n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : String(n)

// ── Detect & fetch real YouTube data referenced in the message ──
async function buildLiveContext(message: string): Promise<string> {
  try {
    // Video link?
    const vidMatch = message.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]{11})/)
    if (vidMatch) {
      const r = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${vidMatch[1]}&key=${YT_KEY}`
      )
      const d = await r.json()
      const v = d.items?.[0]
      if (v) {
        const views = parseInt(v.statistics.viewCount) || 0
        const likes = parseInt(v.statistics.likeCount) || 0
        const comments = parseInt(v.statistics.commentCount) || 0
        const eng = views ? (((likes + comments) / views) * 100).toFixed(2) : '0'
        return `LIVE DATA — VIDEO THE USER IS ASKING ABOUT (fetched from YouTube right now):
Title: ${v.snippet.title}
Channel: ${v.snippet.channelTitle}
Published: ${v.snippet.publishedAt}
Views: ${fmt(views)} | Likes: ${fmt(likes)} | Comments: ${fmt(comments)} | Engagement: ${eng}%
Description (first 500 chars): ${(v.snippet.description || '').slice(0, 500)}
Tags: ${(v.snippet.tags || []).slice(0, 25).join(', ') || '(none — flag this, missing tags hurt discoverability)'}
Analyze this video using the real numbers above.`
      }
    }

    // Channel link or @handle?
    const chMatch = message.match(/youtube\.com\/(?:channel\/|c\/|user\/|@)([\w.-]+)/) ||
                    message.match(/(?:^|\s)@([\w.-]{3,30})(?:\s|$)/)
    if (chMatch) {
      const channel = await resolveChannel(chMatch[1])
      if (channel) {
        const videos = await getPublicChannelVideos(channel.id, 15)
        const avgViews = videos.length
          ? Math.round(videos.reduce((s: number, v: any) => s + v.views, 0) / videos.length) : 0
        const engVals = videos.filter((v: any) => v.views > 0)
          .map((v: any) => ((v.likes + v.comments) / v.views) * 100)
        const eng = engVals.length
          ? (engVals.reduce((a: number, b: number) => a + b, 0) / engVals.length).toFixed(2) : '0'
        let freq = 'unknown'
        if (videos.length >= 2) {
          const span = (new Date(videos[0].publishedAt).getTime() -
                        new Date(videos[videos.length - 1].publishedAt).getTime()) / (7 * 24 * 3600 * 1000)
          freq = `${(videos.length / Math.max(0.5, span)).toFixed(1)} videos/week`
        }
        return `LIVE DATA — CHANNEL THE USER IS ASKING ABOUT (fetched from YouTube right now):
Channel: ${channel.name} | Subscribers: ${fmt(channel.subscribers)} | Total views: ${fmt(channel.views)} | Videos: ${channel.videoCount}
Average views (last 15 videos): ${fmt(avgViews)}
Average engagement: ${eng}%
Posting frequency: ${freq}
Recent video titles and views:
${videos.slice(0, 10).map((v: any) => `- "${v.title}" — ${fmt(v.views)} views`).join('\n')}
Deliver a professional audit grounded in the real numbers above.`
      }
    }
  } catch (e) {
    console.error('Live context fetch failed (continuing without):', e)
  }
  return ''
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

  // Fetch real data for any video/channel referenced in the message
  const liveContext = await buildLiveContext(message)

  const contents: any[] = [
    {
      role: 'user',
      parts: [{ text: SYSTEM + '\n\nUnderstood. I am SRankIQ AI. I will follow all rules above.' }],
    },
    {
      role: 'model',
      parts: [{ text: 'Understood! I am SRankIQ AI, your YouTube growth consultant. I respond directly to what you say, remember our conversation, use plain text, and when real data is provided I deliver professional audits grounded in the actual numbers. How can I help you grow?' }],
    },
  ]

  const recent = history
    .filter((m: any) => !m.content?.includes('How can I help you grow your YouTube channel today?'))
    .slice(-6)

  for (const msg of recent) {
    contents.push({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: (msg.content || '').slice(0, 500) }],
    })
  }

  const finalUserText = liveContext ? `${liveContext}\n\nUSER MESSAGE: ${message}` : message
  contents.push({ role: 'user', parts: [{ text: finalUserText }] })

  // Fix alternating turns — Gemini requires strict user/model alternation
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
  if (!fixed.length || fixed.at(-1)!.role !== 'user') {
    fixed.push({ role: 'user', parts: [{ text: finalUserText }] })
  }

  const finalContents = [...bootstrap, ...fixed]

  let raw = await callGemini('gemini-2.5-flash', finalContents)
  if (!raw) raw = await callGemini('gemini-2.0-flash', finalContents)
  if (!raw) {
    raw = await callGemini('gemini-2.0-flash', [
      { role: 'user', parts: [{ text: SYSTEM + '\n\n' + finalUserText }] },
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
