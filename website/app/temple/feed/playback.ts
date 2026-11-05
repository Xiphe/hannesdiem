import type Hls from 'hls.js'
import type { FeedPost } from './view.tsx'
import { videoFrame, mediaSource } from './model.ts'

/** Keep the actual video element, including its browser sound permission. */
export function createPlayback(video: HTMLVideoElement, signal: AbortSignal, failed: () => void) {
  let activeHls: Hls | undefined
  let nextHls: Hls | undefined
  let next: HTMLVideoElement | undefined
  let nextId: string | undefined
  let cancelRestore: (() => void) | undefined
  let revision = 0
  let preloadRevision = 0
  const releaseNext = () => {
    nextHls?.destroy()
    nextHls = undefined
    if (next) {
      next.pause()
      next.removeAttribute('src')
      next.load()
      next = undefined
    }
  }
  const clear = () => {
    revision++
    cancelRestore?.()
    activeHls?.destroy()
    activeHls = undefined
    video.pause()
    video.removeAttribute('src')
    video.load()
  }
  async function attach(
    target: HTMLVideoElement,
    post: FeedPost,
    preload: boolean,
    stale: () => boolean,
  ) {
    const src = mediaSource(post)
    if (!src) return
    if (post.kind !== 'video' || target.canPlayType('application/vnd.apple.mpegurl')) {
      if (!stale()) {
        target.src = src
        target.load()
      }
      return
    }
    // Safari uses its native HLS implementation; other browsers load this only
    // when opening media, never when browsing Watch or reading text.
    const { default: Hls } = await import('hls.js')
    if (stale()) return
    if (!Hls.isSupported()) throw new Error('HLS playback unavailable')
    const hls = new Hls({
      maxBufferLength: preload ? 4 : 12,
      maxMaxBufferLength: preload ? 4 : 24,
      maxBufferSize: preload ? 2_000_000 : 8_000_000,
      backBufferLength: 4,
      capLevelToPlayerSize: true,
    })
    if (preload) {
      nextHls = hls
      hls.on(Hls.Events.FRAG_BUFFERED, () => hls.stopLoad())
    } else {
      activeHls = hls
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal && !stale()) {
          cancelRestore?.()
          failed()
        }
      })
    }
    hls.loadSource(src)
    hls.attachMedia(target)
  }
  function restorePosition(position: number, current: number) {
    return new Promise<boolean>((resolve) => {
      let started = false
      let settled = false
      const events = ['loadedmetadata', 'durationchange', 'loadeddata', 'seeked']
      const finish = (restored: boolean) => {
        if (settled) return
        settled = true
        for (const event of events) video.removeEventListener(event, check)
        video.removeEventListener('error', cancel)
        signal.removeEventListener('abort', cancel)
        if (cancelRestore === cancel) cancelRestore = undefined
        resolve(restored)
      }
      const cancel = () => finish(false)
      const check = () => {
        if (signal.aborted || current !== revision) return cancel()
        if (video.readyState < 1 || !Number.isFinite(video.duration) || video.duration <= 0) return
        if (!started) {
          started = true
          try {
            video.currentTime = Math.min(position, Math.max(0, video.duration - 0.1))
          } catch {
            cancel()
            failed()
            return
          }
        }
        if (video.readyState >= 2 && !video.seeking) finish(true)
      }
      cancelRestore = cancel
      for (const event of events) video.addEventListener(event, check)
      video.addEventListener('error', cancel)
      signal.addEventListener('abort', cancel, { once: true })
      check()
    })
  }
  signal.addEventListener(
    'abort',
    () => {
      clear()
      preloadRevision++
      releaseNext()
    },
    { once: true },
  )
  return {
    clear,
    async load(post: FeedPost, position = 0) {
      const current = ++revision
      cancelRestore?.()
      activeHls?.destroy()
      activeHls = undefined
      video.pause()
      video.removeAttribute('src')
      video.load()
      video.loop = false
      video.preload = 'auto'
      video.poster = post.kind === 'video' ? videoFrame(post, position) : ''
      await attach(video, post, false, () => signal.aborted || current !== revision)
      if (signal.aborted || current !== revision) return false
      return position > 0 ? restorePosition(position, current) : true
    },
    preload(post?: FeedPost) {
      if (post?.id === nextId) return
      nextId = post?.id
      const current = ++preloadRevision
      releaseNext()
      if (!post || signal.aborted) return
      next = document.createElement('video')
      next.muted = true
      next.playsInline = true
      next.preload = 'auto'
      // A hint on native HLS; hls.js stops after the first buffered fragment.
      void attach(next, post, true, () => signal.aborted || current !== preloadRevision).catch(
        () => {},
      )
    },
  }
}
