// pages/api/ext/data.ts — PUBLIC (CORS) endpoint powering the SRankIQ Chrome extension.
// No Firebase auth: the extension is unauthenticated. The YouTube API key stays server-side.
import type { NextApiRequest, NextApiResponse } from 'next'
import {
  resolveChannel, getPublicChannelVideos, searchTopVideos, getVideoDetails,
} from '../../../services/youtube'

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
      return res.status(200).json({ video: await getVideoDetails(id) })
    }

    return res.status(400).json({ error: 'unknown action' })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
