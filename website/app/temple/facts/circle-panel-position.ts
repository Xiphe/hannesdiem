/** Keep the existing piece close to its chosen seat in document space.
 * Like the shared piece tooltip, clamp horizontally to the viewport; normal
 * page scrolling keeps the form reachable without covering its anchor.
 */
export function mountCirclePanelPosition(
  root: HTMLFieldSetElement,
  signal: AbortSignal,
  selected: () => number,
) {
  if (signal.aborted) return
  const area = root.parentElement!
  const position = () => {
    const panel = area.querySelector<HTMLElement>('.circle-signup[data-floating]')
    const seat = root.querySelector<HTMLInputElement>(`input[value="${selected()}"]`)
    if (!panel || !seat) return
    const anchor = seat.getBoundingClientRect()
    const origin = area.getBoundingClientRect()
    const width = panel.getBoundingClientRect().width
    const centre = Math.max(
      12 + width / 2,
      Math.min(innerWidth - 12 - width / 2, anchor.left + anchor.width / 2),
    )
    panel.style.setProperty('--circle-panel-top', `${anchor.bottom - origin.top + 8}px`)
    panel.style.setProperty('--circle-panel-left', `${centre - origin.left}px`)
  }
  root.addEventListener('circle-selection', position, { signal })
  addEventListener('resize', position, { signal })
  const size = new ResizeObserver(position)
  size.observe(root)
  signal.addEventListener('abort', () => size.disconnect(), { once: true })
}
