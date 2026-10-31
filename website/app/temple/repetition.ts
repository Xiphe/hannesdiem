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
  signal.addEventListener(
    'abort',
    () => {
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
    resize() {
      for (const item of items) {
        const { track, stage, statement } = item
        track.dataset.ready = ''
        track.style.setProperty('--repetition-statement-height', `${statement.offsetHeight}px`)
        track.style.setProperty('--repetition-height', `${stage.offsetHeight}px`)
        item.lock = parseFloat(getComputedStyle(stage).top)
        item.height = stage.offsetHeight
        item.hold = Math.max(1, track.offsetHeight - item.height)
      }
    },
    draw(reduced: boolean) {
      const positions = items.map(({ track }) => track.getBoundingClientRect())
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
      for (const [index, item] of items.entries()) {
        const rect = positions[index]
        const { y, nativeY } = layouts[index]
        const motion = reduced ? '' : `translateY(${y - nativeY}px)`
        if (motion !== item.motion) {
          item.stage.style.transform = motion
          item.motion = motion
        }
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
          nextTop === undefined
            ? item.hold
            : Math.max(1, readingTravel + nextTop - innerHeight + 24)
        const reveal =
          previous && !reduced
            ? layouts[index].incoming < 1
              ? 0
              : readingTravel / readingRange
            : (progress - 0.12) / 0.24
        const t = Math.max(0, Math.min(1, reveal))
        const opacity = reduced ? (progress > 0.1 ? 1 : 0) : t * t * (3 - 2 * t)
        if (opacity !== item.opacity) {
          item.reflection.style.opacity = String(opacity)
          item.reflection.style.setProperty(
            '--reflection-offset',
            `${reduced ? 0 : 40 * (1 - t) ** 3}px`,
          )
          item.opacity = opacity
        }
      }
    },
  }
}
