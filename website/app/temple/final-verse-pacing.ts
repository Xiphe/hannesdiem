import { createClosingPace, provideClosingPace } from './closing-pace.ts'

// Animation ranges are implemented by the target browsers but absent from lib.dom.
type RangedAnimation = Animation & { rangeStart: unknown; rangeEnd: unknown }
type Binding = {
  animation: RangedAnimation
  timeline: AnimationTimeline | null
  rangeStart: unknown
  rangeEnd: unknown
  easing: string
}

/** Stretch the closing passage's existing choreography in native scroll time. */
export function createFinalVersePacing(host: HTMLElement, signal: AbortSignal) {
  const track = host.querySelector<HTMLElement>('.final-pair')
  const verse = track?.querySelector<HTMLElement>('.final-verse')
  const finale = verse?.querySelector<HTMLElement>('.verse-finale')
  const drop = finale?.querySelector<HTMLElement>('.verse-drop')
  const stage = finale?.querySelector<HTMLElement>('.verse-finale-stage')
  const copy = drop?.querySelector<HTMLElement>('.verse-drop-copy')
  const firstCall = verse?.querySelector<HTMLElement>('.rise-call')
  let bindings: Binding[] = []
  let motions: Animation[] = []

  function reset() {
    provideClosingPace(host)
    for (const motion of motions) motion.cancel()
    motions = []
    for (const binding of bindings) {
      binding.animation.timeline = binding.timeline
      binding.animation.rangeStart = binding.rangeStart
      binding.animation.rangeEnd = binding.rangeEnd
      binding.animation.effect?.updateTiming({ easing: binding.easing })
    }
    bindings = []
    track?.removeAttribute('data-paced')
    track?.style.removeProperty('padding-bottom')
    track?.style.removeProperty('--drop-hold-space')
  }
  signal.addEventListener('abort', reset, { once: true })

  return {
    reset,
    resize() {
      reset()
      if (
        !track ||
        !verse ||
        !firstCall ||
        signal.aborted ||
        typeof ScrollTimeline === 'undefined' ||
        typeof ViewTimeline === 'undefined' ||
        matchMedia('(prefers-reduced-motion: reduce)').matches
      )
        return
      const stretch =
        parseFloat(getComputedStyle(track).getPropertyValue('--closing-scroll-stretch')) || 3
      if (stretch <= 1) return
      // Read resolved CSS ranges before changing layout or timeline ownership.
      const entries = verse.getAnimations({ subtree: true }).flatMap((animation) => {
        if (!('rangeStart' in animation) || !('rangeEnd' in animation)) return []
        const timeline = animation.timeline
        if (!(timeline instanceof ViewTimeline) || !animation.effect) return []
        const from = parseFloat(String(timeline.startOffset))
        const to = parseFloat(String(timeline.endOffset))
        const begin = parseFloat(String(animation.startTime)) / 100
        const duration = parseFloat(String(animation.effect.getComputedTiming().duration)) / 100
        if (![from, to, begin, duration].every(Number.isFinite)) return []
        return [
          {
            animation,
            start: from + (to - from) * begin,
            end: from + (to - from) * (begin + duration),
          },
        ]
      })
      const firstEntry = entries.find(
        ({ animation }) =>
          animation.effect instanceof KeyframeEffect && animation.effect.target === firstCall,
      )
      if (!firstEntry) return
      const style = getComputedStyle(firstCall)
      const delay = parseFloat(style.getPropertyValue('--rise-delay')) / 100
      const duration = parseFloat(style.getPropertyValue('--rise-entry-duration')) || 1
      const entryStart = 1 - (1 - delay) * duration
      // The call's own catch-up offset must enter the viewport too. Solve its
      // linear approach before stretching time, rather than using its flow box.
      const viewport = host.querySelector('.temple-stage')!.getBoundingClientRect().height
      const travel = viewport * 0.65
      const inkOffset =
        firstCall.querySelector('.rise-call-ink')!.getBoundingClientRect().top -
        firstCall.getBoundingClientRect().top
      const entryLength = firstEntry.end - firstEntry.start
      const approach = Math.min(
        travel + inkOffset,
        (travel + inkOffset * (1 - entryStart)) / (1 - entryStart + travel / entryLength),
      )
      const onset = firstEntry.start + approach
      const dropEntries = entries.filter(
        ({ animation }) =>
          animation.effect instanceof KeyframeEffect &&
          animation.effect.target instanceof Element &&
          animation.effect.target.classList.contains('verse-drop-word'),
      )
      const lastCall = verse.querySelector('.rise-call:last-child')
      const settledCall = entries.find(
        ({ animation }) =>
          animation.effect instanceof KeyframeEffect && animation.effect.target === lastCall,
      )
      if (dropEntries.length && settledCall) {
        // Start assembling as soon as the final call settles. Shift every word
        // equally so the selected assembly duration and stagger stay intact.
        const advance = Math.max(
          0,
          Math.min(...dropEntries.map(({ start }) => start)) - settledCall.end,
        )
        for (const entry of dropEntries) {
          entry.start -= advance
          entry.end -= advance
        }
      }
      const complete = dropEntries.length
        ? Math.max(...dropEntries.map(({ end }) => end))
        : scrollY + verse.getBoundingClientRect().bottom
      const assembly = dropEntries.length
        ? Math.min(...dropEntries.map(({ start }) => start))
        : complete
      const pace = createClosingPace(onset, complete, viewport, stretch, assembly)
      const { map, extra } = pace
      const dropStart = dropEntries.length
        ? map(Math.min(...dropEntries.map(({ start }) => start)))
        : undefined
      const dropOrigin = dropStart === undefined ? 0 : pace.travelAt(dropStart)
      const dropHold = dropStart === undefined ? 0 : pace.travelAt(pace.complete) - dropOrigin
      const lift =
        finale && stage && copy && dropStart !== undefined
          ? Math.max(
              0,
              scrollY +
                finale.getBoundingClientRect().top +
                copy.getBoundingClientRect().top -
                stage.getBoundingClientRect().top +
                copy.getBoundingClientRect().height / 2 -
                dropOrigin -
                viewport / 2,
            )
          : 0
      track.style.paddingBottom = `${extra - lift}px`
      track.style.setProperty('--drop-hold-space', `${dropHold}px`)
      track.dataset.paced = ''
      provideClosingPace(host, pace)
      const distance = document.documentElement.scrollHeight - innerHeight
      const offset = (position: number) => Math.max(0, Math.min(1, position / distance))
      const timeline = new ScrollTimeline({ source: document.scrollingElement, axis: 'block' })
      const options = { timeline, duration: 'auto' as const, fill: 'both' as const }
      motions.push(
        verse.animate(
          [
            { transform: 'translateY(0px)', offset: 0 },
            ...pace.motionPoints.map(({ scroll, scene }) => ({
              transform: `translateY(${scroll - scene}px)`,
              offset: offset(scroll),
            })),
            { transform: `translateY(${extra}px)`, offset: 1 },
          ],
          options,
        ),
      )
      if (stage && settledCall && lift > 0) {
        // Lift the calls while the last one arrives, leaving the assembly's
        // centre clear by the moment its first word starts moving.
        const previousCall = [...verse.querySelectorAll('.rise-call')].at(-2)
        const previousEntry = entries.find(
          ({ animation }) =>
            animation.effect instanceof KeyframeEffect && animation.effect.target === previousCall,
        )
        const from = map(previousEntry?.end ?? settledCall.start)
        const to = map(settledCall.end)
        motions.push(
          verse.animate(
            [
              { translate: '0px 0px', offset: 0 },
              { translate: '0px 0px', offset: offset(from), easing: 'ease-in-out' },
              { translate: `0px ${-lift}px`, offset: offset(to) },
              { translate: `0px ${-lift}px`, offset: 1 },
            ],
            options,
          ),
        )
      }
      if (drop && dropStart !== undefined) {
        // Only the centred assembly stays still; the calls follow the ground.
        motions.push(
          drop.animate(
            [
              { transform: 'translateY(0px)', offset: 0 },
              { transform: 'translateY(0px)', offset: offset(dropStart) },
              ...pace.motionPoints
                .filter(({ scroll }) => scroll > dropStart && scroll < pace.complete)
                .map(({ scroll, scene }) => ({
                  transform: `translateY(${scene - dropOrigin}px)`,
                  offset: offset(scroll),
                })),
              { transform: `translateY(${dropHold}px)`, offset: offset(pace.complete) },
              { transform: `translateY(${dropHold}px)`, offset: 1 },
            ],
            options,
          ),
        )
      }
      for (const { animation, start, end } of entries) {
        bindings.push({
          animation,
          timeline: animation.timeline,
          rangeStart: animation.rangeStart,
          rangeEnd: animation.rangeEnd,
          easing: animation.effect!.getTiming().easing ?? 'linear',
        })
        animation.timeline = timeline
        animation.rangeStart = `${offset(map(start)) * 100}%`
        animation.rangeEnd = `${offset(map(end)) * 100}%`
        const knots = pace.points.filter(({ scene }) => scene > start && scene < end)
        if (knots.length) {
          const stops = knots.map(
            ({ scene, scroll }) =>
              `${(scene - start) / (end - start)} ${((scroll - map(start)) / (map(end) - map(start))) * 100}%`,
          )
          animation.effect!.updateTiming({ easing: `linear(0, ${stops.join(', ')}, 1)` })
        }
      }
    },
  }
}
