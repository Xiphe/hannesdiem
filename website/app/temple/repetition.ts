// Native sticky stages hold the accusation; the reflection enters independently.
export function createRepetition(root: HTMLElement, signal: AbortSignal) {
  const items = [...root.querySelectorAll<HTMLElement>('.repetition-track')].map((track) => ({
    track,
    stage: track.querySelector<HTMLElement>('.repetition-stage')!,
    statement: track.querySelector<HTMLElement>('.repetition-statement')!,
    reflection: track.querySelector<HTMLElement>('.repetition-reflection')!,
    opacity: -1,
    lock: 0,
    hold: 1,
    height: 0,
    motion: '',
  }))
  const animations: Animation[] = []
  let native = false
  function cancelAnimations() {
    for (const animation of animations) animation.cancel()
    animations.length = 0
    native = false
  }
  // One geometry model serves the frame-driven fallback and the native timeline.
  // Native keyframes are prepared only when fitting changes, never while scrolling.
  function layout(positions: { top: number; bottom: number }[], reduced: boolean) {
    const layouts = items.map((item, index) => {
      const rect = positions[index]
      const clamp = (value: number) => Math.max(0, Math.min(1, value))
      const previous = items[index - 1]
      const next = items[index + 1]
      const incomingDistance = previous ? previous.lock + previous.height + 8 - item.lock : 0
      const impactTravel = previous ? previous.lock + previous.height + 8 - rect.top : 0
      const incoming = previous ? clamp(impactTravel / Math.max(1, incomingDistance)) : 1
      // A short 50/50 contact: both receive the same initial speed.
      // The incoming block immediately decelerates; the outgoing keeps moving.
      let y =
        previous && impactTravel >= 0
          ? item.lock + incomingDistance * (1 - incoming) ** 2
          : Math.max(rect.top, item.lock)
      const contactTravel = next
        ? Math.max(0, item.lock + item.height + 8 - positions[index + 1].top)
        : 0
      y -= contactTravel * 2
      const nativeY = Math.min(Math.max(rect.top, item.lock), rect.bottom - item.height)
      if (!next && incoming >= 1) y = nativeY
      return {
        y,
        nativeY,
        incoming,
        settledTravel: Math.max(0, impactTravel - incomingDistance),
      }
    })
    // Resolve from the lowest block upwards. A trajectory can transfer
    // momentum, but can never cross the next block's top edge.
    if (!reduced) {
      for (let index = layouts.length - 2; index >= 0; index--) {
        const next = layouts[index + 1]
        const nextTop = next.y
        layouts[index].y = Math.min(layouts[index].y, nextTop - items[index].height - 8)
      }
    }
    return items.map((item, index) => {
      const rect = positions[index]
      const { y, nativeY } = layouts[index]
      const previous = items[index - 1]
      const progress =
        previous && !reduced
          ? layouts[index].incoming < 1
            ? 0
            : layouts[index].settledTravel / item.hold
          : (item.lock - rect.top) / item.hold
      const nextTop = positions[index + 1]?.top
      // The last block has no incoming repetition: its reflection continues
      // until native sticky release, rather than ending at the chorus box.
      const readingTravel = layouts[index].settledTravel
      const readingRange =
        nextTop === undefined ? item.hold : Math.max(1, readingTravel + nextTop - innerHeight + 24)
      const reveal =
        previous && !reduced
          ? layouts[index].incoming < 1
            ? 0
            : readingTravel / readingRange
          : (progress - 0.12) / 0.24
      const t = Math.max(0, Math.min(1, reveal))
      const opacity = reduced ? (progress > 0.1 ? 1 : 0) : t * t * (3 - 2 * t)
      return { motion: reduced ? 0 : y - nativeY, opacity, offset: reduced ? 0 : 40 * (1 - t) ** 3 }
    })
  }
  signal.addEventListener(
    'abort',
    () => {
      cancelAnimations()
      for (const { track, stage, reflection } of items) {
        track.removeAttribute('data-ready')
        track.removeAttribute('style')
        stage.style.removeProperty('transform')
        reflection.style.removeProperty('opacity')
        reflection.style.removeProperty('--reflection-offset')
      }
    },
    { once: true },
  )
  return {
    resize(reduced: boolean) {
      cancelAnimations()
      for (const item of items) {
        item.stage.style.removeProperty('transform')
        item.motion = ''
        item.opacity = -1

        const { track, stage, statement } = item
        track.dataset.ready = ''
        track.style.setProperty('--repetition-statement-height', `${statement.offsetHeight}px`)
        track.style.setProperty('--repetition-height', `${stage.offsetHeight}px`)
        item.lock = parseFloat(getComputedStyle(stage).top)
        item.height = stage.offsetHeight
        item.hold = Math.max(1, track.offsetHeight - item.height)
      }
      if (reduced || typeof ViewTimeline === 'undefined') return
      const positions = items.map(({ track }) => track.getBoundingClientRect())
      for (const [index, item] of items.entries()) {
        const viewport = document.documentElement.clientHeight
        const range = viewport + positions[index].height
        // Four-pixel samples retain the quadratic handoff and shared collision
        // resolution. Include each sticky/contact boundary to avoid corner drift.
        const stops = new Set([0, range])
        for (let travel = 4; travel < range; travel += 4) stops.add(travel)
        for (const [i, other] of items.entries()) {
          const delta = positions[i].top - positions[index].top
          for (const top of [
            other.lock,
            other.lock + other.height - positions[i].height,
            items[i - 1] ? items[i - 1].lock + items[i - 1].height + 8 : other.lock,
          ]) {
            const travel = viewport + delta - top
            if (travel > 0 && travel < range) stops.add(travel)
          }
        }
        const samples = [...stops]
          .sort((a, b) => a - b)
          .map((travel) => {
            const delta = viewport - travel - positions[index].top
            const value = layout(
              positions.map((rect) => ({
                top: rect.top + delta,
                bottom: rect.bottom + delta,
              })),
              false,
            )[index]
            return { offset: travel / range, value }
          })
        const timeline = new ViewTimeline({ subject: item.track, axis: 'block', inset: '0px' })
        const options = { timeline, fill: 'both' as const }
        animations.push(
          item.stage.animate(
            samples.map(({ offset, value }) => ({
              offset,
              transform: `translateY(${value.motion}px)`,
            })),
            options,
          ),
          item.reflection.animate(
            samples.map(({ offset, value }) => ({
              offset,
              opacity: value.opacity,
            })),
            options,
          ),
          item.reflection.querySelector<HTMLElement>('.phrase-entry')!.animate(
            samples.map(({ offset, value }) => ({
              offset,
              transform: `translateX(${value.offset}px)`,
            })),
            options,
          ),
        )
      }
      native = true
    },
    draw(reduced: boolean) {
      if (native) return
      const positions = items.map(({ track }) => track.getBoundingClientRect())
      const layouts = layout(positions, reduced)
      for (const [index, item] of items.entries()) {
        const { motion: translate, opacity, offset } = layouts[index]
        const motion = reduced ? '' : `translateY(${translate}px)`
        if (motion !== item.motion) {
          item.stage.style.transform = motion
          item.motion = motion
        }
        if (opacity !== item.opacity) {
          item.reflection.style.opacity = String(opacity)
          item.reflection.style.setProperty('--reflection-offset', `${offset}px`)
          item.opacity = opacity
        }
      }
    },
  }
}
