/** Drag only the bottom summary; description scrolling and seeking stay native. */
export function mountFeedDrawer(
  root: HTMLElement,
  signal: AbortSignal,
  expanded: (open: boolean) => void,
  interact: () => void,
) {
  let drag:
    | {
        id: number
        y: number
        delta: number
        open: boolean
        height: number
        summary: HTMLElement
        panel: HTMLElement
      }
    | undefined
  let suppressClick = false
  const reset = () => {
    if (!drag) return
    if (drag.summary.hasPointerCapture(drag.id)) drag.summary.releasePointerCapture(drag.id)
    drag.panel.style.removeProperty('--drawer-offset')
    delete drag.panel.dataset.dragging
    drag = undefined
  }
  root.addEventListener(
    'pointerdown',
    (event) => {
      const target = event.target as Element
      const summary = target.closest<HTMLElement>('.feed-summary')
      if (!summary || event.button !== 0 || target.closest('input, .feed-volume-control')) return
      const article = summary.closest<HTMLElement>('.feed-post')!
      suppressClick = false
      drag = {
        id: event.pointerId,
        y: event.clientY,
        delta: 0,
        open: article.hasAttribute('data-details'),
        height: article.querySelector('.feed-details')!.getBoundingClientRect().height,
        summary,
        panel: summary.closest<HTMLElement>('.feed-panel')!,
      }
    },
    { signal },
  )
  root.addEventListener(
    'pointermove',
    (event) => {
      if (!drag || event.pointerId !== drag.id) return
      drag.delta = event.clientY - drag.y
      if (!suppressClick && Math.abs(drag.delta) < 6) return
      suppressClick = true
      drag.summary.setPointerCapture(event.pointerId)
      drag.panel.dataset.dragging = ''
      const offset = Math.max(0, Math.min(drag.height, (drag.open ? 0 : drag.height) + drag.delta))
      drag.panel.style.setProperty('--drawer-offset', `${offset}px`)
      interact()
      event.preventDefault()
    },
    { signal },
  )
  window.addEventListener(
    'pointerup',
    () => {
      if (!drag) return
      const open = Math.abs(drag.delta) > 24 ? drag.delta < 0 : drag.open
      if (suppressClick) expanded(open)
      reset()
    },
    { signal },
  )
  window.addEventListener('pointercancel', reset, { signal })
  root.addEventListener(
    'click',
    (event) => {
      if (!suppressClick || !event.detail) return
      suppressClick = false
      event.preventDefault()
      event.stopImmediatePropagation()
    },
    { capture: true, signal },
  )
  signal.addEventListener('abort', reset, { once: true })
  return { cancel: reset }
}
