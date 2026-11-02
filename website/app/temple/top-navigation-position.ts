/** Follow the native sticky stage's exit, including restored/deep scroll positions. */
export function mountNavigationPosition(host: HTMLElement, signal: AbortSignal) {
  const header = host.querySelector<HTMLElement>('.temple-top-navigation')
  const stage = host.querySelector<HTMLElement>('.temple-stage')
  if (!header || !stage || signal.aborted) return
  const update = () =>
    header.toggleAttribute('data-nav-visible', stage.getBoundingClientRect().top < 0)
  header.dataset.navMounted = ''
  const observer = new IntersectionObserver(update, { threshold: 1 })
  observer.observe(stage)
  update()
  signal.addEventListener(
    'abort',
    () => {
      observer.disconnect()
      header.removeAttribute('data-nav-mounted')
      header.removeAttribute('data-nav-visible')
    },
    { once: true },
  )
}
