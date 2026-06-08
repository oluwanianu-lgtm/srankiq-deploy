// pages/api/ext/data.ts — PUBLIC (CORS) endpoint powering the SRankIQ Chrome extension.
// No Firebase auth: the extension is unauthenticated. The YouTube API key stays server-side.
import type { NextApiRequest, NextApiResponse } from 'next'
import {
  resolveChannel, getPublicChannelVideos, searchTopVideos, getVideoDetails,
} from '../../../services/youtube'

// VidIQ-style SEO score from real video metadata
function scoreVideoSEO(v: any) {
  const checks: { label: string; ok: boolean; weight: number }[] = []
  const title = v.title || '', desc = v.description || '', tags = v.tags || []
  checks.push({ label: 'Title length 40–70 chars', ok: title.length >= 40 && title.length <= 70, weight: 15 })
  checks.push({ label: 'Number in title', ok: /\d/.test(title), weight: 8 })
  checks.push({ label: 'Power/curiosity word', ok: /how|why|best|top|secret|ultimate|\?|!/i.test(title), weight: 8 })
  checks.push({ label: 'Description 200+ chars', ok: desc.length >= 200, weight: 15 })
  checks.push({ label: 'Link in description', ok: /https?:\/\//.test(desc), weight: 8 })
  checks.push({ label: 'Timestamps/chapters', ok: /\d{1,2}:\d{2}/.test(desc), weight: 8 })
  checks.push({ label: '10+ tags', ok: tags.length >= 10, weight: 20 })
  checks.push({ label: 'Has any tags', ok: tags.length > 0, weight: 18 })
  const earned = checks.filter(c => c.ok).reduce((s, c) => s + c.weight, 0)
  const total = checks.reduce((s, c) => s + c.weight, 0)
  const score = Math.round((earned / total) * 100)
  return { score, checks, grade: score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D' }
}

function cors(res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

// Monetization is an ESTIMATE — there is no official "is monetized" API.
// We infer eligibility from public signals and clearly label it as an estimate.
function monetizationEstimate(subs: number, views: number, videoCount: number) {
  const meetsSubs = subs >= 1000
  const enoughVideos = videoCount >= 3
  // YPP needs 1k subs + (4k watch hours OR 10M Shorts views in 90d) — we can't see watch hours,
  // so we approximate likelihood from subs + total views as a proxy. Labeled as estimate.
  let likelihood = 0
  if (meetsSubs) likelihood += 50
  if (subs >= 10000) likelihood += 20
  if (views >= 500000) likelihood += 20
  if (enoughVideos) likelihood += 10
  likelihood = Math.min(100, likelihood)
  return {
    eligible: meetsSubs && enoughVideos,
    likelihood,
    note: 'Estimate from public signals (subs, views). YouTube does not expose true monetization status via API.',
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  try {
    const action = String(req.query.action || '')

    if (action === 'channel') {
      const q = String(req.query.q || '')
      if (!q) return res.status(400).json({ error: 'q required' })
      const ch = await resolveChannel(q)
      if (!ch) return res.status(404).json({ error: 'Channel not found' })
      const avgViews = ch.videoCount ? Math.round(ch.views / ch.videoCount) : 0
      return res.status(200).json({
        channel: ch,
        analytics: {
          subscribers: ch.subscribers, totalViews: ch.views, videoCount: ch.videoCount,
          avgViews, createdAt: ch.publishedAt, country: ch.country || 'Unknown',
        },
        monetization: monetizationEstimate(ch.subscribers, ch.views, ch.videoCount),
      })
    }

    if (action === 'channelVideos') {
      const id = String(req.query.id || '')
      if (!id) return res.status(400).json({ error: 'id required' })
      return res.status(200).json({ videos: await getPublicChannelVideos(id, 12) })
    }

    if (action === 'similarChannels') {
      // search channels by the seed keyword (e.g. the current channel's name/topic)
      const q = String(req.query.q || '')
      if (!q) return res.status(400).json({ error: 'q required' })
      const vids = await searchTopVideos(q)
      // collect unique channels from top results
      const seen = new Set<string>()
      const channels: any[] = []
      for (const v of (vids.videos || vids || [])) {
        const cid = v.channelId
        if (cid && !seen.has(cid)) {
          seen.add(cid)
          channels.push({ id: cid, name: v.channel, thumbnail: v.channelThumbnail || v.thumbnail })
        }
        if (channels.length >= 10) break
      }
      return res.status(200).json({ channels })
    }

    if (action === 'similarVideos') {
      const q = String(req.query.q || '')
      if (!q) return res.status(400).json({ error: 'q required' })
      const vids = await searchTopVideos(q)
      return res.status(200).json({ videos: (vids.videos || vids || []).slice(0, 12) })
    }

    if (action === 'video') {
      const id = String(req.query.id || '')
      if (!id) return res.status(400).json({ error: 'id required' })
      const video = await getVideoDetails(id)
      // VidIQ-style SEO score computed from real metadata
      const seo = scoreVideoSEO(video)
      return res.status(200).json({ video, seo })
    }

    if (action === 'keyword') {
      // live keyword stats from real search results
      const q = String(req.query.q || '')
      if (!q) return res.status(400).json({ error: 'q required' })
      const data = await searchTopVideos(q)
      const vids = data.videos || []
      const views = vids.map((v: any) => v.views || 0)
      const avgViews = views.length ? Math.round(views.reduce((s: number, x: number) => s + x, 0) / views.length) : 0
      const totalResults = vids.length
      // competition: more high-view videos = harder
      const competition = Math.min(100, Math.round(Math.log10(Math.max(1, avgViews)) * 14))
      const score = Math.max(1, Math.min(100, Math.round((Math.log10(Math.max(1, avgViews)) * 12) - competition * 0.3 + 40)))
      // tag suggestions from the top videos' real tags (frequency)
      const freq: Record<string, number> = {}
      vids.forEach((v: any) => (v.tags || []).forEach((t: string) => { const k = t.toLowerCase().trim(); if (k) freq[k] = (freq[k] || 0) + 1 }))
      const recommendedTags = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([tag, n]) => ({ tag, usedBy: n }))
      return res.status(200).json({ keyword: q, avgViews, totalResults, competition, score, recommendedTags })
    }

    return res.status(400).json({ error: 'unknown action' })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
