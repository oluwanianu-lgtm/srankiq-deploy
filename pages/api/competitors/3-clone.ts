// pages/api/competitors/3-clone.ts
import type { NextApiRequest, NextApiResponse } from 'next'

const GEMINI_KEY = process.env.GEMINI_API_KEY!

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const { channelName, channelData } = req.body
  if (!channelName) return res.status(400).json({ error: 'channelName required' })

  const subs = channelData?.subscriberCountFormatted || 'unknown'
  const avgViews = channelData?.avgViewsFormatted || 'unknown'
  const keywords = (channelData?.rankingKeywords || []).slice(0, 5).join(', ')
  const strategy = channelData?.contentStrategy || ''
  const topVideos = (channelData?.trendingVideos || []).slice(0, 3).map((v: any) => v.title).join(', ')

  // Add random seed to ensure different results each time
  const seed = Math.random().toString(36).slice(2, 8)
  const angles = [
    'Focus on a unique personal angle and storytelling style',
    'Focus on higher production value and cinematic quality',
    'Focus on comedy and entertainment elements',
    'Focus on educational depth and expert positioning',
    'Focus on controversy and bold opinions',
    'Focus on community building and audience interaction',
    'Focus on trending topics and news-jacking',
    'Focus on niche expertise and specialization',
  ]
  const randomAngle = angles[Math.floor(Math.random() * angles.length)]

  const prompt = `Create a UNIQUE and CREATIVE YouTube channel blueprint inspired by "${channelName}" (${subs} subs, ${avgViews} avg views).

Real channel data:
- Strategy: ${strategy}
- Top keywords: ${keywords}
- Popular videos: ${topVideos}

IMPORTANT: Generate FRESH, ORIGINAL ideas. Do NOT copy the original channel directly. 
Differentiation angle: ${randomAngle}
Variation seed: ${seed}

Return ONLY valid JSON, no markdown, no code blocks:
{"channelName":{"primary":"creative unique name NOT copying ${channelName}","alternatives":["alt1","alt2","alt3"],"reasoning":"why this name stands out"},"channelDescription":"compelling channel description 200-250 chars with keywords","channelTags":["tag1","tag2","tag3","tag4","tag5","tag6","tag7","tag8","tag9","tag10"],"niche":"very specific niche focus","targetAudience":"detailed audience description","contentPillars":[{"title":"pillar 1","description":"unique content angle","frequency":"Nx/week"},{"title":"pillar 2","description":"unique content angle","frequency":"Nx/week"},{"title":"pillar 3","description":"unique content angle","frequency":"Nx/week"}],"videoFormats":[{"format":"format name","duration":"X-Y min","description":"specific description","example":"specific creative title"},{"format":"format name","duration":"X-Y min","description":"specific description","example":"specific creative title"},{"format":"format name","duration":"X-Y min","description":"specific description","example":"specific creative title"}],"uploadSchedule":"very specific schedule with days and times","thumbnailStyle":"detailed unique thumbnail design guide","titleFormula":"specific formula with 3 real example titles","firstVideoIdeas":["specific idea 1 with full title","specific idea 2 with full title","specific idea 3 with full title","specific idea 4 with full title","specific idea 5 with full title"],"monetizationPath":"detailed monetization strategy with timeline","growthTips":["very specific tip 1","very specific tip 2","very specific tip 3","very specific tip 4"],"estimatedTimeToResults":"realistic timeline with milestones","uniqueEdge":"what makes this channel different from ${channelName}"}`

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
            // High temperature = more creative/varied output each time
            generationConfig: { temperature: 0.95, maxOutputTokens: 2000, topP: 0.95, topK: 40 },
          }),
        }
      )
      if (!geminiRes.ok) continue
      const data = await geminiRes.json()
      let text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      text = text.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim()
      const s = text.indexOf('{'), e = text.lastIndexOf('}')
      if (s === -1 || e === -1) continue
      try {
        const blueprint = JSON.parse(text.slice(s, e + 1))
        return res.status(200).json({ blueprint, channelName })
      } catch { continue }
    } catch { continue }
  }

  // Fallback with randomness
  const fallbackNames = [
    `${channelName} Unlocked`, `Beyond ${channelName}`, `The ${channelName} Method`,
    `${channelName} Decoded`, `Next Level Like ${channelName}`, `${channelName} Blueprint`
  ]
  const fallbackIdeas = [
    `I Tried ${channelName}'s Exact Formula For 30 Days — Here's What Happened`,
    `Why ${channelName} Gets Millions of Views (The Real Secret)`,
    `I Copied ${channelName}'s Upload Schedule For a Week`,
    `What ${channelName} Does That Nobody Talks About`,
    `The ${channelName} Content Strategy Broken Down Step by Step`,
  ]

  return res.status(200).json({
    channelName,
    blueprint: {
      channelName: {
        primary: fallbackNames[Math.floor(Math.random() * fallbackNames.length)],
        alternatives: fallbackNames.slice(0, 3),
        reasoning: `Builds on ${channelName}'s brand recognition while establishing unique identity`,
      },
      channelDescription: `Taking inspiration from ${channelName}'s proven formula — but with our own unique twist. ${keywords ? 'Covering ' + keywords + '.' : ''} Fresh perspective, real results.`,
      channelTags: ['youtube', 'viral', keywords.split(', ')[0] || 'content', 'creator', 'tips', 'trending', 'growth', 'tutorial', 'how-to', 'strategy'],
      niche: `${channelName}-inspired content with a fresh angle`,
      targetAudience: `Fans of ${channelName}-style content who want a fresh perspective`,
      contentPillars: [
        { title: 'Tutorial Deep Dives', description: 'In-depth educational content', frequency: '2x/week' },
        { title: 'Trending Reactions', description: 'Fast response to viral topics', frequency: '2x/week' },
        { title: 'Behind The Scenes', description: 'Creator journey and process', frequency: '1x/week' },
      ],
      videoFormats: [
        { format: 'Long-form Tutorial', duration: '10-20 min', description: 'Educational deep dive', example: fallbackIdeas[0] },
        { format: 'Quick Tips', duration: '3-7 min', description: 'Fast actionable advice', example: fallbackIdeas[1] },
        { format: 'Shorts', duration: 'Under 60s', description: 'Viral clips from main videos', example: 'One tip that changed everything' },
      ],
      uploadSchedule: 'Tuesday, Thursday at 2PM and Saturday at 10AM in your audience timezone',
      thumbnailStyle: 'Bold text, bright background, expressive reaction face close-up, high contrast colors',
      titleFormula: '[Number] + [Power Word] + [Specific Result] | Examples: "7 Ways to Get 10K Subs Fast" / "I Did This For 30 Days And..." / "The Secret ${channelName} Never Told You"',
      firstVideoIdeas: fallbackIdeas,
      monetizationPath: '0-1K subs: Build audience → 1K-10K: Brand deals → 10K+: YouTube Partner Program + digital products',
      growthTips: [
        `Post consistently for 90 days — this is non-negotiable`,
        `Engage with ${channelName}'s audience in their comments`,
        `Collaborate with 2-3 similar-sized channels per month`,
        `Repurpose every long video into 3-5 Shorts`,
      ],
      estimatedTimeToResults: '1K subs in 3 months, 10K in 6-9 months with 3+ posts/week',
      uniqueEdge: `More personal, more niche-focused version of what ${channelName} does — but with your unique voice`,
    }
  })
}
