import type { TemplePost } from '@hannesdiem/content-components'

export const templePath = '/temple-of-sound'
export const watchPath = `${templePath}/watch`
export const feedPath = '/feed'
export const postPath = (id: string) => `${feedPath}/${encodeURIComponent(id)}`

export function isFeedPath(path: string) {
  return path === feedPath || path.startsWith(`${feedPath}/`)
}

export function sortedPosts<T extends { id: string; postedAt: string }>(posts: readonly T[]) {
  const ids = new Set<string>()
  for (const post of posts) {
    if (
      !post.id ||
      ids.has(post.id) ||
      !/T.*(?:Z|[+-]\d{2}:\d{2})$/i.test(post.postedAt) ||
      !Number.isFinite(Date.parse(post.postedAt))
    )
      throw new Error('Temple posts require unique IDs and timezone-qualified posting dates')
    ids.add(post.id)
  }
  return posts.toSorted((a, b) => Date.parse(b.postedAt) - Date.parse(a.postedAt))
}

export function streamBase(post: { customerCode: string; videoId: string }) {
  if (!/^[a-z0-9-]+$/i.test(post.customerCode)) throw new Error('Invalid Stream customer code')
  return `https://customer-${post.customerCode}.cloudflarestream.com/${encodeURIComponent(post.videoId)}`
}

export function mediaSource(post: TemplePost) {
  return post.kind === 'video'
    ? `${streamBase(post)}/manifest/video.m3u8`
    : post.kind === 'audio'
      ? post.src
      : undefined
}

export function thumbnail(post: TemplePost) {
  return post.kind === 'video'
    ? `${streamBase(post)}/thumbnails/thumbnail.jpg?width=1052&height=550&fit=clip`
    : undefined
}

/** A plain frame at the playback position; authored video covers belong to Watch. */
export function videoFrame(post: { customerCode: string; videoId: string }, position = 0) {
  const time = Number.isFinite(position) ? Math.max(0, Math.round(position * 1000) / 1000) : 0
  return `${streamBase(post)}/thumbnails/thumbnail.jpg?time=${time}s&width=1920&height=1920&fit=clip`
}
