/** Flip the existing piece around its chosen seat, inside the visible viewport. */
export function mountCirclePanelPosition(
  root: HTMLFieldSetElement,
  signal: AbortSignal,
  selected: () => number,
) {
  if (signal.aborted) return
  const area = root.parentElement!
  let observed: HTMLElement | null | undefined
  let fields: HTMLElement | null = null
  const size = new ResizeObserver(() => position())
  const position = () => {
    const panel = area.querySelector<HTMLElement>('.circle-signup[data-floating]')
    const card = panel?.querySelector<HTMLElement>('.temple-signup-expanded')
    if (card !== observed) {
      if (observed) size.unobserve(observed)
      if (fields) size.unobserve(fields)
      observed = card
      fields = card?.querySelector<HTMLElement>('.circle-fields') ?? null
      if (card) size.observe(card, { box: 'border-box' })
      if (fields) size.observe(fields)
    }
    const seat = root.querySelector<HTMLInputElement>(`input[value="${selected()}"]`)
    if (!panel || !card || !seat) return
    const viewport = window.visualViewport
    const left = (viewport?.offsetLeft ?? 0) + 12
    const right = (viewport?.offsetLeft ?? 0) + (viewport?.width ?? innerWidth) - 12
    const bottom = (viewport?.offsetTop ?? 0) + (viewport?.height ?? innerHeight) - 12
    const header = document.querySelector<HTMLElement>('.temple-top-navigation')
    const headerBottom =
      header && getComputedStyle(header).visibility !== 'hidden'
        ? header.getBoundingClientRect().bottom + 8
        : 0
    const top = Math.max((viewport?.offsetTop ?? 0) + 12, headerBottom)
    panel.style.setProperty('--circle-panel-max-width', `${right - left}px`)
    const anchor = seat.getBoundingClientRect()
    const origin = area.getBoundingClientRect()
    const width = panel.getBoundingClientRect().width
    // Measure natural content plus padding: the wrapper has zero height and
    // a constrained card's scrollHeight can omit part of its bottom padding.
    const style = getComputedStyle(card)
    const height =
      (fields?.getBoundingClientRect().height ?? 0) +
      parseFloat(style.paddingTop) +
      parseFloat(style.paddingBottom)
    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
    const above = Math.max(0, Math.min(bottom, anchor.top - 8) - top)
    const below = Math.max(0, bottom - Math.max(top, anchor.bottom + 8))
    let x = clamp(anchor.left + (anchor.width - width) / 2, left, right - width)
    let y: number
    let maxHeight = bottom - top
    // Prefer a side placement when possible; clamping along that side never
    // covers the selected seat. Otherwise flip vertically, as with a tooltip.
    if (anchor.right + 8 + width <= right) {
      x = Math.max(left, anchor.right + 8)
      y = clamp(anchor.top + (anchor.height - height) / 2, top, bottom - height)
    } else if (height <= above) {
      y = anchor.top - 8 - height
      maxHeight = above
    } else if (height <= below) {
      y = anchor.bottom + 8
      maxHeight = below
    } else if (anchor.left - 8 - width >= left) {
      x = Math.min(right - width, anchor.left - 8 - width)
      y = clamp(anchor.top + (anchor.height - height) / 2, top, bottom - height)
    } else if (above > below) {
      maxHeight = above
      y = top
    } else {
      maxHeight = below
      y = Math.max(top, anchor.bottom + 8)
    }
    panel.style.setProperty('--circle-panel-max-height', `${maxHeight}px`)
    panel.style.setProperty('--circle-panel-top', `${y - origin.top}px`)
    panel.style.setProperty('--circle-panel-left', `${x + width / 2 - origin.left}px`)
  }
  root.addEventListener('circle-selection', position, { signal })
  addEventListener('resize', position, { signal })
  addEventListener('scroll', position, { passive: true, capture: true, signal })
  window.visualViewport?.addEventListener('resize', position, { signal })
  window.visualViewport?.addEventListener('scroll', position, { signal })
  size.observe(root)
  // Responsive poem/section layout can move the anchor without resizing it.
  size.observe(root.closest('.temple-artwork') ?? area)
  signal.addEventListener('abort', () => size.disconnect(), { once: true })
}
