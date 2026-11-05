import type { FeedPost } from './view.tsx'
import { videoFrame } from './model.ts'

/** Bridge source changes with the actual displayed frame, then release its canvas. */
export function retainFeedFrames(video: HTMLVideoElement, signal: AbortSignal) {
  const pending = new Map<HTMLImageElement, HTMLCanvasElement>()
  function discard(image: HTMLImageElement) {
    const canvas = pending.get(image)
    if (!canvas) return
    canvas.remove()
    canvas.width = canvas.height = 0
    pending.delete(image)
  }
  signal.addEventListener(
    'abort',
    () => {
      for (const image of pending.keys()) discard(image)
    },
    { once: true },
  )
  return (article: HTMLElement, post: FeedPost, position: number) => {
    if (post.kind !== 'video') return
    const image = article.querySelector<HTMLImageElement>('.feed-stage > .feed-frame')!
    discard(image)
    if (video.readyState >= 2 && !video.seeking && Math.abs(video.currentTime - position) < 0.25) {
      const canvas = document.createElement('canvas')
      canvas.className = 'feed-frame feed-snapshot'
      canvas.setAttribute('aria-hidden', 'true')
      const scale = Math.min(1, 1920 / Math.max(video.videoWidth, video.videoHeight))
      canvas.width = Math.round(video.videoWidth * scale)
      canvas.height = Math.round(video.videoHeight * scale)
      try {
        const context = canvas.getContext('2d')
        if (context) {
          context.drawImage(video, 0, 0, canvas.width, canvas.height)
          const mount = article.querySelector<HTMLElement>('.feed-media-mount')!
          mount.insertBefore(canvas, mount.firstChild)
          pending.set(image, canvas)
        }
      } catch {
        canvas.width = canvas.height = 0
        // A source without a decoded frame falls back to its timestamp image.
      }
    }
    image.hidden = true
    const src = videoFrame(post, position)
    image.src = src
    void image.decode().then(
      () => {
        if (signal.aborted || image.src !== src) return
        image.hidden = false
        discard(image)
      },
      () => {},
    )
    // Native image caching owns older frames; never accumulate canvas buffers.
    while (pending.size > 3) discard(pending.keys().next().value!)
  }
}
