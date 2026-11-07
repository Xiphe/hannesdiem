/** Blend the existing, aligned logo assets using native scroll interpolation. */
export function createBridgeLogo(host: HTMLElement, signal: AbortSignal) {
  const logo = host.querySelector<HTMLElement>('.temple-nav-logo-original')
  const intro = host.querySelector<HTMLElement>('.bridge-copy, .bridge-body')
  const body = host.querySelector<HTMLElement>('.bridge-body') ?? intro
  let animation: Animation | undefined
  signal.addEventListener('abort', () => animation?.cancel(), { once: true })
  return {
    resize() {
      animation?.cancel()
      animation = undefined
      if (!logo || !intro || !body || signal.aborted || typeof ScrollTimeline === 'undefined')
        return
      const distance = document.documentElement.scrollHeight - innerHeight
      if (distance <= 0) return
      const top = scrollY + intro.getBoundingClientRect().top
      const bottom = scrollY + body.getBoundingClientRect().bottom
      const offset = (position: number) => Math.max(0, Math.min(1, position / distance))
      const start = offset(top - innerHeight * 1.6)
      const end = offset(bottom + innerHeight * 0.6)
      const enter = Math.min(end, offset(top + innerHeight * 0.4))
      const exit = Math.max(enter, offset(bottom - innerHeight * 1.4))
      animation = logo.animate(
        [
          { opacity: 0, offset: start },
          { opacity: 1, offset: enter },
          { opacity: 1, offset: exit },
          { opacity: 0, offset: end },
        ],
        {
          timeline: new ScrollTimeline({ source: document.scrollingElement, axis: 'block' }),
          duration: 'auto',
          fill: 'both',
          easing: 'linear',
        },
      )
    },
  }
}
