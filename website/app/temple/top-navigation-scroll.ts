/** Native hash destinations with a deliberately unhurried, cancellable arrival. */
export function mountNavigationScroll(host: HTMLElement, signal: AbortSignal) {
  const header = host.querySelector<HTMLElement>('.temple-top-navigation')
  if (!header || signal.aborted) return
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  let frame = 0
  const cancel = () => {
    cancelAnimationFrame(frame)
    frame = 0
  }
  header.addEventListener(
    'click',
    (event) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return
      const link = (event.target as Element).closest<HTMLAnchorElement>('a[href^="#"]')
      if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return
      let id: string
      try {
        id = decodeURIComponent(link.hash.slice(1))
      } catch {
        return
      }
      const target = document.getElementById(id)
      if (!target) return
      event.preventDefault()
      cancel()
      const from = scrollY
      const margin = target.matches('.temple-opening')
        ? 0
        : Math.max(
            parseFloat(getComputedStyle(target).scrollMarginTop) || 0,
            header.offsetHeight + 16,
          )
      const to = Math.max(
        0,
        Math.min(
          document.documentElement.scrollHeight - innerHeight,
          from + target.getBoundingClientRect().top - margin,
        ),
      )
      if (location.hash !== link.hash) history.pushState(history.state, '', link.hash)
      const finish = () => {
        frame = 0
        const temporary = !target.hasAttribute('tabindex')
        if (temporary) target.tabIndex = -1
        target.focus({ preventScroll: true })
        if (temporary) {
          const cleanup = () => {
            if (target.getAttribute('tabindex') === '-1') target.removeAttribute('tabindex')
            signal.removeEventListener('abort', cleanup)
          }
          target.addEventListener('blur', cleanup, { once: true, signal })
          signal.addEventListener('abort', cleanup, { once: true })
        }
      }
      if (reduced.matches || Math.abs(to - from) < 1) {
        scrollTo({ top: to, behavior: 'instant' })
        finish()
        return
      }
      const duration = Math.min(1800, Math.max(1200, Math.abs(to - from) * 0.35))
      const start = performance.now()
      const move = (now: number) => {
        const t = Math.min(1, (now - start) / duration)
        const ease = t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2
        scrollTo({ top: from + (to - from) * ease, behavior: 'instant' })
        if (t < 1) frame = requestAnimationFrame(move)
        else finish()
      }
      frame = requestAnimationFrame(move)
    },
    { signal },
  )
  for (const event of ['wheel', 'touchstart', 'pointerdown', 'popstate', 'pagehide', 'resize'])
    window.addEventListener(event, cancel, { passive: true, signal })
  window.addEventListener(
    'keydown',
    (event) => {
      if (
        [
          'ArrowUp',
          'ArrowDown',
          'PageUp',
          'PageDown',
          'Home',
          'End',
          ' ',
          'Escape',
          'Tab',
        ].includes(event.key)
      )
        cancel()
    },
    { signal },
  )
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden) cancel()
    },
    { signal },
  )
  reduced.addEventListener('change', cancel, { signal })
  signal.addEventListener('abort', cancel, { once: true })
}
