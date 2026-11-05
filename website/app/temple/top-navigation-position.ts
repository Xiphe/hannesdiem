/** First whole scroll pixel beyond the opener's native sticky hold. */
export function navigationScrollStart(stage: HTMLElement) {
  const track = stage.parentElement!
  return Math.max(
    0,
    Math.ceil(scrollY + track.getBoundingClientRect().bottom - stage.offsetHeight) + 1,
  )
}

/** Follow the native sticky stage's exit, including restored/deep scroll positions. */
export function mountNavigationPosition(host: HTMLElement, signal: AbortSignal) {
  const header = host.querySelector<HTMLElement>('.temple-top-navigation')
  const stage = host.querySelector<HTMLElement>('.temple-stage')
  if (!header || !stage || signal.aborted) return
  const entry =
    host.dataset.templeView === 'poem'
      ? host.querySelector<HTMLElement>('.temple-entry-welcome a')
      : null
  const update = () => {
    const visible = entry
      ? entry.getBoundingClientRect().top <= (header.offsetHeight - entry.offsetHeight) / 2
      : stage.getBoundingClientRect().top < 0
    if (visible) header.dataset.navEntered = ''
    header.toggleAttribute('data-nav-visible', visible)
  }
  header.dataset.navMounted = ''
  const observer = new IntersectionObserver(update, { threshold: 1 })
  observer.observe(entry ?? stage)
  if (entry) {
    window.addEventListener('scroll', update, { passive: true, signal })
    window.addEventListener('resize', update, { passive: true, signal })
  }
  update()
  signal.addEventListener(
    'abort',
    () => {
      observer.disconnect()
      header.removeAttribute('data-nav-mounted')
      header.removeAttribute('data-nav-visible')
      header.removeAttribute('data-nav-entered')
    },
    { once: true },
  )
}
