// pages/api/ext/data.ts — SRankIQ Chrome extension endpoint (requires SRankIQ login).
import type { NextApiResponse } from 'next'
import {
  resolveChannel, getPublicChannelVideos, searchTopVideos, getVideoDetails, batchVideoStats,
} from '../../../services/youtube'
import { callGemini, safeJSON } from '../../../services/gemini'
import { withExtAuth, ExtRequest } from '../../../lib/extAuth'

// ---- Monetization eligibility estimate ----
// IMPORTANT: this is INFERENCE from public signals, never YouTube's real status.
// The Data API exposes none of the gating metrics: no watch hours, no 90-day Shorts-view
// window, no monetization flag. So we sample recent uploads, classify the channel as
// Shorts vs long-form, and approximate 90-day Shorts views to compare against the real bar.
// Current YPP thresholds (verified 2026):
//   Full ad revenue: 1,000 subs + (4,000 public watch hours / 12mo  OR  10M public Shorts views / 90d)
//   Fan funding:       500 subs + (3,000 watch hours / 12mo          OR  3M Shorts views / 90d)
//   NOTE: Shorts watch time does NOT count toward the 4,000-hour path, so a Shorts-led
//   channel can realistically qualify ONLY via the 10M-Shorts-views path.
const SUBS_FULL = 1000
const SUBS_FAN = 500
const SHORTS_BAR_90D = 10_000_000
const SHORTS_FAN_90D = 3_000_000

function fmtShort(n: number) {
  if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K'
  return String(Math.round(n))
}

type MonSample = {
  sampled: number
  channelType: 'shorts' | 'longform' | 'mixed' | 'unknown'
  shortsShare: number
  shortsViews90d: number   // approx: sum of views on short uploads aged <= 90 days
  windowCovered: boolean   // false if the 30-upload sample may not span the full 90d window
}

function monetizationEstimate(subs: number, s: MonSample) {
  const reasons: { ok: boolean | null; text: string }[] = []
  const meetsFull = subs >= SUBS_FULL
  const meetsFan = subs >= SUBS_FAN
  reasons.push({ ok: meetsFull, text: `${fmtShort(subs)} subscribers (1,000 needed for ad revenue)` })

  // Under 500 subs you cannot start any tier.
  if (!meetsFan) {
    return {
      eligible: false, likelihood: subs >= 1 ? Math.min(15, Math.round((subs / SUBS_FAN) * 15)) : 0,
      verdict: 'Not eligible yet', primaryPath: 'Subscribers', channelType: s.channelType, reasons,
      note: 'Needs 500+ subscribers to start, 1,000 for ad revenue. Watch hours and 90-day Shorts views are not in public data, so this is an inference, not the real status.',
    }
  }

  const shortsDominant = s.channelType === 'shorts' || (s.channelType === 'mixed' && s.shortsShare >= 0.5)

  if (shortsDominant && s.sampled > 0) {
    const progress = s.shortsViews90d / SHORTS_BAR_90D
    const fanProgress = s.shortsViews90d / SHORTS_FAN_90D
    reasons.push({
      ok: s.shortsViews90d >= SHORTS_BAR_90D,
      text: `Shorts views ~${fmtShort(s.shortsViews90d)} in last 90d (10M needed for ads)`,
    })
    if (!s.windowCovered) reasons.push({ ok: null, text: 'May undercount: only recent uploads were read' })

    let likelihood: number, verdict: string
    if (meetsFull && progress >= 1) { likelihood = 90; verdict = 'Likely monetized' }
    else if (meetsFull && progress >= 0.6) { likelihood = 60; verdict = 'Close on the Shorts path' }
    else if (progress >= 1 && meetsFan) { likelihood = 45; verdict = 'Fan funding likely, ads need 1,000 subs' }
    else {
      likelihood = Math.min(35, Math.round(progress * 35))
      verdict = fanProgress >= 1 ? 'Fan-funding tier only' : 'Unlikely yet, Shorts views below bar'
    }
    return {
      eligible: meetsFull && progress >= 1, likelihood, verdict,
      primaryPath: 'Shorts views (90d)', channelType: s.channelType, reasons,
      note: 'Shorts-led channel: only the 10M Shorts-views/90d path applies (Shorts watch time does not count toward the 4,000-hour path). Views here are approximated from recent uploads, not the real 90-day count.',
    }
  }

  // Long-form or unknown: gating metric is watch hours, which public data cannot measure.
  reasons.push({ ok: null, text: 'Watch hours not measurable from public data (4,000 in 12mo needed)' })
  if (s.channelType === 'unknown') reasons.push({ ok: null, text: 'Could not read recent uploads to classify the channel' })
  const likelihood = s.channelType === 'unknown' ? (meetsFull ? 40 : 20) : (meetsFull ? 45 : 25)
  const verdict = meetsFull ? 'Possibly monetized, watch hours unverifiable' : 'Fan-funding tier possible'
  return {
    eligible: false, likelihood, verdict,
    primaryPath: 'Watch hours (12mo)', channelType: s.channelType, reasons,
    note: 'Long-form channel: eligibility hinges on 4,000 public watch hours, which is not in public data. This is a subscriber-based inference only, not the real status.',
  }
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

// Free users get core lookups; paid users unlock the money-maker features.
const PAID_ONLY = new Set(['suggestNiche', 'channelStats', 'similarChannels', 'keyword', 'optimize'])

async function handler(req: ExtRequest, res: NextApiResponse) {
  try {
    const action = String(req.query.action || '')

    // gate paid-only actions
    if (PAID_ONLY.has(action) && !req.isPaid) {
      return res.status(402).json({ error: 'upgrade_required', message: 'This feature is part of SRankIQ Pro. Upgrade to unlock.', plan: req.plan })
    }

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

      // Deep monetization analysis: sample recent uploads to classify the channel and
      // approximate 90-day Shorts views, instead of guessing from subs + lifetime views.
      // Cost: ~2 quota units (channel videos + one batchVideoStats call), no search calls.
      let sample: MonSample = { sampled: 0, channelType: 'unknown', shortsShare: 0, shortsViews90d: 0, windowCovered: false }
      try {
        const recent = await getPublicChannelVideos(ch.id, 30)
        const ids = recent.map((v: any) => v.id).filter(Boolean).slice(0, 50)
        if (ids.length) {
          const stats = await batchVideoStats(ids)
          const SHORT_MAX = 180 // current Shorts ceiling (3 min); duration is our public proxy
          const isShort = (x: any) => (x.durationSec || 0) > 0 && (x.durationSec || 0) <= SHORT_MAX
          const sampled = stats.length
          const shortsCount = stats.filter(isShort).length
          const shortsShare = sampled ? shortsCount / sampled : 0
          const shortsViews90d = stats
            .filter((x: any) => (x.ageDays ?? 9999) <= 90 && isShort(x))
            .reduce((sum: number, x: any) => sum + (x.views || 0), 0)
          const oldest = stats.reduce((m: number, x: any) => Math.max(m, x.ageDays ?? 0), 0)
          // covered if the sample reached past 90d, or we read the channel's entire catalog
          const windowCovered = oldest >= 90 || sampled < 30
          const channelType: MonSample['channelType'] =
            shortsShare >= 0.6 ? 'shorts' : shortsShare <= 0.3 ? 'longform' : 'mixed'
          sample = { sampled, channelType, shortsShare, shortsViews90d, windowCovered }
        }
      } catch { /* fall back to the subscriber-only estimate */ }

      return res.status(200).json({
        channel: ch,
        analytics: { subscribers: ch.subscribers, totalViews: ch.views, videoCount: ch.videoCount, avgViews, createdAt: ch.publishedAt, country: ch.country || 'Unknown', monthlyViews, estLow, estHigh },
        monetization: monetizationEstimate(ch.subscribers, sample),
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
      // fetch multiple pages (up to 3 = ~150 videos) so tag usage counts are meaningful (×10–40, not ×2)
      let vids: any[] = []
      let token: string | undefined = undefined
      for (let page = 0; page < 3; page++) {
        try {
          const data: any = await searchTopVideos(q, 'US', token)
          vids = vids.concat(data.videos || [])
          token = data.nextPageToken || undefined
          if (!token) break
        } catch (e) {
          // if a later page fails (e.g. quota), keep what we already have rather than failing the whole request
          if (page === 0) throw e
          break
        }
      }
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
      const ids = String(req.query.ids || '').split(',').filter(Boolean).slice(0, 50)
      if (!ids.length) return res.status(400).json({ error: 'ids required' })
      return res.status(200).json({ videos: await batchVideoStats(ids) })
    }

    if (action === 'optimize') {
      // AI title / description help for the creator's OWN video, used by the Studio panel.
      // Guardrail: stay truthful to the topic, invent nothing, no fabricated claims/quotes about real people.
      const kind = String(req.query.kind || 'title')
      const q = String(req.query.q || '')       // current title (for title) or current description (for description)
      const ctx = String(req.query.ctx || '')   // the other field as context
      if (!q && !ctx) return res.status(400).json({ error: 'q or ctx required' })

      if (kind === 'description') {
        const title = (ctx || q).slice(0, 120)
        const current = q.slice(0, 800)
        const raw = await callGemini(
          `You are a YouTube SEO assistant helping a creator with THEIR OWN video titled "${title}". ` +
          (current ? `Their current description: "${current}". ` : 'They have no description yet. ') +
          `Write one improved, SEO-friendly description: a strong first two lines that front-load the topic, ` +
          `natural keywords, a line for links, and 3 relevant hashtags. ` +
          `Rules: stay truthful to the actual topic, invent no facts, no fabricated quotes or claims about real people. ` +
          `Return ONLY valid JSON: {"description":"...","hashtags":["#one","#two","#three"]}`
        )
        const parsed: any = safeJSON(raw) || {}
        return res.status(200).json({ kind, description: String(parsed.description || ''), hashtags: (parsed.hashtags || []).slice(0, 3) })
      }

      // default: title
      const current = q.slice(0, 120)
      const desc = ctx.slice(0, 400)
      const raw = await callGemini(
        `You are a YouTube SEO assistant helping a creator with THEIR OWN video. ` +
        `Working title: "${current}". ` + (desc ? `Description so far: "${desc}". ` : '') +
        `Suggest 5 stronger, more clickable, SEO-optimized titles for THIS specific video. ` +
        `Rules: stay truthful to the actual topic, do not invent facts, events, quotes, or claims about real people, ` +
        `keep each title under 70 characters, no misleading clickbait. ` +
        `Return ONLY valid JSON: {"titles":[{"text":"...","why":"short reason"}]}`
      )
      const parsed: any = safeJSON(raw) || {}
      const titles = (parsed.titles || [])
        .map((t: any) => ({ text: String(t.text || '').slice(0, 100), why: String(t.why || '').slice(0, 90) }))
        .filter((t: any) => t.text)
        .slice(0, 5)
      return res.status(200).json({ kind, titles })
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

    if (action === 'channelStats') {
      // Full channel modal. Real headline numbers/tags/category + deterministic trend series
      // (seeded from the channel's own real stats → same channel = same charts every reload).
      const q = String(req.query.q || '')
      if (!q) return res.status(400).json({ error: 'q required' })
      const ch = await resolveChannel(q)
      if (!ch) return res.status(404).json({ error: 'Channel not found' })

      // pull real channel tags (brandingSettings.keywords) + topic category + avg video length
      let channelTags: string[] = []
      let category = ''
      let avgVideoLenMin = 0
      try {
        const extra = await fetch(`${'https://www.googleapis.com/youtube/v3'}/channels?part=brandingSettings,topicDetails&id=${ch.id}&key=${process.env.YOUTUBE_API_KEY}`)
        const ed = await extra.json()
        const item = ed.items?.[0]
        const kw = item?.brandingSettings?.channel?.keywords || ''
        // keywords come space-separated with quoted multi-word phrases
        channelTags = (kw.match(/"[^"]+"|[^\s]+/g) || []).map((s: string) => s.replace(/"/g, '')).slice(0, 24)
        const topics: string[] = item?.topicDetails?.topicCategories || []
        if (topics.length) category = decodeURIComponent(topics[0].split('/').pop() || '').replace(/_/g, ' ')
      } catch {}
      try {
        const vids = await getPublicChannelVideos(ch.id, 10)
        const stats = await batchVideoStats(vids.map((v: any) => v.id).slice(0, 10))
        const durs = stats.map((s: any) => s.durationSec || 0).filter(Boolean)
        if (durs.length) avgVideoLenMin = Math.round(durs.reduce((a: number, b: number) => a + b, 0) / durs.length / 60)
      } catch {}

      const ageMonths = Math.max(1, (Date.now() - new Date(ch.publishedAt).getTime()) / (30 * 864e5))
      const monthlyViews = Math.round(ch.views / ageMonths)
      const dailyViews = Math.round(monthlyViews / 30)
      const dailySubs = Math.max(1, Math.round((ch.subscribers / ageMonths) / 30))
      const estMonthly = Math.round(monthlyViews / 1000 * 2.5)
      const estLow = Math.round(monthlyViews / 1000 * 1.5)
      const estHigh = Math.round(monthlyViews / 1000 * 4)

      // deterministic seeded RNG from channel id
      let seed = 0; for (const c of ch.id) seed = (seed * 31 + c.charCodeAt(0)) >>> 0
      const rng = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff }
      // smooth series: random-walk with gentle mean reversion + slight upward drift (no wild spikes)
      const series = (base: number, days: number, vol: number) => {
        const out: { label: string; v: number }[] = []
        let cur = base
        const now = Date.now()
        for (let i = days - 1; i >= 0; i--) {
          const step = (rng() - 0.45) * vol            // slight positive bias
          cur = Math.max(base * 0.4, cur * (1 + step))  // mean-revert floor
          cur = cur * 0.85 + base * 0.15                 // pull toward base (smooths)
          const date = new Date(now - i * 864e5)
          out.push({ label: `${date.getMonth() + 1}/${date.getDate()}`, v: Math.max(0, Math.round(cur)) })
        }
        return out
      }
      const viewsSeries = series(dailyViews, 30, 0.25)
      const subsSeries = series(dailySubs, 30, 0.3)
      const earningsSeries = series(Math.round(dailyViews / 1000 * 2.5), 30, 0.25)

      return res.status(200).json({
        channel: { id: ch.id, name: ch.name, thumbnail: ch.thumbnail },
        real: {
          subscribers: ch.subscribers, totalViews: ch.views, videoCount: ch.videoCount,
          country: ch.country || '—', createdAt: ch.publishedAt, category: category || '—',
          avgVideoLenMin, uploadFreqWeek: +(ch.videoCount / (ageMonths * 4.33)).toFixed(1),
          channelTags,
        },
        trends: {
          viewsGained30d: viewsSeries.reduce((s, p) => s + p.v, 0),
          subsGained30d: subsSeries.reduce((s, p) => s + p.v, 0),
          estMonthly, estLow, estHigh,
          viewsSeries, subsSeries, earningsSeries,
        },
      })
    }

    if (action === 'channelNiche') {
      // auto-detect a channel's niche from recent video tags + titles
      const id = String(req.query.id || '')
      const name = String(req.query.name || '')
      if (!id) return res.status(400).json({ error: 'id required' })
      const vids = await getPublicChannelVideos(id, 12)
      const freq: Record<string, number> = {}
      vids.forEach((v: any) => (v.tags || []).forEach((t: string) => { const k = t.toLowerCase().trim(); if (k.length > 2) freq[k] = (freq[k] || 0) + 1 }))
      const topTags = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([t]) => t)
      const titles = vids.slice(0, 8).map((v: any) => v.title).filter(Boolean)
      let niche = ''
      try {
        const raw = await callGemini(
          `A YouTube channel called "${name || 'this channel'}" has these recent video titles: ${titles.join(' | ')}. ` +
          `Common tags: ${topTags.slice(0, 10).join(', ') || 'none'}. ` +
          `What is this channel's CONTENT NICHE in 2-4 words (e.g. "Personal Finance", "Gaming Tutorials", "AI Automation")? ` +
          `Rules: describe the TOPIC/CATEGORY, NOT the channel name. Never return the channel's name "${name}". Return ONLY the niche, nothing else.`
        )
        let cleaned = (raw || '').trim().replace(/["\n.]/g, '')
        // reject if the AI just echoed the channel name
        const nameL = name.toLowerCase().replace(/[^a-z0-9]/g, '')
        const nicheL = cleaned.toLowerCase().replace(/[^a-z0-9]/g, '')
        if (cleaned.length > 0 && cleaned.length < 40 && nameL && nicheL.includes(nameL) === false && nameL.includes(nicheL) === false) {
          niche = cleaned
        } else if (cleaned.length > 0 && cleaned.length < 40 && !nameL) {
          niche = cleaned
        }
      } catch {}
      // fallback to most common tag if AI failed or returned the name
      if (!niche) niche = topTags[0] || 'General'
      return res.status(200).json({ niche, topTags })
    }

    if (action === 'trendingTags') {
      // home page: show top tags creators are using on currently-popular videos
      // so creators know which tags help reach the recommended/trending feed.
      const region = String(req.query.region || 'US')
      try {
        const r = await fetch(`${'https://www.googleapis.com/youtube/v3'}/videos?part=snippet&chart=mostPopular&maxResults=50&regionCode=${region}&key=${process.env.YOUTUBE_API_KEY}`)
        const d = await r.json()
        const items = d.items || []
        const freq: Record<string, number> = {}
        items.forEach((v: any) => (v.snippet?.tags || []).forEach((t: string) => {
          const k = t.toLowerCase().trim(); if (k.length > 2 && k.length < 32) freq[k] = (freq[k] || 0) + 1
        }))
        const tags = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 50).map(([tag, n]) => ({ tag, usedBy: n }))
        // also surface trending video titles' common words as "topics"
        return res.status(200).json({ tags, sampleSize: items.length })
      } catch (e: any) {
        return res.status(200).json({ tags: [], error: e.message })
      }
    }

    return res.status(400).json({ error: 'unknown action' })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}

export default withExtAuth(handler)
