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
    const actionBox = hint && fixed ? fixed.getBoundingClientRect() : undefined
    const headerBox = actionBox ? header.getBoundingClientRect() : undefined
    const hintBox = actionBox ? hint!.getBoundingClientRect() : undefined
    const hintCovered = visible && hintBox && actionBox && hintBox.bottom <= actionBox.bottom
    const changing = previous !== undefined && previous !== visible && entry && fixed
    const source = visible ? entry : fixed
    const target = visible ? fixed : entry
    // Read the current painted geometry before reversing an unfinished handoff.
    const from = changing && source ? source.getBoundingClientRect() : undefined
    const padding = from && source ? getComputedStyle(source) : undefined
    const fromPaddingStart = padding?.paddingInlineStart
    const fromPaddingEnd = padding?.paddingInlineEnd
    const sourceExtra = changing
      ? source?.querySelector<HTMLElement>('.temple-enter-label-extra')
      : undefined
    const fromExtraWidth = sourceExtra?.getBoundingClientRect().width ?? 0
    const fromExtraOpacity = sourceExtra ? getComputedStyle(sourceExtra).opacity : '0'
    if (changing) cancelMotion()
    // Measure both buttons before the visibility switch to preserve native header fades.
    const animate = from && target && !matchMedia('(prefers-reduced-motion: reduce)').matches
    const to = animate ? target.getBoundingClientRect() : undefined
    const toPadding = animate ? getComputedStyle(target) : undefined
    const toPaddingStart = toPadding?.paddingInlineStart
    const toPaddingEnd = toPadding?.paddingInlineEnd
    const extra = animate ? target.querySelector<HTMLElement>('.temple-enter-label-extra') : null
    const toExtraWidth = extra?.scrollWidth ?? 0
    // Let the hint scroll behind the opaque action before keeping it out of the top gap.
    if (actionBox && headerBox && hintBox) {
      header.style.setProperty(
        '--temple-nav-action-bottom',
        `${actionBox.bottom - headerBox.top}px`,
      )
      header.style.setProperty('--temple-nav-hint-left', `${hintBox.left - headerBox.left}px`)
      header.style.setProperty('--temple-nav-hint-right', `${hintBox.right - headerBox.left}px`)
    }
    if (visible) header.dataset.navEntered = ''
    header.toggleAttribute('data-nav-visible', visible)
    header.toggleAttribute('data-nav-hint-covered', Boolean(hintCovered))
    previous = visible
    if (!from || !target || !to || !extra) return
    const timing = { duration: 420, easing: 'cubic-bezier(.2,.7,.2,1)' }
    motions = [
      target.animate(
        [
          {
            width: `${from.width}px`,
            paddingInlineStart: fromPaddingStart,
            paddingInlineEnd: fromPaddingEnd,
          },
          {
            width: `${to.width}px`,
            paddingInlineStart: toPaddingStart,
            paddingInlineEnd: toPaddingEnd,
          },
        ],
        timing,
      ),
      extra.animate(
        [
          { maxWidth: `${fromExtraWidth}px`, opacity: fromExtraOpacity },
          { maxWidth: visible ? `${toExtraWidth}px` : '0px', opacity: visible ? '1' : '0' },
        ],
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
      header.style.removeProperty('--temple-nav-action-bottom')
      header.style.removeProperty('--temple-nav-hint-left')
      header.style.removeProperty('--temple-nav-hint-right')
    },
    { once: true },
  )
}
