/** Own one pending frame, visibility suspension and the island's abort lifetime.
 * Drawing, idle decisions and simulation clocks remain with the artwork.
 * Requests are one-shot; draw requests continuation. Stopping, hiding and
 * aborting call reset. Visibility resumes request a frame unless overridden.
 */
export function createVisibleAnimation(
  signal: AbortSignal,
  {
    draw,
    reset,
    target,
    resume,
  }: {
    draw(now: number): void
    reset(): void
    target?: Element
    /** Use when resuming needs synchronous feedback before scheduling a draw. */
    resume?(): void
  },
) {
  let frame = 0
  // Observed artwork waits for its first intersection notification.
  let visible = !target
  const active = () => !signal.aborted && !document.hidden && visible
  const stop = () => {
    cancelAnimationFrame(frame)
    frame = 0
    reset()
  }
  const request = () => {
    if (!frame && active())
      frame = requestAnimationFrame((now) => {
        frame = 0
        if (active()) draw(now)
      })
  }
  if (!signal.aborted) {
    const observer = target
      ? new IntersectionObserver(([entry]) => {
          visible = entry.isIntersecting
          if (visible) (resume ?? request)()
          else stop()
        })
      : undefined
    if (target) observer!.observe(target)
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden) stop()
        else (resume ?? request)()
      },
      { signal },
    )
    signal.addEventListener(
      'abort',
      () => {
        stop()
        observer?.disconnect()
      },
      { once: true },
    )
  }
  return {
    request,
    stop,
    /** Eligible to draw, including while idle; false when hidden or aborted. */
    get active() {
      return active()
    },
  }
}
