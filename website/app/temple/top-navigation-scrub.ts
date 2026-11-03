export type TimelinePoint = { at: number; value: number }

function interpolate(points: readonly TimelinePoint[], at: number) {
  let value = points[0]?.value ?? 0
  for (let i = 1; i < points.length; i++) {
    const before = points[i - 1],
      after = points[i]
    if (at < before.at) break
    const t = Math.max(0, Math.min(1, (at - before.at) / (after.at - before.at || 1)))
    value = before.value + (after.value - before.value) * t
    if (at < after.at) break
  }
  return value
}

/** Native touch momentum and page scroll share the same measured section timeline. */
export function mountNavigationScrub(
  nav: HTMLElement,
  signal: AbortSignal,
  scheduleLayout: () => void,
) {
  const compact = matchMedia('(max-width: 1050px)')
  let points: TimelinePoint[] = []
  let inverse: TimelinePoint[] = []
  let width = 0
  let expected = -1
  let frame = 0
  let scrubY: number | undefined
  let input = false
  let settling: ReturnType<typeof setTimeout> | undefined
  let touch: { x: number; y: number } | undefined
  let drag: { id: number; x: number; left: number } | undefined
  let suppressClick = false
  const follow = () => {
    if (!compact.matches || !points.length || Math.abs(scrollY - (scrubY ?? -1)) < 1) return
    scrubY = undefined
    const left = Math.max(0, interpolate(points, scrollY) - width / 2)
    if (Math.abs(nav.scrollLeft - left) < 1) return
    expected = left
    nav.scrollLeft = left
  }
  const scrub = () => {
    frame = 0
    if (!input || !compact.matches || !points.length || Math.abs(nav.scrollLeft - expected) < 1)
      return
    // Revealing a link with Tab must not navigate before it is activated.
    if (
      nav.contains(document.activeElement) &&
      document.activeElement?.matches(':focus-visible') &&
      !drag
    )
      return
    expected = -1
    scrubY = interpolate(inverse, nav.scrollLeft + width / 2)
    nav.dispatchEvent(new Event('navigation-scrub', { bubbles: true }))
    scrollTo({ top: scrubY, behavior: 'instant' })
  }
  nav.addEventListener(
    'scroll',
    () => {
      clearTimeout(settling)
      settling = setTimeout(() => {
        input = false
      }, 120)
      if (!frame && compact.matches) frame = requestAnimationFrame(scrub)
    },
    { passive: true, signal },
  )
  nav.addEventListener(
    'touchstart',
    (event) => {
      const first = event.touches[0]
      touch = first && { x: first.clientX, y: first.clientY }
      input = false
    },
    { passive: true, signal },
  )
  nav.addEventListener(
    'touchmove',
    (event) => {
      const first = event.touches[0]
      if (!touch || !first) return
      const dx = Math.abs(first.clientX - touch.x),
        dy = Math.abs(first.clientY - touch.y)
      if (dx > 6 && dx > dy) input = true
    },
    { passive: true, signal },
  )
  nav.addEventListener(
    'wheel',
    (event) => {
      input = Math.abs(event.deltaX) > Math.abs(event.deltaY)
    },
    { passive: true, signal },
  )
  nav.addEventListener(
    'dragstart',
    (event) => {
      if (compact.matches) event.preventDefault()
    },
    { signal },
  )
  nav.addEventListener(
    'pointerdown',
    (event) => {
      input = false
      suppressClick = false
      if (!compact.matches || event.pointerType !== 'mouse' || event.button !== 0) return
      drag = { id: event.pointerId, x: event.clientX, left: nav.scrollLeft }
    },
    { signal },
  )
  nav.addEventListener(
    'pointermove',
    (event) => {
      if (!drag || event.pointerId !== drag.id) return
      const distance = event.clientX - drag.x
      if (!suppressClick && Math.abs(distance) < 6) return
      suppressClick = true
      input = true
      nav.dataset.dragging = ''
      nav.setPointerCapture(event.pointerId)
      event.preventDefault()
      nav.scrollLeft = drag.left - distance
    },
    { signal },
  )
  const release = () => {
    if (drag && nav.hasPointerCapture(drag.id)) nav.releasePointerCapture(drag.id)
    drag = undefined
    delete nav.dataset.dragging
  }
  window.addEventListener('pointerup', release, { signal })
  window.addEventListener('pointercancel', release, { signal })
  nav.addEventListener(
    'click',
    (event) => {
      const suppress = suppressClick && event.detail > 0
      suppressClick = false
      if (!suppress) return
      event.preventDefault()
      event.stopImmediatePropagation()
    },
    { capture: true, signal },
  )
  compact.addEventListener(
    'change',
    () => {
      release()
      scrubY = undefined
      scheduleLayout()
    },
    { signal },
  )
  signal.addEventListener(
    'abort',
    () => {
      release()
      cancelAnimationFrame(frame)
      clearTimeout(settling)
      nav.style.removeProperty('--nav-leading')
      nav.style.removeProperty('--nav-trailing')
    },
    { once: true },
  )
  return {
    get active() {
      return compact.matches
    },
    measure(stops: readonly HTMLElement[]) {
      width = nav.clientWidth
      if (!compact.matches) {
        nav.style.removeProperty('--nav-leading')
        nav.style.removeProperty('--nav-trailing')
        nav.scrollLeft = 0
        return
      }
      const first = stops[0],
        last = stops.at(-1)
      if (!first || !last) return
      nav.style.setProperty('--nav-leading', `${Math.max(0, width / 2 - first.offsetWidth / 2)}px`)
      nav.style.setProperty('--nav-trailing', `${Math.max(0, width / 2 - last.offsetWidth / 2)}px`)
    },
    layout(next: TimelinePoint[]) {
      points = next
      inverse = points.map(({ at, value }) => ({ at: value, value: at }))
      scrubY = undefined
      follow()
    },
    follow,
  }
}
