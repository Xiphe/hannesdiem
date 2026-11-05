/** The summary and upward scrubber gestures pull the drawer; description scroll stays native. */
export function mountFeedDrawer(
  root: HTMLElement,
  signal: AbortSignal,
  expanded: (open: boolean, animate?: boolean) => void,
  interact: () => void,
) {
  let drag:
    | {
        id: number
        y: number
        delta: number
        open: boolean
        height: number
        offset?: number
        summary: HTMLElement
        panel: HTMLElement
      }
    | undefined
  let motion: Animation | undefined
  let movingPanel: HTMLElement | undefined
  const stopMotion = () => {
    motion?.cancel()
    motion = undefined
    movingPanel?.removeAttribute('data-animating')
    movingPanel = undefined
  }
  let suppressClick = false
  const reset = () => {
    if (!drag) return
    if (drag.summary.hasPointerCapture(drag.id)) drag.summary.releasePointerCapture(drag.id)
    drag.panel.style.removeProperty('--drawer-offset')
    delete drag.panel.dataset.dragging
    drag = undefined
  }
  const begin = (summary: HTMLElement, id: number, y: number) => {
    const article = summary.closest<HTMLElement>('.feed-post')!
    suppressClick = false
    drag = {
      id,
      y,
      delta: 0,
      open: article.hasAttribute('data-details'),
      height: article.querySelector('.feed-details')!.getBoundingClientRect().height,
      summary,
      panel: summary.closest<HTMLElement>('.feed-panel')!,
    }
  }
  root.addEventListener(
    'pointerdown',
    (event) => {
      const target = event.target as Element
      const summary = target.closest<HTMLElement>('.feed-summary')
      if (!summary || event.button !== 0 || target.closest('input, .feed-volume-control')) return
      begin(summary, event.pointerId, event.clientY)
    },
    { signal },
  )
  root.addEventListener(
    'pointermove',
    (event) => {
      if (!drag || event.pointerId !== drag.id) return
      drag.delta = event.clientY - drag.y
      if (!suppressClick && Math.abs(drag.delta) < 6) return
      if (!suppressClick) {
        drag.offset = new DOMMatrixReadOnly(getComputedStyle(drag.panel).transform).m42
        stopMotion()
      }
      suppressClick = true
      drag.summary.setPointerCapture(event.pointerId)
      drag.panel.dataset.dragging = ''
      const offset = Math.max(
        0,
        Math.min(drag.height, (drag.offset ?? (drag.open ? 0 : drag.height)) + drag.delta),
      )
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
      if (suppressClick) expanded(open, false)
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
  const cancel = () => {
    reset()
    stopMotion()
  }
  signal.addEventListener('abort', cancel, { once: true })
  return {
    cancel,
    startFromScrubber(input: HTMLInputElement, event: PointerEvent, startY: number) {
      const summary = input.closest<HTMLElement>('.feed-summary')
      if (summary) begin(summary, event.pointerId, startY)
    },
    setExpanded(article: HTMLElement, open: boolean, animate = true) {
      const panel = article.querySelector<HTMLElement>('.feed-panel')!
      const changed = article.hasAttribute('data-details') !== open
      const from = animate && changed ? getComputedStyle(panel).transform : undefined
      if (changed || !animate) stopMotion()
      article.toggleAttribute('data-details', open)
      article.querySelector<HTMLElement>('.feed-details')!.inert = !open
      const button = article.querySelector<HTMLButtonElement>('[data-details-toggle]')!
      button.setAttribute('aria-expanded', String(open))
      button.setAttribute('aria-label', open ? 'Hide description' : 'Show description')
      if (!changed || !animate || matchMedia('(prefers-reduced-motion: reduce)').matches) return
      const to = getComputedStyle(panel).transform
      if (from === to) return
      movingPanel = panel
      panel.dataset.animating = ''
      const current = panel.animate([{ transform: from! }, { transform: to }], {
        duration: 220,
        easing: 'cubic-bezier(.2,.7,.2,1)',
      })
      motion = current
      void current.finished.then(
        () => {
          if (motion !== current) return
          panel.removeAttribute('data-animating')
          motion = undefined
          movingPanel = undefined
        },
        () => {},
      )
    },
  }
}
