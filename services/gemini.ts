// services/gemini.ts
// Server-side only — never import this on the client

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1/models'
const MODEL = 'gemini-2.5-flash'

interface GeminiResponse {
  candidates: Array<{
    content: { parts: Array<{ text: string }> }
    finishReason: string
  }>
}

async function callGemini(prompt: string, systemPrompt?: string): Promise<string> {
  const messages = []
  if (systemPrompt) {
    messages.push({ role: 'user', parts: [{ text: systemPrompt }] })
    messages.push({ role: 'model', parts: [{ text: 'Understood. I will follow those instructions.' }] })
  }
  messages.push({ role: 'user', parts: [{ text: prompt }] })

  const res = await fetch(`${GEMINI_BASE}/${MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: messages,
      generationConfig: { temperature: 0.7, topP: 0.95, maxOutputTokens: 2048 },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini API error: ${err}`)
  }

  const data: GeminiResponse = await res.json()
  return data.candidates[0]?.content?.parts[0]?.text || ''
}

function parseJSON(text: string, fallback: any) {
  try {
    const s = text.indexOf('{'), e = text.lastIndexOf('}')
    return s > -1 && e > -1 ? JSON.parse(text.substring(s, e + 1)) : fallback
  } catch { return fallback }
}

// ── SEO Analysis ──────────────────────────────────────
export async function analyzeSEO(data: {
  title: string; description: string; tags: string[]; platform: string
}) {
  const prompt = `Analyze this ${data.platform} content for SEO:
Title: "${data.title}"
Description: "${data.description}"
Tags: ${data.tags.join(', ')}

Return JSON only (no markdown):
{"score":<0-100>,"titleScore":<0-100>,"descriptionScore":<0-100>,"tagsScore":<0-100>,"suggestions":["..."],"keywords":["..."],"strengths":["..."],"weaknesses":["..."],"viralScore":<0-100>,"engagementPrediction":"low|medium|high|viral"}`
  const text = await callGemini(prompt)
  return parseJSON(text, { score: 70, suggestions: ['Could not parse analysis'], keywords: [] })
}

// ── Title Generator ───────────────────────────────────
export async function generateTitles(data: {
  topic: string; platform: string; style: string; keywords: string[]
}) {
  const isYouTube = data.platform === 'YouTube'
  const prompt = `Generate exactly 5 highly optimized ${data.platform} titles for: "${data.topic}"
Style: ${data.style}
Keywords: ${data.keywords.join(', ')}

${isYouTube ? `CRITICAL YouTube rules:
- Each title MUST be between 55-70 characters long (count carefully)
- Include the main keyword near the start
- Use numbers, power words, emotional triggers
- No clickbait — must deliver on the promise
- Vary styles: how-to, number list, question, controversial, story` : `Rules:
- Make them platform-optimized and click-worthy
- Vary the styles`}

Return JSON only (no markdown, no backticks):
{"titles":[{"title":"...","type":"how-to|list|question|story|emotional","score":<0-100>,"charCount":<number>},{"title":"...","type":"...","score":<0-100>,"charCount":<number>},{"title":"...","type":"...","score":<0-100>,"charCount":<number>},{"title":"...","type":"...","score":<0-100>,"charCount":<number>},{"title":"...","type":"...","score":<0-100>,"charCount":<number>}]}`
  const text = await callGemini(prompt)
  return parseJSON(text, { titles: [{ title: data.topic, type: 'general', score: 70, charCount: data.topic.length }] })
}

// ── Description Generator ─────────────────────────────
export async function generateDescription(data: {
  title: string; platform: string; keywords: string[]; tone: string
}) {
  const prompt = `Write a fully SEO-optimized ${data.platform} description for:
Title: "${data.title}"
Keywords: ${data.keywords.join(', ')}
Tone: ${data.tone}

Requirements:
- Strong hook first sentence
- Include keywords naturally
- Clear CTA
${data.platform === 'YouTube' ? '- Include timestamps placeholder section\n- Add hashtags at the end' : '- Add relevant hashtags'}

Return plain text only (the actual description, no JSON).`
  return await callGemini(prompt)
}

// ── Hashtag Generator ─────────────────────────────────
export async function generateHashtags(data: {
  topic: string; platform: string; count: number
}) {
  const actualCount = 10
  const prompt = `Generate exactly ${actualCount} optimized hashtags for ${data.platform} about: "${data.topic}"

Mix: 4 high-volume (1M+ posts), 3 medium-volume (100K–1M), 3 niche/specific (under 100K).
Each hashtag must start with #.

Return JSON only (no markdown, no backticks):
{"hashtags":[{"tag":"#example","volume":"high|medium|niche","relevance":<0-100>}]}`
  const text = await callGemini(prompt)
  const result = parseJSON(text, { hashtags: [] })
  // Ensure exactly 10
  if (result.hashtags?.length > 10) result.hashtags = result.hashtags.slice(0, 10)
  return result
}

// ── Keyword Analysis ──────────────────────────────────
export async function analyzeKeywords(data: { keywords: string[]; platform: string }) {
  const prompt = `Analyze these ${data.platform} keywords: ${data.keywords.join(', ')}

Return JSON only:
{"analysis":[{"keyword":"...","volume":"High","competition":"Medium","rankingChance":72,"trend":"Rising","related":["kw1","kw2","kw3"]}]}`
  const text = await callGemini(prompt)
  return parseJSON(text, { analysis: [] })
}

// ── Trend Analysis ────────────────────────────────────
export async function analyzeTrends(platform: string) {
  const prompt = `List 6 trending topics on ${platform} right now in 2026. Return ONLY valid JSON, no markdown:
{"trends":[{"topic":"...","category":"...","viralityScore":<0-99>,"growth":"...","contentIdea":"...","format":"Video|Short|Post"}],"summary":"..."}`
  try {
    const raw = await callGemini(prompt)
    return parseJSON(raw, { trends: [], summary: '' })
  } catch { return { trends: [], summary: '' } }
}

// ── Competitor Analysis ───────────────────────────────
export async function analyzeCompetitor(data: {
  channelName: string; platform: string; niche: string
}) {
  const prompt = `Analyze the ${data.platform} account "${data.channelName}" in the "${data.niche}" niche.
Return JSON only:
{"name":"${data.channelName}","platform":"${data.platform}","estimatedSubscribers":"...","avgViews":"...","engagementRate":"...","postingFrequency":"...","contentStrategy":"...","topContentTypes":["..."],"rankingKeywords":["..."],"strengths":["..."],"weaknesses":["..."],"opportunities":["..."]}`
  const text = await callGemini(prompt)
  return parseJSON(text, null)
}

// ── Content Ideas Generator ───────────────────────────
export async function generateContentIdeas(data: {
  niche: string; platform: string; count: number; audience: string
}) {
  const prompt = `Generate ${data.count} viral content ideas for ${data.platform} in "${data.niche}" niche. Target: ${data.audience}
Return JSON only:
{"ideas":[{"title":"...","hook":"...","format":"...","viralScore":<0-100>,"difficulty":"Easy|Medium|Hard","estimatedViews":"...","hashtags":["..."],"bestPostingTime":"..."}]}`
  const text = await callGemini(prompt)
  return parseJSON(text, { ideas: [] })
}

// ── AI Dashboard Insights ─────────────────────────────
export async function getDashboardInsights(data: {
  platform: string; subscribers?: number; views?: number; niche?: string
}) {
  const prompt = `Give 4 specific actionable insights for a ${data.platform} creator with ${data.subscribers || 0} subscribers and ${data.views || 0} views.
Focus on growth, algorithm tips, content formats, monetization.
Return JSON only:
{"insights":[{"title":"...","description":"...","priority":"high|medium|low","impact":"..."}]}`
  const text = await callGemini(prompt)
  return parseJSON(text, { insights: [] })
}

export default callGemini
