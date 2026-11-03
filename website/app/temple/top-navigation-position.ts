/** Follow the native sticky stage's exit, including restored/deep scroll positions. */
export function mountNavigationPosition(host: HTMLElement, signal: AbortSignal) {
  const header = host.querySelector<HTMLElement>('.temple-top-navigation')
  const stage = host.querySelector<HTMLElement>('.temple-stage')
  if (!header || !stage || signal.aborted) return
  const title = header.querySelector<HTMLElement>('.temple-nav-title')
  const date = header.querySelector<HTMLElement>('.temple-nav-date')
  const measure = document.createElement('canvas').getContext('2d')
  const fitDate = () => {
    if (!title || !date || !measure || signal.aborted) return
    const style = getComputedStyle(date)
    let size = parseFloat(style.fontSize)
    const target = title.getBoundingClientRect().width
    // Measure just the native text; its absolutely positioned material canvas
    // must not influence fitting or introduce extra letter spacing.
    for (let i = 0; i < 3; i++) {
      measure.font = `${style.fontWeight} ${size}px ${style.fontFamily}`
      measure.fontKerning = 'normal'
      const width = measure.measureText(date.textContent ?? '').width
      if (!width) return
      size *= target / width
    }
    date.style.fontSize = `${size}px`
  }
  // Fit native date text when the wordmark changes size, never on scroll.
  const sizeObserver = new ResizeObserver(fitDate)
  if (title && date) sizeObserver.observe(title)
  void document.fonts.ready.then(fitDate)
  const update = () => {
    const visible = stage.getBoundingClientRect().top < 0
    if (visible) header.dataset.navEntered = ''
    header.toggleAttribute('data-nav-visible', visible)
  }
  header.dataset.navMounted = ''
  const observer = new IntersectionObserver(update, { threshold: 1 })
  observer.observe(stage)
  update()
  signal.addEventListener(
    'abort',
    () => {
      observer.disconnect()
      sizeObserver.disconnect()
      date?.style.removeProperty('font-size')
      header.removeAttribute('data-nav-mounted')
      header.removeAttribute('data-nav-visible')
      header.removeAttribute('data-nav-entered')
    },
    { once: true },
  )
}
