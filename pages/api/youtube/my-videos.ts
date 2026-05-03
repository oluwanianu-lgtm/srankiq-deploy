// pages/api/youtube/my-videos.ts
import type { NextApiRequest, NextApiResponse } from 'next'

const YT_KEY = process.env.YOUTUBE_API_KEY!

// Parse ISO 8601 duration to readable string e.g. PT4M13S → 4:13
function parseDuration(iso: string): string {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return ''
  const h = parseInt(match[1] || '0')
  const m = parseInt(match[2] || '0')
  const s = parseInt(match[3] || '0')
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // We search for the channel tied to the YouTube API key owner
  // In production this would use the user's OAuth token from Firebase
  // For now we use the channel search approach with a known channel query
  // The frontend passes the connected channel id if available
  const channelId = req.query.channelId as string | undefined

  try {
    // Step 1: Get channel info
    let channelUrl = ''
    if (channelId) {
      channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${YT_KEY}`
    } else {
      // Try to get the channel via the API key's associated channel (mine endpoint needs OAuth)
      // Fallback: return empty so the page shows connect CTA
      return res.status(200).json({ videos: [], channel: null })
    }

    const chRes = await fetch(channelUrl)
    const chData = await chRes.json()
    const channel = chData.items?.[0]

    if (!channel) {
      return res.status(200).json({ videos: [], channel: null })
    }

    const channelInfo = {
      id: channel.id,
      title: channel.snippet?.title,
      thumbnail: channel.snippet?.thumbnails?.default?.url,
      subscriberCount: parseInt(channel.statistics?.subscriberCount || '0'),
      viewCount: parseInt(channel.statistics?.viewCount || '0'),
      videoCount: parseInt(channel.statistics?.videoCount || '0'),
    }

    // Step 2: Get uploads playlist id
    const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads
    let videos: any[] = []

    if (uploadsPlaylistId) {
      // Step 3: Get latest 12 videos from uploads playlist
      const plRes = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=12&key=${YT_KEY}`
      )
      const plData = await plRes.json()
      const items = plData.items || []

      if (items.length > 0) {
        const videoIds = items.map((it: any) => it.snippet?.resourceId?.videoId).filter(Boolean).join(',')

        // Step 4: Get real stats for those videos
        const statsRes = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails,snippet&id=${videoIds}&key=${YT_KEY}`
        )
        const statsData = await statsRes.json()

        videos = (statsData.items || []).map((v: any) => ({
          id: v.id,
          title: v.snippet?.title,
          thumbnail: v.snippet?.thumbnails?.medium?.url || v.snippet?.thumbnails?.default?.url,
          views: parseInt(v.statistics?.viewCount || '0'),
          likes: parseInt(v.statistics?.likeCount || '0'),
          publishedAt: v.snippet?.publishedAt,
          duration: parseDuration(v.contentDetails?.duration || ''),
          url: `https://youtube.com/watch?v=${v.id}`,
        }))
      }
    } else {
      // Fallback: search for channel's videos
      const searchRes = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channel.id}&type=video&order=date&maxResults=12&key=${YT_KEY}`
      )
      const searchData = await searchRes.json()
      const items = searchData.items || []

      if (items.length > 0) {
        const videoIds = items.map((it: any) => it.id?.videoId).filter(Boolean).join(',')
        const statsRes = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails,snippet&id=${videoIds}&key=${YT_KEY}`
        )
        const statsData = await statsRes.json()

        videos = (statsData.items || []).map((v: any) => ({
          id: v.id,
          title: v.snippet?.title,
          thumbnail: v.snippet?.thumbnails?.medium?.url || v.snippet?.thumbnails?.default?.url,
          views: parseInt(v.statistics?.viewCount || '0'),
          likes: parseInt(v.statistics?.likeCount || '0'),
          publishedAt: v.snippet?.publishedAt,
          duration: parseDuration(v.contentDetails?.duration || ''),
          url: `https://youtube.com/watch?v=${v.id}`,
        }))
      }
    }

    return res.status(200).json({ videos, channel: channelInfo })
  } catch (err: any) {
    console.error('my-videos error:', err)
    return res.status(500).json({ error: 'Failed to load channel videos' })
  }
}
