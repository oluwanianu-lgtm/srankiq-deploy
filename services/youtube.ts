// services/youtube.ts
// Server-side YouTube Data API v3 service

const YT_BASE = 'https://www.googleapis.com/youtube/v3'
const API_KEY = process.env.YOUTUBE_API_KEY!

// ── Channel Data ──────────────────────────────────────
export async function getChannelData(accessToken: string) {
  const res = await fetch(
    `${YT_BASE}/channels?part=snippet,statistics,brandingSettings&mine=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const data = await res.json()
  const channel = data.items?.[0]
  if (!channel) throw new Error('No YouTube channel found')

  return {
    id: channel.id,
    name: channel.snippet.title,
    description: channel.snippet.description,
    customUrl: channel.snippet.customUrl,
    thumbnail: channel.snippet.thumbnails?.high?.url,
    subscribers: parseInt(channel.statistics.subscriberCount) || 0,
    views: parseInt(channel.statistics.viewCount) || 0,
    videos: parseInt(channel.statistics.videoCount) || 0,
    country: channel.snippet.country,
    publishedAt: channel.snippet.publishedAt,
  }
}

// ── Top Videos ────────────────────────────────────────
export async function getTopVideos(accessToken: string, maxResults = 10) {
  // Get uploads playlist
  const channelRes = await fetch(
    `${YT_BASE}/channels?part=contentDetails&mine=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const channelData = await channelRes.json()
  const uploadsId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads
  if (!uploadsId) return []

  // Get playlist items
  const plRes = await fetch(
    `${YT_BASE}/playlistItems?part=snippet&playlistId=${uploadsId}&maxResults=${maxResults}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const plData = await plRes.json()
  const videoIds = plData.items?.map((i: any) => i.snippet.resourceId.videoId).join(',')
  if (!videoIds) return []

  // Get video stats
  const videoRes = await fetch(
    `${YT_BASE}/videos?part=snippet,statistics,contentDetails&id=${videoIds}&key=${API_KEY}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const videoData = await videoRes.json()

  return videoData.items?.map((v: any) => ({
    id: v.id,
    title: v.snippet.title,
    description: v.snippet.description,
    thumbnail: v.snippet.thumbnails?.high?.url,
    publishedAt: v.snippet.publishedAt,
    duration: v.contentDetails.duration,
    views: parseInt(v.statistics.viewCount) || 0,
    likes: parseInt(v.statistics.likeCount) || 0,
    comments: parseInt(v.statistics.commentCount) || 0,
    tags: v.snippet.tags || [],
    categoryId: v.snippet.categoryId,
  })) || []
}

// ── Search Keywords ───────────────────────────────────
export async function searchYouTubeKeywords(query: string) {
  const res = await fetch(
    `${YT_BASE}/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=20&order=relevance&key=${API_KEY}`
  )
  const data = await res.json()

  return data.items?.map((item: any) => ({
    videoId: item.id.videoId,
    title: item.snippet.title,
    channel: item.snippet.channelTitle,
    publishedAt: item.snippet.publishedAt,
    thumbnail: item.snippet.thumbnails?.medium?.url,
  })) || []
}

// ── Trending Videos ───────────────────────────────────
export async function getTrendingVideos(regionCode = 'US', categoryId?: string) {
  let url = `${YT_BASE}/videos?part=snippet,statistics&chart=mostPopular&regionCode=${regionCode}&maxResults=20&key=${API_KEY}`
  if (categoryId) url += `&videoCategoryId=${categoryId}`

  const res = await fetch(url)
  const data = await res.json()

  return data.items?.map((v: any) => ({
    id: v.id,
    title: v.snippet.title,
    channel: v.snippet.channelTitle,
    thumbnail: v.snippet.thumbnails?.high?.url,
    views: parseInt(v.statistics.viewCount) || 0,
    likes: parseInt(v.statistics.likeCount) || 0,
    publishedAt: v.snippet.publishedAt,
    tags: v.snippet.tags || [],
    categoryId: v.snippet.categoryId,
  })) || []
}

// ── Video Analytics ───────────────────────────────────
export async function getVideoAnalytics(accessToken: string, videoId: string) {
  const res = await fetch(
    `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=2024-01-01&endDate=2026-12-31&metrics=views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,likes,dislikes,comments,shares&dimensions=video&filters=video==${videoId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const data = await res.json()
  return data.rows?.[0] || null
}

// ── Keyword Search Volume Estimation ─────────────────
export async function estimateKeywordData(keyword: string) {
  // Use search results count as proxy for volume
  const res = await fetch(
    `${YT_BASE}/search?part=id&q=${encodeURIComponent(keyword)}&type=video&key=${API_KEY}`
  )
  const data = await res.json()
  const totalResults = data.pageInfo?.totalResults || 0

  return {
    keyword,
    estimatedVolume: totalResults,
    competition: totalResults > 1000000 ? 'High' : totalResults > 100000 ? 'Medium' : 'Low',
  }
}
