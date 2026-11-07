import { paintGroundPieces, type GroundBand } from './ground-pieces.ts'
import { createGroundViewport } from './ground-viewport.ts'
import { closingPace } from '../closing-pace.ts'

type Refrain = { refrain: HTMLElement; refrainStage: HTMLElement }

/** Static sculpture coordinates, with native vertical scroll parallax only. */
export function createGroundMotion(
  host: HTMLElement,
  field: HTMLElement,
  refrains: readonly Refrain[],
  signal: AbortSignal,
) {
  if (typeof ScrollTimeline === 'undefined') {
    field.hidden = true
    return { resize() {} }
  }
  const planes = [...field.querySelectorAll<HTMLElement>('.fragment-ground-plane')]
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const scroll = new ScrollTimeline({ source: document.scrollingElement, axis: 'block' })
  const viewport = createGroundViewport(host, field, planes, scroll, signal)
  function resize() {
    const pace = closingPace(host)
    const clock = (scroll: number) => pace?.groundAt(scroll) ?? scroll
    const opener = host.querySelector<HTMLElement>('.temple-stage')
    const distance = Math.max(1, document.documentElement.scrollHeight - innerHeight)
    const origin = scrollY + host.getBoundingClientRect().top
    const bridge = host.querySelector<HTMLElement>('.bridge-body')
    const firstReading = bridge?.querySelector<HTMLElement>(
      '.bridge-page-stage > .bridge-body-copy',
    )
    // The body's first page has empty space above its centred reading area.
    // Its child offset stays stable while the sticky stage itself moves.
    const bridgeStart = bridge
      ? scrollY + bridge.getBoundingClientRect().top + (firstReading?.offsetTop ?? 0)
      : undefined
    const finalVerse = host.querySelector<HTMLElement>('.final-verse')
    const finalStart = finalVerse ? scrollY + finalVerse.getBoundingClientRect().top : undefined
    const depths = [-0.12, -0.26, -0.42]
    const holds = refrains.map(({ refrain, refrainStage }) => {
      const section = refrain.getBoundingClientRect()
      const top = parseFloat(getComputedStyle(refrainStage).top)
      return {
        start: scrollY + section.top - top,
        top,
        height: refrainStage.offsetHeight,
        length: Math.max(0, section.height - refrainStage.offsetHeight),
        final: refrain.parentElement!.classList.contains('final-refrain'),
      }
    })
    // Reserve the middle of each chorus hold, letting the sculpture reach
    // into its arrival and departure. Reserve the chorus itself, not an entire
    // empty viewport that would also strip pieces from neighbouring verse lines.
    // Leave real empty space there, including room for the gentle ambient drift.
    // No opacity, masks, sideways exits or scroll-time layout writes are needed.
    const bands = depths.map((depth) => {
      const available: GroundBand[] = []
      const end = host.clientHeight - distance * depth
      // When present, keep the opener's viewport empty; forms emerge below it
      // as it leaves. These planes travel slightly faster than the foreground, giving
      // even the short first verse room for large forms and a clear chorus reading area.
      // Match the largest float excursion, removing extra entry dead space.
      let cursor = opener ? opener.clientHeight + 40 : 0
      for (const hold of holds) {
        if (!Number.isFinite(hold.start) || hold.length === 0) continue
        const start = Math.max(
          0,
          (1 - depth) * clock(hold.start + hold.length * 0.35) + hold.top - origin - 64,
        )
        if (Math.min(end, start) > cursor)
          available.push({ start: cursor, end: Math.min(end, start) })
        // The ending stays held. Its empty ground continues to the document
        // end rather than resuming underneath the final phrase.
        cursor = hold.final
          ? Infinity
          : Math.max(
              cursor,
              (1 - depth) * clock(hold.start + hold.length * 0.65) +
                hold.top +
                hold.height -
                origin +
                64,
            )
      }
      if (cursor < end) available.push({ start: cursor, end })
      if (bridgeStart === undefined) return available
      // Reserve the bridge body, not everything after it. Resume inside the
      // final verse, with clearance for each plane's parallax and ambient float.
      const bridgeGap = {
        start: (1 - depth) * clock(bridgeStart) + depth * innerHeight - origin - 64,
        end: finalStart === undefined ? Infinity : (1 - depth) * clock(finalStart) - origin + 64,
      }
      return available.flatMap((band) => {
        if (band.end <= bridgeGap.start || band.start >= bridgeGap.end) return [band]
        const parts: GroundBand[] = []
        if (band.start < bridgeGap.start) parts.push({ start: band.start, end: bridgeGap.start })
        if (band.end > bridgeGap.end) parts.push({ start: bridgeGap.end, end: band.end })
        return parts
      })
    })
    field.hidden = reduced.matches
    // Build the unchanged composition in detached containers. Attaching its
    // full document extent, even briefly, can create enormous Safari surfaces.
    const staging = planes.map(() => document.createElement('div'))
    if (!reduced.matches) paintGroundPieces(host, staging, bands)
    viewport.layout(staging, distance, depths, pace)
  }
  reduced.addEventListener('change', resize, { signal })
  return { resize }
}
