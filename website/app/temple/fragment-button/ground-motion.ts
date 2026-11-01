import { paintGroundPieces, type GroundBand } from './ground-pieces.ts'

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
  let animations: Animation[] = []
  function clear() {
    for (const animation of animations) animation.cancel()
    animations = []
  }
  function resize() {
    clear()
    const height = host.querySelector<HTMLElement>('.temple-stage')!.clientHeight
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
    const depths = [-0.12, -0.26, -0.42]
    field.style.setProperty('--ground-parallax-pad', `${Math.ceil(distance * 0.42)}px`)
    const holds = refrains.map(({ refrain, refrainStage }) => {
      const section = refrain.getBoundingClientRect()
      const top = parseFloat(getComputedStyle(refrainStage).top)
      return {
        start: scrollY + section.top - top,
        top,
        height: refrainStage.offsetHeight,
        length: Math.max(0, section.height - refrainStage.offsetHeight),
      }
    })
    // Reserve the middle of each chorus hold, letting the sculpture reach
    // into its arrival and departure. Reserve the chorus itself, not an entire
    // empty viewport that would also strip pieces from neighbouring verse lines.
    // Leave real empty space there, including room for the gentle ambient drift.
    // No opacity, masks, sideways exits or scroll-time layout writes are needed.
    const bands = depths.map((depth) => {
      const available: GroundBand[] = []
      // Keep the bridge introduction textured; stop before the body’s first visible
      // edge, accounting for parallax and float, rather than hiding placed pieces.
      const end = Math.min(
        host.clientHeight - distance * depth,
        bridgeStart === undefined
          ? Infinity
          : (1 - depth) * bridgeStart + depth * innerHeight - origin - 64,
      )
      // Keep the initial viewport empty; forms emerge below it as the opener
      // leaves. These planes travel slightly faster than the foreground, giving
      // even the short first verse room for large forms and a clear chorus reading area.
      // Match the largest float excursion, removing extra entry dead space.
      let cursor = height + 40
      for (const hold of holds) {
        if (!Number.isFinite(hold.start) || hold.length === 0) continue
        const start = Math.max(
          0,
          (1 - depth) * (hold.start + hold.length * 0.35) + hold.top - origin - 64,
        )
        if (Math.min(end, start) > cursor)
          available.push({ start: cursor, end: Math.min(end, start) })
        cursor = Math.max(
          cursor,
          (1 - depth) * (hold.start + hold.length * 0.65) + hold.top + hold.height - origin + 64,
        )
      }
      if (cursor < end) available.push({ start: cursor, end })
      return available
    })
    field.hidden = reduced.matches
    paintGroundPieces(host, planes, bands)
    if (reduced.matches) return
    for (const [i, plane] of planes.entries()) {
      animations.push(
        plane.animate([{ translate: '0px 0px' }, { translate: `0px ${distance * depths[i]}px` }], {
          timeline: scroll,
          duration: 'auto',
          fill: 'both',
        }),
      )
    }
  }
  reduced.addEventListener('change', resize, { signal })
  signal.addEventListener('abort', clear, { once: true })
  return { resize }
}
