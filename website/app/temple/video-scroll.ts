/** Center a fitting collection initially; user input snaps individual recordings. */
export function mountRecordingScroll(host: HTMLElement, signal: AbortSignal) {
  if (signal.aborted) return
  for (const feed of host.querySelectorAll<HTMLElement>(
    '.temple-recordings, .temple-post-previews',
  )) {
    const videos = [...feed.querySelectorAll<HTMLElement>('.temple-video, .temple-post-preview')]
    if (!videos.length) continue
    let interacted = false
    let groupedOffset = 0
    let finishActivation = false
    const linked = () => {
      try {
        return videos.some((video) => video.id === decodeURIComponent(location.hash.slice(1)))
      } catch {
        return false
      }
    }
    const align = () => {
      if (signal.aborted || interacted || linked()) return
      const width = videos.reduce((sum, video) => sum + video.getBoundingClientRect().width, 0)
      if (width > feed.clientWidth) {
        delete feed.dataset.grouped
        feed.scrollTo({ left: 0, behavior: 'instant' })
        return
      }
      feed.dataset.grouped = ''
      const first = videos[0].getBoundingClientRect()
      const last = videos.at(-1)!.getBoundingClientRect()
      const bounds = feed.getBoundingClientRect()
      feed.scrollTo({
        left: feed.scrollLeft + (first.right + last.left - bounds.left - bounds.right) / 2,
        behavior: 'instant',
      })
      groupedOffset = feed.scrollLeft
    }
    const activate = () => {
      interacted = true
      const grouped = feed.hasAttribute('data-grouped')
      delete feed.dataset.grouped
      if (grouped) finishActivation = true
    }
    feed.addEventListener('wheel', activate, { passive: true, signal })
    feed.addEventListener('pointerdown', activate, { passive: true, signal })
    // Wheel events inside the player iframe do not bubble to this document,
    // but the resulting native scroll still reaches the collection.
    feed.addEventListener(
      'scroll',
      () => {
        if (feed.hasAttribute('data-grouped') && Math.abs(feed.scrollLeft - groupedOffset) > 1)
          activate()
      },
      { passive: true, signal },
    )
    feed.addEventListener(
      'scrollend',
      () => {
        if (!finishActivation) return
        finishActivation = false
        // WebKit can finish the first gesture using the previous unsnapped mode.
        const bounds = feed.getBoundingClientRect()
        const center = (bounds.left + bounds.right) / 2
        const offsets = videos.map((video) => {
          const box = video.getBoundingClientRect()
          return (box.left + box.right) / 2 - center
        })
        const nearest = offsets.reduce((a, b) => (Math.abs(a) <= Math.abs(b) ? a : b))
        if (Math.abs(nearest) > 1)
          feed.scrollTo({ left: feed.scrollLeft + nearest, behavior: 'instant' })
      },
      { signal },
    )
    feed.addEventListener(
      'keydown',
      (event) => {
        if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) activate()
      },
      { signal },
    )
    window.addEventListener(
      'hashchange',
      () => {
        if (linked()) activate()
      },
      { signal },
    )
    align()
    const observer = new ResizeObserver(align)
    observer.observe(feed)
    signal.addEventListener('abort', () => observer.disconnect(), { once: true })
  }
}
