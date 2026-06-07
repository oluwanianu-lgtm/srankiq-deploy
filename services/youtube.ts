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

// ═══════════════════════════════════════════════════════
// PUBLIC DATA FUNCTIONS (API key only — no user OAuth)
// Used for real competitor analysis, trends, and keyword stats
// ═══════════════════════════════════════════════════════

const CATEGORY_MAP: Record<string, string> = {
  '1': 'Film & Animation', '2': 'Autos', '10': 'Music', '15': 'Pets & Animals',
  '17': 'Sports', '19': 'Travel', '20': 'Gaming', '22': 'People & Blogs',
  '23': 'Comedy', '24': 'Entertainment', '25': 'News & Politics',
  '26': 'Howto & Style', '27': 'Education', '28': 'Science & Tech', '29': 'Nonprofits',
}

function parseDurationSeconds(iso: string): number {
  const m = iso?.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!m) return 0
  return (parseInt(m[1] || '0') * 3600) + (parseInt(m[2] || '0') * 60) + parseInt(m[3] || '0')
}

// ── Resolve a channel by handle or name (public) ──────
export async function resolveChannel(queryStr: string) {
  // 1) Try exact handle lookup (works for "@mkbhd" or "mkbhd")
  const handle = queryStr.trim().replace(/^@/, '')
  let res = await fetch(
    `${YT_BASE}/channels?part=snippet,statistics&forHandle=${encodeURIComponent(handle)}&key=${API_KEY}`
  )
  let data = await res.json()
  let channel = data.items?.[0]

  // 2) Fall back to channel search
  if (!channel) {
    const sRes = await fetch(
      `${YT_BASE}/search?part=snippet&type=channel&maxResults=1&q=${encodeURIComponent(queryStr)}&key=${API_KEY}`
    )
    const sData = await sRes.json()
    const channelId = sData.items?.[0]?.id?.channelId
    if (!channelId) return null
    const cRes = await fetch(
      `${YT_BASE}/channels?part=snippet,statistics&id=${channelId}&key=${API_KEY}`
    )
    const cData = await cRes.json()
    channel = cData.items?.[0]
  }
  if (!channel) return null

  return {
    id: channel.id,
    name: channel.snippet.title,
    description: channel.snippet.description,
    thumbnail: channel.snippet.thumbnails?.high?.url,
    customUrl: channel.snippet.customUrl,
    country: channel.snippet.country,
    publishedAt: channel.snippet.publishedAt,
    subscribers: parseInt(channel.statistics.subscriberCount) || 0,
    views: parseInt(channel.statistics.viewCount) || 0,
    videoCount: parseInt(channel.statistics.videoCount) || 0,
  }
}

// ── Recent uploads for any public channel ─────────────
export async function getPublicChannelVideos(channelId: string, maxResults = 15) {
  // Uploads playlist ID = channel ID with "UC" prefix swapped to "UU"
  const uploadsId = 'UU' + channelId.slice(2)
  const plRes = await fetch(
    `${YT_BASE}/playlistItems?part=snippet&playlistId=${uploadsId}&maxResults=${maxResults}&key=${API_KEY}`
  )
  const plData = await plRes.json()
  const ids = plData.items?.map((i: any) => i.snippet.resourceId.videoId).join(',')
  if (!ids) return []

  const vRes = await fetch(
    `${YT_BASE}/videos?part=snippet,statistics,contentDetails&id=${ids}&key=${API_KEY}`
  )
  const vData = await vRes.json()
  return (vData.items || []).map((v: any) => ({
    id: v.id,
    title: v.snippet.title,
    publishedAt: v.snippet.publishedAt,
    tags: v.snippet.tags || [],
    views: parseInt(v.statistics.viewCount) || 0,
    likes: parseInt(v.statistics.likeCount) || 0,
    comments: parseInt(v.statistics.commentCount) || 0,
    durationSec: parseDurationSeconds(v.contentDetails?.duration),
  }))
}

// ── Trending videos (real, by region, paginated) ──────
export async function getTrendingVideos(regionCode = 'US', maxResults = 24, pageToken?: string) {
  let url = `${YT_BASE}/videos?part=snippet,statistics,contentDetails&chart=mostPopular&regionCode=${regionCode}&maxResults=${maxResults}&key=${API_KEY}`
  if (pageToken) url += `&pageToken=${pageToken}`
  const res = await fetch(url)
  const data = await res.json()
  if (data.error) throw new Error(data.error.message || 'YouTube trending fetch failed')

  const videos = (data.items || []).map((v: any) => {
    const views = parseInt(v.statistics.viewCount) || 0
    const hoursLive = Math.max(1, (Date.now() - new Date(v.snippet.publishedAt).getTime()) / 36e5)
    const viewsPerDay = Math.round((views / hoursLive) * 24)
    return {
      id: v.id,
      title: v.snippet.title,
      channel: v.snippet.channelTitle,
      category: CATEGORY_MAP[v.snippet.categoryId] || 'Entertainment',
      thumbnail: v.snippet.thumbnails?.medium?.url || v.snippet.thumbnails?.high?.url || '',
      views,
      viewsPerDay,
      publishedAt: v.snippet.publishedAt,
      isShort: parseDurationSeconds(v.contentDetails?.duration) <= 61,
      tags: v.snippet.tags || [],
    }
  })
  return { videos, nextPageToken: data.nextPageToken || null }
}

// ── Real keyword stats from YouTube search ─────────────
export async function getKeywordStats(keyword: string) {
  const sRes = await fetch(
    `${YT_BASE}/search?part=snippet&type=video&maxResults=10&q=${encodeURIComponent(keyword)}&key=${API_KEY}`
  )
  const sData = await sRes.json()
  if (sData.error) throw new Error(sData.error.message || 'YouTube search failed')

  const totalResults = sData.pageInfo?.totalResults || 0
  const ids = (sData.items || []).map((i: any) => i.id.videoId).filter(Boolean).join(',')

  let avgViews = 0
  let recentTopVideos = 0 // top results published in last 90 days
  if (ids) {
    const vRes = await fetch(`${YT_BASE}/videos?part=statistics,snippet&id=${ids}&key=${API_KEY}`)
    const vData = await vRes.json()
    const items = vData.items || []
    const totalViews = items.reduce((s: number, v: any) => s + (parseInt(v.statistics.viewCount) || 0), 0)
    avgViews = items.length ? Math.round(totalViews / items.length) : 0
    const cutoff = Date.now() - 90 * 24 * 3600 * 1000
    recentTopVideos = items.filter((v: any) => new Date(v.snippet.publishedAt).getTime() > cutoff).length
  }

  return { keyword, totalResults, avgViews, recentTopVideos }
}

// ── Autocomplete suggestions (real searches people type) ──
export async function getAutocomplete(keyword: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(keyword)}`
    )
    const data = await res.json() // ["query", ["suggestion1", ...]]
    return (data?.[1] || []).filter((s: string) => s.toLowerCase() !== keyword.toLowerCase()).slice(0, 8)
  } catch {
    return []
  }
}
