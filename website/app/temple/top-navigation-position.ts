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
  const fixed = header.querySelector<HTMLElement>('.temple-nav-enter a')
  const hint = entry
    ?.closest('.temple-entry-welcome')
    ?.querySelector<HTMLElement>('.temple-entry-more')
  let previous: boolean | undefined
  let motions: Animation[] = []
  const cancelMotion = () => {
    for (const motion of motions) motion.cancel()
    motions = []
  }
  const update = () => {
    const visible = entry
      ? entry.getBoundingClientRect().top <= (header.offsetHeight - entry.offsetHeight) / 2
      : stage.getBoundingClientRect().top < 0
    const headerBox = hint ? header.getBoundingClientRect() : undefined
    const hintBox = hint?.getBoundingClientRect()
    const hintCovered = visible && hintBox && headerBox && hintBox.bottom <= headerBox.bottom
    const changing = previous !== undefined && previous !== visible
    const source = visible ? entry : fixed
    const target = visible ? fixed : entry
    const animate =
      changing && source && target && !matchMedia('(prefers-reduced-motion: reduce)').matches
    // Capture the painted pose before cancellation so a reversal starts in place.
    const from = animate ? source.getBoundingClientRect() : undefined
    const fromLabel = animate ? source.querySelector('span')?.getBoundingClientRect() : undefined
    const fromExtra = animate ? source.querySelector('.temple-enter-label-extra') : null
    const fromOpacity = fromExtra ? Number(getComputedStyle(fromExtra).opacity) : 0
    if (changing) cancelMotion()
    const to = animate ? target.getBoundingClientRect() : undefined
    const label = animate ? target.querySelector<HTMLElement>('span') : null
    const extra = animate ? target.querySelector<HTMLElement>('.temple-enter-label-extra') : null
    const toLabel = label?.getBoundingClientRect()
    const toExtra = extra?.getBoundingClientRect()
    if (visible) header.dataset.navEntered = ''
    header.toggleAttribute('data-nav-visible', visible)
    header.toggleAttribute('data-nav-hint-covered', Boolean(hintCovered))
    previous = visible
    if (!from || !fromLabel || !to || !toLabel || !toExtra || !target || !label || !extra) return
    // Transform the painted outline only. Native widths stay fixed, so the
    // glimmer canvas never reallocates while the silhouette changes width.
    const fromCenter = from.left + from.width / 2
    const toCenter = to.left + to.width / 2
    const ratio = from.width / to.width
    // Sample reciprocal text scales on the same easing curve to keep glyphs
    // sharp and undistorted, with Enter gliding from its current position.
    const frames = Array.from({ length: 17 }, (_, index) => {
      const t = index / 16
      const scale = ratio + (1 - ratio) * t
      const center = fromCenter + (toCenter - fromCenter) * t
      const left = fromLabel.left + (toLabel.left - fromLabel.left) * t
      const labelX = (left - center) / scale - (toLabel.left - toCenter)
      const extraX = (left + toLabel.width - center) / scale - (toExtra.left - toCenter)
      const visibleExtra = Math.max(0, center + (to.width * scale) / 2 - 8 - left - toLabel.width)
      return {
        outline: {
          offset: t,
          transformOrigin: '50% 50%',
          transform: `translateX(${center - toCenter}px) scaleX(${scale})`,
        },
        label: {
          offset: t,
          transformOrigin: '0 50%',
          transform: `translateX(${labelX}px) scaleX(${1 / scale})`,
        },
        extra: {
          offset: t,
          transformOrigin: '0 50%',
          overflow: 'visible',
          clipPath: `inset(-4px ${toExtra.width - visibleExtra}px -4px 0px)`,
          transform: `translateX(${extraX}px) scaleX(${1 / scale})`,
          opacity: fromOpacity + (Number(visible) - fromOpacity) * t,
        },
      }
    })
    const timing = { duration: 420, easing: 'cubic-bezier(.2,.7,.2,1)' }
    motions = [
      target.animate(
        frames.map((frame) => frame.outline),
        timing,
      ),
      label.animate(
        frames.map((frame) => frame.label),
        timing,
      ),
      extra.animate(
        frames.map((frame) => frame.extra),
        timing,
      ),
    ]
    for (const motion of motions) void motion.finished.catch(() => {})
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
      cancelMotion()
      observer.disconnect()
      header.removeAttribute('data-nav-mounted')
      header.removeAttribute('data-nav-visible')
      header.removeAttribute('data-nav-entered')
      header.removeAttribute('data-nav-hint-covered')
    },
    { once: true },
  )
}
