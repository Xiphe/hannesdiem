// The accepted fragment tooltip behavior, independent of authored page content.
export function mountPieceTooltip(root: HTMLElement, signal: AbortSignal) {
  if (signal.aborted) return
  const trigger = root.querySelector<HTMLButtonElement>('.piece-tooltip-trigger')!
  const tooltip = root.querySelector<HTMLElement>('.piece-tooltip')!
  const tooltipOutline = tooltip.querySelector<SVGPathElement>('path')!
  let pinned = false
  let hovering = false
  let focused = false
  let closing: ReturnType<typeof setTimeout> | undefined
  const close = () => {
    clearTimeout(closing)
    tooltip.hidePopover()
    trigger.setAttribute('aria-expanded', 'false')
  }
  const position = () => {
    const anchor = trigger.getBoundingClientRect()
    const box = tooltip.getBoundingClientRect()
    const center = anchor.left + anchor.width / 2
    const left = Math.max(12, Math.min(innerWidth - box.width - 12, center - box.width / 2))
    const below = anchor.bottom + box.height <= innerHeight - 12
    const arrow = Math.max(28, Math.min(372, ((center - left) / box.width) * 400))
    tooltip.dataset.placement = below ? 'bottom' : 'top'
    tooltip.style.left = `${left}px`
    tooltip.style.top = `${below ? anchor.bottom : Math.max(12, anchor.top - box.height)}px`
    // Integrate the pointer into the fragment so it shares the same material.
    tooltipOutline.setAttribute(
      'd',
      `M25 17Q${arrow / 2} 9 ${arrow - 12} 14L${arrow} 0L${arrow + 12} 14Q${(arrow + 400) / 2} 19 365 7Q390 5 387 29L397 141Q400 160 377 162C260 155 154 179 26 170Q7 169 10 149L3 40Q0 21 25 17Z`,
    )
  }
  const open = () => {
    clearTimeout(closing)
    tooltip.showPopover()
    trigger.setAttribute('aria-expanded', 'true')
    position()
  }
  const leave = () => {
    closing = setTimeout(() => {
      if (!pinned && !hovering && !focused) close()
    }, 150)
  }
  for (const element of [trigger, tooltip]) {
    element.addEventListener(
      'pointerenter',
      (event) => {
        if (event.pointerType !== 'mouse') return
        hovering = true
        open()
      },
      { signal },
    )
    element.addEventListener(
      'pointerleave',
      () => {
        hovering = false
        leave()
      },
      { signal },
    )
  }
  trigger.addEventListener(
    'focus',
    () => {
      if (!trigger.matches(':focus-visible')) return
      focused = true
      open()
    },
    { signal },
  )
  trigger.addEventListener(
    'blur',
    () => {
      focused = false
      pinned = false
      close()
    },
    { signal },
  )
  trigger.addEventListener(
    'click',
    () => {
      pinned = !pinned
      if (pinned) open()
      else close()
    },
    { signal },
  )
  tooltip.addEventListener(
    'toggle',
    () => {
      const visible = tooltip.matches(':popover-open')
      trigger.setAttribute('aria-expanded', String(visible))
      if (!visible) pinned = false
    },
    { signal },
  )
  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Escape') {
        pinned = false
        close()
      }
    },
    { signal },
  )
  addEventListener(
    'scroll',
    () => {
      if (tooltip.matches(':popover-open')) position()
    },
    { passive: true, capture: true, signal },
  )
  addEventListener('resize', close, { signal })
  signal.addEventListener('abort', close, { once: true })
}
