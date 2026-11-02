/** Follow the native sticky stage's exit, including restored/deep scroll positions. */
export function mountNavigationPosition(host: HTMLElement, signal: AbortSignal) {
  const header = host.querySelector<HTMLElement>('.temple-top-navigation')
  const stage = host.querySelector<HTMLElement>('.temple-stage')
  if (!header || !stage || signal.aborted) return
  const title = header.querySelector<HTMLElement>('.temple-nav-title')
  const date = header.querySelector<HTMLElement>('.temple-nav-date')
  const fitDate = () => {
    if (!title || !date || signal.aborted) return
    const range = document.createRange()
    range.selectNodeContents(date)
    const width = range.getBoundingClientRect().width
    if (!width) return
    const size = parseFloat(getComputedStyle(date).fontSize)
    date.style.fontSize = `${(size * title.getBoundingClientRect().width) / width}px`
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
