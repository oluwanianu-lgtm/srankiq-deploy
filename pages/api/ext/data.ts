// pages/api/ext/data.ts — PUBLIC (CORS) endpoint powering the SRankIQ Chrome extension.
import type { NextApiRequest, NextApiResponse } from 'next'
import {
  resolveChannel, getPublicChannelVideos, searchTopVideos, getVideoDetails, batchVideoStats,
} from '../../../services/youtube'
import { callGemini, safeJSON } from '../../../services/gemini'

function cors(res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

function monetizationEstimate(subs: number, views: number, videoCount: number) {
  const meetsSubs = subs >= 1000
  const enoughVideos = videoCount >= 3
  let likelihood = 0
  if (meetsSubs) likelihood += 50
  if (subs >= 10000) likelihood += 20
  if (views >= 500000) likelihood += 20
  if (enoughVideos) likelihood += 10
  likelihood = Math.min(100, likelihood)
  return { eligible: meetsSubs && enoughVideos, likelihood,
    note: 'Estimate from public signals (subs, views).' }
}

function scoreVideoSEO(v: any) {
  const checks: { label: string; ok: boolean; weight: number }[] = []
  const title = v.title || '', desc = v.description || '', tags = v.tags || []
  checks.push({ label: 'Title 40–70 chars', ok: title.length >= 40 && title.length <= 70, weight: 15 })
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

function deriveRelated(vids: any[], seed: string) {
  const stop = new Set(['the','a','an','to','of','in','on','for','and','with','how','best','your','you','my','this','is','are'])
  const phrases: Record<string, number> = {}
  vids.forEach(v => {
    const words = (v.title || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter((w: string) => w && !stop.has(w) && w.length > 2)
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = words[i] + ' ' + words[i + 1]
      if (bigram !== seed.toLowerCase()) phrases[bigram] = (phrases[bigram] || 0) + 1
    }
  })
  return Object.entries(phrases).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([phrase, n]) => ({ keyword: phrase, score: Math.min(99, 40 + n * 8) }))
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
      // est. monthly earnings — rough: recent monthly views * RPM range ($1.5–4 per 1k)
      const monthlyViews = Math.round(ch.views / Math.max(1, ((Date.now() - new Date(ch.publishedAt).getTime()) / (30 * 864e5))))
      const estLow = Math.round(monthlyViews / 1000 * 1.5)
      const estHigh = Math.round(monthlyViews / 1000 * 4)
      return res.status(200).json({
        channel: ch,
        analytics: { subscribers: ch.subscribers, totalViews: ch.views, videoCount: ch.videoCount, avgViews, createdAt: ch.publishedAt, country: ch.country || 'Unknown', monthlyViews, estLow, estHigh },
        monetization: monetizationEstimate(ch.subscribers, ch.views, ch.videoCount),
      })
    }

    if (action === 'channelVideos') {
      const id = String(req.query.id || '')
      if (!id) return res.status(400).json({ error: 'id required' })
      return res.status(200).json({ videos: await getPublicChannelVideos(id, 12) })
    }

    if (action === 'similarChannels') {
      const q = String(req.query.q || '')
      if (!q) return res.status(400).json({ error: 'q required' })
      const data = await searchTopVideos(q)
      const seen = new Set<string>(); const channels: any[] = []
      for (const v of (data.videos || [])) {
        if (v.channelId && !seen.has(v.channelId)) { seen.add(v.channelId); channels.push({ id: v.channelId, name: v.channel, thumbnail: v.thumbnail }) }
        if (channels.length >= 10) break
      }
      return res.status(200).json({ channels })
    }

    if (action === 'similarVideos') {
      const q = String(req.query.q || '')
      if (!q) return res.status(400).json({ error: 'q required' })
      const data = await searchTopVideos(q)
      return res.status(200).json({ videos: (data.videos || []).slice(0, 12) })
    }

    if (action === 'video') {
      const id = String(req.query.id || '')
      if (!id) return res.status(400).json({ error: 'id required' })
      const video = await getVideoDetails(id)
      return res.status(200).json({ video, seo: scoreVideoSEO(video) })
    }

    if (action === 'keyword') {
      const q = String(req.query.q || '')
      if (!q) return res.status(400).json({ error: 'q required' })
      const data = await searchTopVideos(q)
      const vids = data.videos || []
      const views = vids.map((v: any) => v.views || 0)
      const avgViews = views.length ? Math.round(views.reduce((s: number, x: number) => s + x, 0) / views.length) : 0
      const highestViews = views.length ? Math.max(...views) : 0
      const totalResults = vids.length
      const competition = Math.min(100, Math.round(Math.log10(Math.max(1, avgViews)) * 14))
      const score = Math.max(1, Math.min(100, Math.round((Math.log10(Math.max(1, avgViews)) * 12) - competition * 0.3 + 40)))
      const ql = q.toLowerCase()
      const inTitle = vids.filter((v: any) => (v.title || '').toLowerCase().includes(ql.split(' ')[0])).length
      const last7 = vids.filter((v: any) => (Date.now() - new Date(v.publishedAt).getTime()) < 7 * 864e5).length
      const ages = vids.map((v: any) => (Date.now() - new Date(v.publishedAt).getTime()) / (30 * 864e5))
      const avgAgeMonths = ages.length ? Math.round(ages.reduce((s: number, x: number) => s + x, 0) / ages.length) : 0
      const freq: Record<string, number> = {}
      const tagViews: Record<string, number[]> = {}
      vids.forEach((v: any) => (v.tags || []).forEach((t: string) => {
        const k = t.toLowerCase().trim()
        if (k) { freq[k] = (freq[k] || 0) + 1; (tagViews[k] = tagViews[k] || []).push(v.views || 0) }
      }))
      // estimated monthly search volume: derived from how often a tag appears across top videos
      // and the average views those videos pull. Heuristic (labeled estimate, not from API).
      const recommendedTags = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([tag, n]) => {
        const vs = tagViews[tag] || []
        const avgV = vs.length ? vs.reduce((s, x) => s + x, 0) / vs.length : 0
        // estimate: frequency weight × view-demand signal, scaled to a plausible monthly-search range
        const estVolume = Math.round((n / vids.length) * Math.sqrt(avgV) * 9)
        return { tag, usedBy: n, estVolume }
      })
      const chSeen: Record<string, { name: string; views: number; id: string }> = {}
      vids.forEach((v: any) => { if (v.channelId) { if (!chSeen[v.channelId]) chSeen[v.channelId] = { name: v.channel, views: 0, id: v.channelId }; chSeen[v.channelId].views += v.views || 0 } })
      const topChannels = Object.values(chSeen).sort((a, b) => b.views - a.views).slice(0, 6)
      const related = deriveRelated(vids, q)
      return res.status(200).json({ keyword: q, avgViews, highestViews, totalResults, competition, score, inTitle, last7, sampleSize: vids.length, avgAgeMonths, recommendedTags, topChannels, related })
    }

    if (action === 'batch') {
      const ids = String(req.query.ids || '').split(',').filter(Boolean).slice(0, 20)
      if (!ids.length) return res.status(400).json({ error: 'ids required' })
      return res.status(200).json({ videos: await batchVideoStats(ids) })
    }

    if (action === 'suggestNiche') {
      // AI niche finder — user describes their interest, we suggest niches + keywords
      const desc = String(req.query.desc || '')
      if (!desc) return res.status(400).json({ error: 'desc required' })
      let result: any = { niches: [] }
      try {
        const raw = await callGemini(
          `A new YouTuber says: "${desc}". Suggest 4 specific, monetizable YouTube niches for them. ` +
          `For each niche give: a short name, a one-line reason it's profitable, an estimated RPM tier (low/medium/high), ` +
          `and 4 search keywords they should research. Return ONLY valid JSON: ` +
          `[{"niche":"...","reason":"...","rpm":"high","keywords":["..","..","..",".."]}]. No commentary.`
        )
        const parsed = safeJSON(raw)
        if (Array.isArray(parsed)) result.niches = parsed.slice(0, 4)
      } catch { /* fallback below */ }
      if (!result.niches.length) {
        result.niches = [{ niche: desc, reason: 'Based on your interest', rpm: 'medium',
          keywords: [desc, `${desc} for beginners`, `best ${desc}`, `how to ${desc}`] }]
      }
      return res.status(200).json(result)
    }

    if (action === 'channelNiche') {
      // auto-detect a channel's niche from its recent video tags/titles
      const id = String(req.query.id || '')
      if (!id) return res.status(400).json({ error: 'id required' })
      const vids = await getPublicChannelVideos(id, 15)
      const freq: Record<string, number> = {}
      vids.forEach((v: any) => (v.tags || []).forEach((t: string) => { const k = t.toLowerCase().trim(); if (k.length > 2) freq[k] = (freq[k] || 0) + 1 }))
      const topTags = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t]) => t)
      let niche = topTags[0] || ''
      try {
        const raw = await callGemini(
          `These are a YouTube channel's most common video tags: ${topTags.join(', ')}. ` +
          `In 2-4 words, what niche is this channel? Return ONLY the niche name, nothing else.`
        )
        if (raw && raw.trim().length < 40) niche = raw.trim().replace(/["\n.]/g, '')
      } catch {}
      return res.status(200).json({ niche, topTags })
    }

    return res.status(400).json({ error: 'unknown action' })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
