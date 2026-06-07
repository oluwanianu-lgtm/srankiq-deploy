// pages/api/competitors/clone.ts — Channel Clone Blueprint
import type { NextApiResponse } from 'next'
import { withApiAuth, AuthedRequest } from '../../../lib/serverAuth'
import { resolveChannel, getPublicChannelVideos } from '../../../services/youtube'
import { generateChannelBlueprint } from '../../../services/gemini'

async function handler(req: AuthedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { channelName, niche } = req.body
    if (!channelName) return res.status(400).json({ error: 'channelName required' })

    const channel = await resolveChannel(channelName)
    if (!channel) return res.status(404).json({ error: `No channel found for "${channelName}"` })

    const videos = await getPublicChannelVideos(channel.id, 15)
    const blueprint = await generateChannelBlueprint({
      name: channel.name,
      subscribers: channel.subscribers,
      niche: niche || 'general',
      recentTitles: videos.map((v: any) => v.title).slice(0, 12),
      topTags: Array.from(new Set(videos.flatMap((v: any) => v.tags))) as string[],
    })

    return res.status(200).json({
      sourceChannel: channel.name,
      sourceSubscribers: channel.subscribers,
      ...blueprint,
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}

export default withApiAuth(handler)
