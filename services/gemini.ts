// services/gemini.ts
// Server-side only — never import this on the client

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1/models'
// Try newest first; older models get retired by Google over time
const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest']

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

  let lastErr = ''
  for (const model of MODELS) {
    const res = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: messages,
        generationConfig: {
          temperature: 0.8,
          topP: 0.95,
          maxOutputTokens: 4096,
        },
      }),
    })
    if (res.ok) {
      const data: GeminiResponse = await res.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      if (text) return text
      lastErr = 'Empty response'
      continue
    }
    lastErr = await res.text()
    // 404 = model not available on this endpoint — try the next one
    if (res.status !== 404) break
  }
  throw new Error(`AI service error: ${lastErr}`)
}

// ── SEO Analysis ──────────────────────────────────────
export async function analyzeSEO(data: {
  title: string
  description: string
  tags: string[]
  platform: string
}) {
  const prompt = `
Analyze this ${data.platform} content for SEO optimization:

Title: "${data.title}"
Description: "${data.description}"
Tags: ${data.tags.join(', ')}

Return a JSON object (no markdown) with:
{
  "score": <0-100 number>,
  "titleScore": <0-100>,
  "descriptionScore": <0-100>,
  "tagsScore": <0-100>,
  "suggestions": ["suggestion1", "suggestion2", ...],
  "keywords": ["keyword1", "keyword2", ...],
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "viralScore": <0-100>,
  "engagementPrediction": "low|medium|high|viral"
}
`
  const text = await callGemini(prompt)
  try {
    return JSON.parse(text.replace(/```json|```/g, '').trim())
  } catch {
    return { score: 70, suggestions: ['Could not parse analysis'], keywords: [] }
  }
}

// ── Title Generator ───────────────────────────────────
export async function generateTitles(data: {
  topic: string
  platform: string
  style: string
  keywords: string[]
}) {
  const prompt = `
Generate 8 highly optimized ${data.platform} video/post titles for the topic: "${data.topic}"
Style: ${data.style}
Target keywords: ${data.keywords.join(', ')}

Rules:
- Optimize for ${data.platform} algorithm
- Include power words and emotional triggers
- Make them click-worthy but not clickbait
- Vary the styles (question, how-to, listicle, emotional, controversial)

Return JSON only (no markdown):
{
  "titles": [
    {"title": "...", "type": "question|how-to|listicle|emotional|number", "score": <0-100>},
    ...
  ]
}
`
  const text = await callGemini(prompt)
  try {
    return JSON.parse(text.replace(/```json|```/g, '').trim())
  } catch {
    return { titles: [{ title: data.topic, type: 'general', score: 70 }] }
  }
}

// ── Description Generator ─────────────────────────────
export async function generateDescription(data: {
  title: string
  platform: string
  keywords: string[]
  tone: string
}) {
  const prompt = `
Write a fully SEO-optimized ${data.platform} description for:
Title: "${data.title}"
Keywords to include: ${data.keywords.join(', ')}
Tone: ${data.tone}

Requirements:
- Start with a strong hook sentence
- Include keywords naturally
- Add relevant hashtags at the end for ${data.platform}
- Include a clear CTA
- Optimize for ${data.platform} search algorithm
- ${data.platform === 'YouTube' ? 'Include timestamps section placeholder' : ''}

Return plain text only (the actual description, no JSON).
`
  return await callGemini(prompt)
}

// ── Hashtag Generator ─────────────────────────────────
export async function generateHashtags(data: {
  topic: string
  platform: string
  count: number
}) {
  const prompt = `
Generate ${data.count} optimized hashtags for ${data.platform} on the topic: "${data.topic}"

Mix of:
- High volume (1M+ posts)
- Medium volume (100K-1M posts)  
- Niche/long-tail (under 100K posts)

Return JSON only:
{
  "hashtags": [
    {"tag": "#example", "volume": "high|medium|niche", "relevance": <0-100>},
    ...
  ]
}
`
  const text = await callGemini(prompt)
  try {
    return JSON.parse(text.replace(/```json|```/g, '').trim())
  } catch {
    return { hashtags: [] }
  }
}

// ── Keyword Analysis ──────────────────────────────────
export async function analyzeKeywords(data: {
  keywords: string[]
  platform: string
}) {
  const prompt = `
Analyze these ${data.platform} keywords for ranking potential:
Keywords: ${data.keywords.join(', ')}

For each keyword provide:
- Search volume estimate (Low/Medium/High/Very High)
- Competition level (Easy/Medium/Hard/Very Hard)
- Ranking percentage chance (0-100)
- Trend direction (Rising/Stable/Declining)
- Related keywords suggestions

Return JSON only:
{
  "analysis": [
    {
      "keyword": "...",
      "volume": "High",
      "competition": "Medium",
      "rankingChance": 72,
      "trend": "Rising",
      "related": ["kw1", "kw2", "kw3"]
    },
    ...
  ]
}
`
  const text = await callGemini(prompt)
  try {
    return JSON.parse(text.replace(/```json|```/g, '').trim())
  } catch {
    return { analysis: [] }
  }
}

// ── Trend Analysis ────────────────────────────────────
export async function analyzeTrends(platform: string) {
  const prompt = `
What are the TOP 10 trending topics, keywords, and content ideas on ${platform} RIGHT NOW in 2026?

For each trend include:
- Trend name/topic
- Category (Entertainment, Education, Finance, Health, etc.)
- Virality score (0-100)
- Growth rate (e.g. "+450% this week")
- Content idea based on the trend
- Best content format for this trend

Return JSON only:
{
  "trends": [
    {
      "topic": "...",
      "category": "...",
      "viralityScore": 89,
      "growth": "+450% this week",
      "contentIdea": "...",
      "format": "Short video|Long video|Reel|Post|Story"
    },
    ...
  ],
  "summary": "Brief overview of what's trending"
}
`
  const text = await callGemini(prompt)
  try {
    return JSON.parse(text.replace(/```json|```/g, '').trim())
  } catch {
    return { trends: [], summary: '' }
  }
}

// ── Competitor Analysis ───────────────────────────────
export async function analyzeCompetitor(data: {
  channelName: string
  platform: string
  niche: string
}) {
  const prompt = `
Analyze the ${data.platform} account "${data.channelName}" in the "${data.niche}" niche.

Provide:
- Estimated performance metrics
- Content strategy insights
- Posting frequency analysis
- Top content types they use
- Keywords they likely rank for
- Their strengths and weaknesses
- Opportunities for competing creators

Return JSON only:
{
  "name": "${data.channelName}",
  "platform": "${data.platform}",
  "estimatedSubscribers": "...",
  "avgViews": "...",
  "engagementRate": "...",
  "postingFrequency": "...",
  "contentStrategy": "...",
  "topContentTypes": ["..."],
  "rankingKeywords": ["..."],
  "strengths": ["..."],
  "weaknesses": ["..."],
  "opportunities": ["..."]
}
`
  const text = await callGemini(prompt)
  try {
    return JSON.parse(text.replace(/```json|```/g, '').trim())
  } catch {
    return null
  }
}

// ── Content Ideas Generator ───────────────────────────
export async function generateContentIdeas(data: {
  niche: string
  platform: string
  count: number
  audience: string
}) {
  const prompt = `
Generate ${data.count} viral content ideas for ${data.platform} in the "${data.niche}" niche.
Target audience: ${data.audience}

Return JSON only:
{
  "ideas": [
    {
      "title": "...",
      "hook": "...",
      "format": "...",
      "viralScore": <0-100>,
      "difficulty": "Easy|Medium|Hard",
      "estimatedViews": "...",
      "hashtags": ["..."],
      "bestPostingTime": "..."
    },
    ...
  ]
}
`
  const text = await callGemini(prompt)
  try {
    return JSON.parse(text.replace(/```json|```/g, '').trim())
  } catch {
    return { ideas: [] }
  }
}

// ── AI Dashboard Insights ─────────────────────────────
export async function getDashboardInsights(data: {
  platform: string
  subscribers?: number
  views?: number
  niche?: string
}) {
  const prompt = `
You are a social media growth expert. Give 4 specific, actionable insights for a creator with:
- Platform: ${data.platform}
- ${data.subscribers ? `Subscribers/Followers: ${data.subscribers.toLocaleString()}` : ''}
- ${data.views ? `Total Views: ${data.views.toLocaleString()}` : ''}
- ${data.niche ? `Niche: ${data.niche}` : ''}

Focus on: trending content formats, algorithm tips, growth hacks, and monetization opportunities.

Return JSON only:
{
  "insights": [
    {"title": "...", "description": "...", "priority": "high|medium|low", "impact": "..."},
    ...
  ]
}
`
  const text = await callGemini(prompt)
  try {
    return JSON.parse(text.replace(/```json|```/g, '').trim())
  } catch {
    return { insights: [] }
  }
}

export default callGemini

// ── Competitor Insights from REAL data ────────────────
// Takes verified YouTube stats and asks Gemini only for the
// qualitative strategy analysis — numbers stay real.
export async function generateCompetitorInsights(data: {
  name: string
  subscribers: number
  avgViews: number
  engagementRate: string
  postingFrequency: string
  recentTitles: string[]
  topTags: string[]
  niche: string
}) {
  const prompt = `
You are analyzing a REAL YouTube channel using verified data. Do not invent numbers.

Channel: ${data.name}
Subscribers: ${data.subscribers}
Average views (last 15 videos): ${data.avgViews}
Engagement rate: ${data.engagementRate}
Posting frequency: ${data.postingFrequency}
Niche: ${data.niche}
Recent video titles:
${data.recentTitles.map(t => `- ${t}`).join('\n')}
Tags they use: ${data.topTags.slice(0, 20).join(', ')}

Based on this real data, return JSON only:
{
  "contentStrategy": "2-3 sentence analysis of their content strategy",
  "topContentTypes": ["type1", "type2", "type3"],
  "rankingKeywords": ["kw1", "kw2", "kw3", "kw4", "kw5"],
  "strengths": ["...", "...", "..."],
  "weaknesses": ["...", "...", "..."],
  "opportunities": ["...", "...", "..."]
}
`
  const text = await callGemini(prompt)
  try {
    return JSON.parse(text.replace(/```json|```/g, '').trim())
  } catch {
    return {
      contentStrategy: 'Analysis unavailable', topContentTypes: [],
      rankingKeywords: [], strengths: [], weaknesses: [], opportunities: [],
    }
  }
}
