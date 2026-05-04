// pages/api/competitors/3-clone.ts
import type { NextApiRequest, NextApiResponse } from 'next'

const GEMINI_KEY = process.env.GEMINI_API_KEY!

const FALLBACK_BLUEPRINT = (channelName: string) => ({
  channelName: {
    primary: `${channelName} Academy`,
    alternatives: [`The ${channelName} Way`, `${channelName} Pro Tips`, `Learn From ${channelName}`],
    reasoning: 'Similar branding that builds on the original channel name recognition',
  },
  channelDescription: `Inspired by ${channelName}'s proven content formula. High-quality videos covering trending topics with actionable value for viewers.`,
  channelTags: ['youtube', 'viral', 'content creator', 'how to', 'tutorial', 'tips', 'trending', 'growth', 'strategy', 'beginner'],
  niche: 'Content creation and YouTube growth',
  targetAudience: 'Aspiring YouTubers and content creators aged 18-35',
  contentPillars: [
    { title: 'Tutorial Videos', description: 'Step-by-step educational content', frequency: '2x per week' },
    { title: 'Trending Topics', description: 'Timely content on viral subjects', frequency: '2x per week' },
    { title: 'Behind the Scenes', description: 'Process and growth transparency', frequency: '1x per week' },
  ],
  videoFormats: [
    { format: 'Long-form Tutorial', duration: '10-20 min', description: 'In-depth value-packed content', example: `How I Replicated ${channelName}'s Success` },
    { format: 'Quick Tips', duration: '3-7 min', description: 'Fast actionable advice', example: '5 Things That Changed My Channel' },
    { format: 'YouTube Shorts', duration: 'Under 60s', description: 'Viral short-form clips', example: 'This one trick got me 1000 subscribers' },
  ],
  uploadSchedule: 'Post Tuesday, Thursday, and Saturday at 2PM in your target timezone',
  thumbnailStyle: 'Bold contrasting colors, large readable text overlay, expressive face close-up, bright background',
  titleFormula: '[Number] + [Power Word] + [Specific Result] — Example: "7 PROVEN Ways to Get 1000 Subscribers Fast"',
  firstVideoIdeas: [
    `Why I Started a Channel Like ${channelName}`,
    'My Complete Content Strategy Revealed',
    'How to Grow Fast on YouTube in 2026',
    'The Real Secret Behind Viral Videos',
    'My First 30 Days Content Plan',
  ],
  monetizationPath: 'Build to 1K subs for monetization → YouTube Partner Program → Brand sponsorships → Digital products/courses',
  growthTips: [
    'Post consistently for 90 days without stopping',
    'Reply to every comment within the first hour of posting',
    'Collaborate with 3-5 channels in your niche per month',
    'Study your top 3 performing videos and make 10 more like them',
  ],
  estimatedTimeToResults: '3-6 months to first 1,000 subscribers with 3+ posts per week',
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const { channelName, channelData } = req.body
  if (!channelName) return res.status(400).json({ error: 'channelName required' })

  const subs = channelData?.subscriberCountFormatted || 'unknown'
  const avgViews = channelData?.avgViewsFormatted || 'unknown'
  const keywords = (channelData?.rankingKeywords || []).slice(0, 5).join(', ')
  const strategy = channelData?.contentStrategy || ''

  const prompt = `Create a YouTube channel blueprint to replicate "${channelName}" success (${subs} subs, ${avgViews} avg views).
Strategy: ${strategy}
Keywords: ${keywords}

Return ONLY valid JSON, no markdown, no code blocks, no explanation. Start with { and end with }:
{"channelName":{"primary":"name here","alternatives":["alt1","alt2","alt3"],"reasoning":"reason"},"channelDescription":"description 200 chars","channelTags":["t1","t2","t3","t4","t5","t6","t7","t8","t9","t10"],"niche":"niche","targetAudience":"audience","contentPillars":[{"title":"p1","description":"desc","frequency":"Nx/week"},{"title":"p2","description":"desc","frequency":"Nx/week"},{"title":"p3","description":"desc","frequency":"Nx/week"}],"videoFormats":[{"format":"f1","duration":"X-Y min","description":"desc","example":"title"},{"format":"f2","duration":"X-Y min","description":"desc","example":"title"},{"format":"f3","duration":"X-Y min","description":"desc","example":"title"}],"uploadSchedule":"schedule","thumbnailStyle":"style guide","titleFormula":"formula with example","firstVideoIdeas":["idea1","idea2","idea3","idea4","idea5"],"monetizationPath":"path","growthTips":["tip1","tip2","tip3","tip4"],"estimatedTimeToResults":"timeline"}`

  // Try to get AI blueprint
  const models = ['gemini-2.5-flash', 'gemini-1.5-flash']

  for (const model of models) {
    try {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 2000 },
          }),
        }
      )

      if (!geminiRes.ok) continue

      const data = await geminiRes.json()
      let text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

      // Strip any markdown fences
      text = text.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim()

      const s = text.indexOf('{')
      const e = text.lastIndexOf('}')

      if (s !== -1 && e !== -1) {
        try {
          const blueprint = JSON.parse(text.slice(s, e + 1))
          return res.status(200).json({ blueprint, channelName })
        } catch {
          // JSON parse failed, try next model
          continue
        }
      }
    } catch {
      continue
    }
  }

  // All models failed — return fallback blueprint (never show error to user)
  console.log('Using fallback blueprint for:', channelName)
  return res.status(200).json({
    blueprint: FALLBACK_BLUEPRINT(channelName),
    channelName,
  })
}
