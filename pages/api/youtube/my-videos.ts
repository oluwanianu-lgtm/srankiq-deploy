// pages/api/youtube/my-videos.ts
import type { NextApiRequest, NextApiResponse } from 'next'

const YT_KEY = process.env.YOUTUBE_API_KEY!
const YT_BASE = 'https://www.googleapis.com/youtube/v3'

function parseDuration(iso: string): string {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return ''
  const h = parseInt(match[1] || '0'), m = parseInt(match[2] || '0'), s = parseInt(match[3] || '0')
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${m}:${String(s).padStart(2,'0')}`
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const channelId = (req.body?.channelId || req.query?.channelId) as string | undefined
  const accessToken = (req.body?.accessToken || req.query?.accessToken) as string | undefined

  if (!channelId && !accessToken) {
    return res.status(200).json({ videos: [], channel: null })
  }

  try {
    const authHeaders: Record<string,string> = accessToken ? { Authorization: `Bearer ${accessToken}` } : {}

    // Get channel info
    const chRes = await fetch(
      `${YT_BASE}/channels?part=snippet,statistics,contentDetails&id=${channelId}&key=${YT_KEY}`,
      { headers: authHeaders }
    )
    const chData = await chRes.json()
    const channel = chData.items?.[0]
    if (!channel) return res.status(200).json({ videos: [], channel: null })

    const channelInfo = {
      id: channel.id,
      title: channel.snippet?.title,
      thumbnail: channel.snippet?.thumbnails?.medium?.url || channel.snippet?.thumbnails?.default?.url,
      subscriberCount: parseInt(channel.statistics?.subscriberCount || '0'),
      viewCount: parseInt(channel.statistics?.viewCount || '0'),
      videoCount: parseInt(channel.statistics?.videoCount || '0'),
      channelUrl: `https://youtube.com/channel/${channel.id}`,
    }

    const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads
    let videos: any[] = []

    if (uploadsPlaylistId) {
      const plRes = await fetch(
        `${YT_BASE}/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=50&key=${YT_KEY}`,
        { headers: authHeaders }
      )
      const plData = await plRes.json()
      const items = plData.items || []

      if (items.length > 0) {
        const videoIds = items.map((it: any) => it.snippet?.resourceId?.videoId).filter(Boolean).join(',')
        const statsRes = await fetch(`${YT_BASE}/videos?part=statistics,contentDetails,snippet&id=${videoIds}&key=${YT_KEY}`)
        const statsData = await statsRes.json()

        videos = (statsData.items || []).map((v: any) => ({
          id: v.id,
          title: v.snippet?.title,
          thumbnail: v.snippet?.thumbnails?.medium?.url || v.snippet?.thumbnails?.default?.url,
          views: parseInt(v.statistics?.viewCount || '0'),
          likes: parseInt(v.statistics?.likeCount || '0'),
          comments: parseInt(v.statistics?.commentCount || '0'),
          publishedAt: v.snippet?.publishedAt,
          duration: parseDuration(v.contentDetails?.duration || ''),
          tags: v.snippet?.tags || [],
          description: v.snippet?.description || '',
          url: `https://youtube.com/watch?v=${v.id}`,
        }))
      }
    } else {
      const searchRes = await fetch(
        `${YT_BASE}/search?part=snippet&channelId=${channelId}&type=video&order=date&maxResults=50&key=${YT_KEY}`
      )
      const searchData = await searchRes.json()
      const items = searchData.items || []
      if (items.length > 0) {
        const videoIds = items.map((it: any) => it.id?.videoId).filter(Boolean).join(',')
        const statsRes = await fetch(`${YT_BASE}/videos?part=statistics,contentDetails,snippet&id=${videoIds}&key=${YT_KEY}`)
        const statsData = await statsRes.json()
        videos = (statsData.items || []).map((v: any) => ({
          id: v.id,
          title: v.snippet?.title,
          thumbnail: v.snippet?.thumbnails?.medium?.url || v.snippet?.thumbnails?.default?.url,
          views: parseInt(v.statistics?.viewCount || '0'),
          likes: parseInt(v.statistics?.likeCount || '0'),
          comments: parseInt(v.statistics?.commentCount || '0'),
          publishedAt: v.snippet?.publishedAt,
          duration: parseDuration(v.contentDetails?.duration || ''),
          tags: v.snippet?.tags || [],
          description: v.snippet?.description || '',
          url: `https://youtube.com/watch?v=${v.id}`,
        }))
      }
    }

    // Sort by publish date (newest first)
    videos.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())

    return res.status(200).json({ videos, channel: channelInfo })
  } catch (err: any) {
    console.error('my-videos error:', err)
    return res.status(500).json({ error: 'Failed to load channel videos' })
  }
}
