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
    durationSec: parseDurationSeconds(v.contentDetails?.duration),
    isShort: parseDurationSeconds(v.contentDetails?.duration) <= 61,
    url: `https://youtube.com/watch?v=${v.id}`,
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
    thumbnail: v.snippet.thumbnails?.medium?.url || '',
    url: `https://youtube.com/watch?v=${v.id}`,
    description: v.snippet.description || '',
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

// ── Real keyword stats from YouTube search (deep) ──────
export async function getKeywordStats(keyword: string) {
  const sRes = await fetch(
    `${YT_BASE}/search?part=snippet&type=video&maxResults=10&q=${encodeURIComponent(keyword)}&key=${API_KEY}`
  )
  const sData = await sRes.json()
  if (sData.error) throw new Error(sData.error.message || 'YouTube search failed')

  const totalResults = sData.pageInfo?.totalResults || 0
  const ids = (sData.items || []).map((i: any) => i.id.videoId).filter(Boolean).join(',')

  let avgViews = 0
  let recentTopVideos = 0          // top results published in last 90 days
  let avgEngagement = 0            // (likes+comments)/views across top results
  let avgDurationSec = 0
  let topVideos: any[] = []

  if (ids) {
    const vRes = await fetch(`${YT_BASE}/videos?part=statistics,snippet,contentDetails&id=${ids}&key=${API_KEY}`)
    const vData = await vRes.json()
    const items = vData.items || []
    const cutoff = Date.now() - 90 * 24 * 3600 * 1000

    topVideos = items.map((v: any) => ({
      id: v.id,
      title: v.snippet.title,
      channel: v.snippet.channelTitle,
      thumbnail: v.snippet.thumbnails?.medium?.url || '',
      tags: v.snippet.tags || [],
      publishedAt: v.snippet.publishedAt,
      views: parseInt(v.statistics.viewCount) || 0,
      likes: parseInt(v.statistics.likeCount) || 0,
      comments: parseInt(v.statistics.commentCount) || 0,
      durationSec: parseDurationSeconds(v.contentDetails?.duration),
      url: `https://youtube.com/watch?v=${v.id}`,
    }))

    const totalViews = topVideos.reduce((s, v) => s + v.views, 0)
    avgViews = topVideos.length ? Math.round(totalViews / topVideos.length) : 0
    recentTopVideos = topVideos.filter(v => new Date(v.publishedAt).getTime() > cutoff).length
    const engVals = topVideos.filter(v => v.views > 0).map(v => ((v.likes + v.comments) / v.views) * 100)
    avgEngagement = engVals.length ? +(engVals.reduce((a, b) => a + b, 0) / engVals.length).toFixed(2) : 0
    const durVals = topVideos.filter(v => v.durationSec > 0).map(v => v.durationSec)
    avgDurationSec = durVals.length ? Math.round(durVals.reduce((a, b) => a + b, 0) / durVals.length) : 0
  }

  return { keyword, totalResults, avgViews, recentTopVideos, avgEngagement, avgDurationSec, topVideos }
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

// ── Niche/category trending via keyword search ─────────
// Per the project spec: NEVER use YouTube category IDs (wrong content).
// Search by curated keywords, recent window, ordered by view count.
export const CATEGORY_KEYWORDS: Record<string, string> = {
  'Gaming': 'gaming gameplay video game playthrough',
  'Music': 'music video song official audio',
  'Tech': 'technology gadgets AI phone review',
  'Sports': 'sports highlights football basketball',
  'News': 'news today breaking news',
  'Education': 'how to learn tutorial educational',
  'Entertainment': 'entertainment funny viral trending',
  'Comedy': 'comedy funny video sketch humor',
  'Film': 'movie film trailer review',
  'Fashion': 'fashion style outfit lookbook clothing',
  'Science': 'science experiment facts discovery',
  'Food': 'food cooking recipe restaurant',
  'Travel': 'travel vlog destination adventure',
  'Finance': 'finance money investing stocks crypto',
  'Fitness': 'fitness workout gym exercise training',
}

export async function searchTrendingByCategory(
  category: string, regionCode = 'US', pageToken?: string
) {
  const q = CATEGORY_KEYWORDS[category]
  if (!q) throw new Error(`Unknown category: ${category}`)

  const publishedAfter = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
  let url = `${YT_BASE}/search?part=snippet&type=video&order=viewCount&maxResults=24` +
    `&q=${encodeURIComponent(q)}&publishedAfter=${publishedAfter}` +
    `&regionCode=${regionCode}&key=${API_KEY}`
  if (pageToken) url += `&pageToken=${pageToken}`

  const sRes = await fetch(url)
  const sData = await sRes.json()
  if (sData.error) throw new Error(sData.error.message || 'YouTube search failed')

  const ids = (sData.items || []).map((i: any) => i.id.videoId).filter(Boolean).join(',')
  if (!ids) return { videos: [], nextPageToken: null }

  const vRes = await fetch(
    `${YT_BASE}/videos?part=snippet,statistics,contentDetails&id=${ids}&key=${API_KEY}`
  )
  const vData = await vRes.json()

  const videos = (vData.items || []).map((v: any) => {
    const views = parseInt(v.statistics.viewCount) || 0
    const hoursLive = Math.max(1, (Date.now() - new Date(v.snippet.publishedAt).getTime()) / 36e5)
    return {
      id: v.id,
      title: v.snippet.title,
      channel: v.snippet.channelTitle,
      category, // force the selected niche — never mixed up
      thumbnail: v.snippet.thumbnails?.medium?.url || v.snippet.thumbnails?.high?.url || '',
      views,
      viewsPerDay: Math.round((views / hoursLive) * 24),
      publishedAt: v.snippet.publishedAt,
      isShort: parseDurationSeconds(v.contentDetails?.duration) <= 61,
      tags: v.snippet.tags || [],
    }
  })

  return { videos, nextPageToken: sData.nextPageToken || null }
}

// ── Top videos for any search query (Trends in-page search) ──
export async function searchTopVideos(queryStr: string, regionCode = 'US', pageToken?: string) {
  const publishedAfter = new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString()
  let url = `${YT_BASE}/search?part=snippet&type=video&order=viewCount&maxResults=24` +
    `&q=${encodeURIComponent(queryStr)}&publishedAfter=${publishedAfter}` +
    `&regionCode=${regionCode}&key=${API_KEY}`
  if (pageToken) url += `&pageToken=${pageToken}`

  const sRes = await fetch(url)
  const sData = await sRes.json()
  if (sData.error) throw new Error(sData.error.message || 'YouTube search failed')

  const ids = (sData.items || []).map((i: any) => i.id.videoId).filter(Boolean).join(',')
  if (!ids) return { videos: [], nextPageToken: null }

  const vRes = await fetch(
    `${YT_BASE}/videos?part=snippet,statistics,contentDetails&id=${ids}&key=${API_KEY}`
  )
  const vData = await vRes.json()

  const videos = (vData.items || []).map((v: any) => {
    const views = parseInt(v.statistics.viewCount) || 0
    const hoursLive = Math.max(1, (Date.now() - new Date(v.snippet.publishedAt).getTime()) / 36e5)
    return {
      id: v.id,
      title: v.snippet.title,
      channel: v.snippet.channelTitle,
      channelId: v.snippet.channelId,
      category: 'Search result',
      thumbnail: v.snippet.thumbnails?.medium?.url || v.snippet.thumbnails?.high?.url || '',
      views,
      viewsPerDay: Math.round((views / hoursLive) * 24),
      publishedAt: v.snippet.publishedAt,
      isShort: parseDurationSeconds(v.contentDetails?.duration) <= 61,
      tags: v.snippet.tags || [],
    }
  })

  return { videos, nextPageToken: sData.nextPageToken || null }
}

// ── My Videos: list the signed-in user's uploads (OAuth token) ──
export async function listMyVideos(accessToken: string, maxResults = 25) {
  const channelRes = await fetch(
    `${YT_BASE}/channels?part=contentDetails&mine=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const channelData = await channelRes.json()
  if (channelData.error) throw new Error(channelData.error.message || 'YouTube auth failed')
  const uploadsId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads
  if (!uploadsId) return []

  const plRes = await fetch(
    `${YT_BASE}/playlistItems?part=snippet&playlistId=${uploadsId}&maxResults=${maxResults}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const plData = await plRes.json()
  const ids = plData.items?.map((i: any) => i.snippet.resourceId.videoId).join(',')
  if (!ids) return []

  const vRes = await fetch(
    `${YT_BASE}/videos?part=snippet,statistics,contentDetails,status&id=${ids}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const vData = await vRes.json()
  return (vData.items || []).map((v: any) => ({
    id: v.id,
    title: v.snippet.title,
    description: v.snippet.description || '',
    tags: v.snippet.tags || [],
    categoryId: v.snippet.categoryId,
    thumbnail: v.snippet.thumbnails?.medium?.url || '',
    durationSec: parseDurationSeconds(v.contentDetails?.duration),
    isShort: parseDurationSeconds(v.contentDetails?.duration) <= 60,
    publishedAt: v.snippet.publishedAt,
    privacy: v.status?.privacyStatus || 'public',
    views: parseInt(v.statistics.viewCount) || 0,
    likes: parseInt(v.statistics.likeCount) || 0,
    comments: parseInt(v.statistics.commentCount) || 0,
    url: `https://youtube.com/watch?v=${v.id}`,
  }))
}

// ── Update video metadata on YouTube (requires youtube.force-ssl) ──
export async function updateVideoMetadata(
  accessToken: string, videoId: string,
  updates: { title?: string; description?: string; tags?: string[]; privacyStatus?: string; categoryId?: string; madeForKids?: boolean; defaultLanguage?: string; recordingDate?: string }
) {
  // videos.update requires the FULL snippet including categoryId,
  // so fetch the current snippet first and merge.
  const curRes = await fetch(
    `${YT_BASE}/videos?part=snippet,status&id=${videoId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const curData = await curRes.json()
  if (curData.error) throw new Error(curData.error.message || 'Could not load video')
  const current = curData.items?.[0]?.snippet
  if (!current) throw new Error('Video not found')

  const snippet: any = {
    title: updates.title ?? current.title,
    description: updates.description ?? current.description,
    tags: updates.tags ?? current.tags ?? [],
    categoryId: updates.categoryId ?? current.categoryId,
  }
  if (updates.defaultLanguage) snippet.defaultLanguage = updates.defaultLanguage

  // Update snippet
  const parts = ['snippet']
  const body: any = { id: videoId, snippet }
  if (updates.privacyStatus !== undefined || updates.madeForKids !== undefined) {
    parts.push('status')
    body.status = {}
    if (updates.privacyStatus) body.status.privacyStatus = updates.privacyStatus
    if (updates.madeForKids !== undefined) body.status.selfDeclaredMadeForKids = updates.madeForKids
  }
  if (updates.recordingDate) {
    parts.push('recordingDetails')
    body.recordingDetails = { recordingDate: updates.recordingDate }
  }

  const upRes = await fetch(`${YT_BASE}/videos?part=${parts.join(',')}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const upData = await upRes.json()
  if (upData.error) {
    const msg = upData.error.message || 'Update failed'
    if (upData.error.code === 401) throw new Error('TOKEN_EXPIRED')
    if (upData.error.code === 403) throw new Error('PERMISSION — reconnect YouTube in Settings to grant edit access')
    throw new Error(msg)
  }
  return { id: upData.id, title: upData.snippet?.title }
}

// ── Fetch one public video's full metadata (for analysis) ──
export async function getVideoDetails(videoId: string) {
  const r = await fetch(
    `${YT_BASE}/videos?part=snippet,statistics&id=${videoId}&key=${API_KEY}`
  )
  const d = await r.json()
  const v = d.items?.[0]
  if (!v) return null
  return {
    id: v.id,
    title: v.snippet.title,
    description: v.snippet.description || '',
    tags: v.snippet.tags || [],
    channel: v.snippet.channelTitle,
    views: parseInt(v.statistics.viewCount) || 0,
    likes: parseInt(v.statistics.likeCount) || 0,
    comments: parseInt(v.statistics.commentCount) || 0,
  }
}

// ── Completed/active live streams (separate from uploads) ──
export async function getMyLiveStreams(accessToken: string, maxResults = 25) {
  // channels?mine gives the channelId; then search that channel for live events
  const chRes = await fetch(`${YT_BASE}/channels?part=id&mine=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } })
  const chData = await chRes.json()
  if (chData.error) throw new Error(chData.error.message || 'YouTube auth failed')
  const channelId = chData.items?.[0]?.id
  if (!channelId) return []

  // search the channel for completed + live broadcasts
  const types = ['completed', 'live']
  const idSet = new Set<string>()
  for (const ev of types) {
    const sRes = await fetch(
      `${YT_BASE}/search?part=id&channelId=${channelId}&eventType=${ev}&type=video&maxResults=${maxResults}&order=date`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const sData = await sRes.json()
    ;(sData.items || []).forEach((i: any) => i.id?.videoId && idSet.add(i.id.videoId))
  }
  const ids = Array.from(idSet).slice(0, maxResults).join(',')
  if (!ids) return []

  const vRes = await fetch(
    `${YT_BASE}/videos?part=snippet,statistics,contentDetails&id=${ids}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const vData = await vRes.json()
  return (vData.items || []).map((v: any) => ({
    id: v.id, title: v.snippet.title, description: v.snippet.description || '',
    thumbnail: v.snippet.thumbnails?.medium?.url || '',
    tags: v.snippet.tags || [], publishedAt: v.snippet.publishedAt,
    views: parseInt(v.statistics.viewCount) || 0,
    likes: parseInt(v.statistics.likeCount) || 0,
    comments: parseInt(v.statistics.commentCount) || 0,
    url: `https://youtube.com/watch?v=${v.id}`,
  }))
}

// ── The user's playlists ──
export async function getMyPlaylists(accessToken: string, maxResults = 25) {
  const res = await fetch(
    `${YT_BASE}/playlists?part=snippet,contentDetails&mine=true&maxResults=${maxResults}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const data = await res.json()
  if (data.error) throw new Error(data.error.message || 'Could not load playlists')
  return (data.items || []).map((p: any) => ({
    id: p.id, title: p.snippet.title, description: p.snippet.description || '',
    thumbnail: p.snippet.thumbnails?.medium?.url || '',
    itemCount: p.contentDetails?.itemCount || 0,
    url: `https://youtube.com/playlist?list=${p.id}`,
  }))
}

// ── Niche Finder: real competition/opportunity analysis from YouTube data ──
export async function analyzeNiche(seed: string, regionCode = 'US') {
  // 1) Pull the top results for the seed term (real search)
  const searchUrl = `${YT_BASE}/search?part=snippet&q=${encodeURIComponent(seed)}&type=video&maxResults=25&order=relevance&regionCode=${regionCode}&key=${API_KEY}`
  const sRes = await fetch(searchUrl)
  const sData = await sRes.json()
  if (sData.error) throw new Error(sData.error.message || 'YouTube search failed')
  const items = sData.items || []
  const totalResults = sData.pageInfo?.totalResults || 0

  const videoIds = items.map((i: any) => i.id?.videoId).filter(Boolean)
  const channelIds = Array.from(new Set(items.map((i: any) => i.snippet?.channelId).filter(Boolean)))
  if (videoIds.length === 0) {
    return { seed, totalResults, videoCount: 0, sampleSize: 0, avgViews: 0, medianViews: 0,
      avgChannelSubs: 0, freshVideos: 0, smallChannelWins: 0, competitionScore: 50, demandScore: 0,
      opportunityScore: 0, verdict: 'No data', topVideos: [] }
  }

  // 2) Real video stats
  const vRes = await fetch(`${YT_BASE}/videos?part=snippet,statistics,contentDetails&id=${videoIds.join(',')}&key=${API_KEY}`)
  const vData = await vRes.json()
  const vids = vData.items || []

  // 3) Real channel stats (subscriber counts) — to detect "small channels ranking"
  const cRes = await fetch(`${YT_BASE}/channels?part=statistics,snippet&id=${channelIds.join(',')}&key=${API_KEY}`)
  const cData = await cRes.json()
  const subsByChannel: Record<string, number> = {}
  ;(cData.items || []).forEach((c: any) => { subsByChannel[c.id] = parseInt(c.statistics?.subscriberCount) || 0 })

  // 4) Compute real metrics
  const now = Date.now()
  const views = vids.map((v: any) => parseInt(v.statistics?.viewCount) || 0).sort((a: number, b: number) => a - b)
  const avgViews = views.length ? Math.round(views.reduce((s: number, x: number) => s + x, 0) / views.length) : 0
  const medianViews = views.length ? views[Math.floor(views.length / 2)] : 0

  const subsList = Object.values(subsByChannel)
  const avgChannelSubs = subsList.length ? Math.round(subsList.reduce((s, x) => s + x, 0) / subsList.length) : 0

  // videos published in the last 90 days (demand/freshness)
  const freshVideos = vids.filter((v: any) => (now - new Date(v.snippet.publishedAt).getTime()) < 90 * 864e5).length

  // "small channel wins": videos with strong views from sub-50k-subscriber channels (opportunity signal)
  const smallChannelWins = vids.filter((v: any) => {
    const subs = subsByChannel[v.snippet.channelId] || 0
    const vv = parseInt(v.statistics?.viewCount) || 0
    return subs > 0 && subs < 50000 && vv > Math.max(20000, avgViews * 0.5)
  }).length

  // Competition: more total results + bigger channels dominating = higher competition (0-100, higher=harder)
  const resultPressure = Math.min(60, Math.log10(Math.max(1, totalResults)) * 10) // ~0-60
  const channelPressure = Math.min(40, (avgChannelSubs / 1_000_000) * 40)          // big channels = harder
  const competitionScore = Math.round(Math.min(100, resultPressure + channelPressure))

  // Demand: real view levels + freshness (0-100, higher=more demand)
  const viewDemand = Math.min(70, Math.log10(Math.max(1, avgViews)) * 12)
  const freshDemand = Math.min(30, (freshVideos / Math.max(1, vids.length)) * 30)
  const demandScore = Math.round(Math.min(100, viewDemand + freshDemand))

  // Opportunity: high demand + low competition + small channels breaking through
  const opportunityScore = Math.round(Math.max(0, Math.min(100,
    demandScore * 0.5 + (100 - competitionScore) * 0.35 + (smallChannelWins / Math.max(1, vids.length)) * 100 * 0.15
  )))
  const verdict = opportunityScore >= 70 ? 'Great opportunity'
    : opportunityScore >= 50 ? 'Worth pursuing'
    : opportunityScore >= 35 ? 'Competitive' : 'Saturated'

  const topVideos = vids.slice(0, 8).map((v: any) => ({
    id: v.id, title: v.snippet.title, channel: v.snippet.channelTitle,
    channelSubs: subsByChannel[v.snippet.channelId] || 0,
    views: parseInt(v.statistics?.viewCount) || 0,
    publishedAt: v.snippet.publishedAt,
    thumbnail: v.snippet.thumbnails?.medium?.url || '',
    url: `https://youtube.com/watch?v=${v.id}`,
    tags: v.snippet.tags || [],
  }))

  return {
    seed, totalResults, videoCount: totalResults, sampleSize: vids.length,
    avgViews, medianViews, avgChannelSubs, freshVideos, smallChannelWins,
    competitionScore, demandScore, opportunityScore, verdict, topVideos,
  }
}

// ── Batch video + channel stats for inline search-result injection ──
export async function batchVideoStats(videoIds: string[]) {
  if (!videoIds.length) return []
  const vRes = await fetch(`${YT_BASE}/videos?part=snippet,statistics,contentDetails&id=${videoIds.join(',')}&key=${API_KEY}`)
  const vData = await vRes.json()
  if (vData.error) throw new Error(vData.error.message || 'batch failed')
  const vids = vData.items || []
  // channel subs
  const chIds = Array.from(new Set(vids.map((v: any) => v.snippet.channelId))).slice(0, 50)
  const subsByCh: Record<string, number> = {}
  if (chIds.length) {
    const cRes = await fetch(`${YT_BASE}/channels?part=statistics&id=${chIds.join(',')}&key=${API_KEY}`)
    const cData = await cRes.json()
    ;(cData.items || []).forEach((c: any) => { subsByCh[c.id] = parseInt(c.statistics?.subscriberCount) || 0 })
  }
  return vids.map((v: any) => {
    const views = parseInt(v.statistics?.viewCount) || 0
    const hours = Math.max(1, (Date.now() - new Date(v.snippet.publishedAt).getTime()) / 36e5)
    const vph = Math.round(views / hours)
    const subs = subsByCh[v.snippet.channelId] || 0
    // outlier multiplier — views vs a typical baseline for the channel size
    const baseline = Math.max(1000, subs * 0.1)
    const outlier = +(views / baseline).toFixed(1)
    // parse ISO 8601 duration (PT#M#S) to seconds
    const dur = v.contentDetails?.duration || ''
    const m = dur.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
    const durationSec = m ? (parseInt(m[1]||'0')*3600 + parseInt(m[2]||'0')*60 + parseInt(m[3]||'0')) : 0
    return {
      id: v.id, views, vph, subs,
      tags: v.snippet.tags || [], tagCount: (v.snippet.tags || []).length,
      outlier: Math.min(99, outlier),
      ageDays: Math.round(hours / 24),
      durationSec,
    }
  })
}
