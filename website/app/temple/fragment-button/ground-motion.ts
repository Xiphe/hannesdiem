import { paintGroundPieces } from './ground-pieces.ts'

type Refrain = { refrain: HTMLElement; refrainStage: HTMLElement }

/** One uninterrupted native scroll journey between successive clear choruses. */
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
    const depths = [0.12, 0.26, 0.42]
    field.style.setProperty(
      '--ground-parallax-pad',
      `${Math.ceil(distance * Math.max(...depths))}px`,
    )
    field.hidden = reduced.matches
    paintGroundPieces(host, planes)
    if (reduced.matches) return
    const opening = host.querySelector<HTMLElement>('.temple-opening')!
    const begin = scrollY + opening.getBoundingClientRect().top + height * 0.3
    const stops: { y: number; progress: number; easing?: string }[] = [
      { y: 0, progress: -1 },
      { y: begin, progress: -1 },
    ]
    for (const { refrain, refrainStage } of refrains) {
      const section = refrain.getBoundingClientRect()
      const top = parseFloat(getComputedStyle(refrainStage).top)
      const hold = Math.max(0, section.height - refrainStage.offsetHeight)
      if (!Number.isFinite(top) || hold === 0) continue
      const start = scrollY + section.top - top
      // The journey reaches into this chorus's measured sticky hold. Derive
      // the endpoint from its real position/length, not a fixed verse duration.
      const exitAt = start + hold * 0.4
      const release = start + hold
      // Only the remainder of the hold can pause/reset, entirely offscreen.
      stops.push(
        { y: exitAt, progress: 1, easing: 'steps(1, end)' },
        { y: (exitAt + release) / 2, progress: -1 },
        { y: release, progress: -1 },
      )
    }
    if (stops.at(-1)!.y < distance) stops.push({ y: distance, progress: 1 })
    for (const [i, plane] of planes.entries()) {
      animations.push(
        plane.animate([{ translate: `0px ${-distance * depths[i]}px` }, { translate: '0px 0px' }], {
          timeline: scroll,
          duration: 'auto',
          fill: 'both',
        }),
      )
      for (const piece of plane.querySelectorAll<SVGSVGElement>('.fragment-ground-piece')) {
        const centre = Number(piece.dataset.groundCentre)
        const halfWidth = Number(piece.dataset.groundWidth) / 2
        const left = -(centre + halfWidth + 64)
        const right = innerWidth - centre + halfWidth + 64
        const exitLeft = centre < innerWidth / 2
        const entry = exitLeft ? right : left
        const exit = exitLeft ? left : right
        piece.dataset.exitSide = exit < 0 ? 'left' : 'right'
        // Use the actual edge-clearance distances: overshooting the exit
        // would make the shape disappear before the scene-linked endpoint.
        animations.push(
          piece.animate(
            stops.map(({ y, progress, easing }) => ({
              offset: Math.max(0, Math.min(1, y / distance)),
              translate: `${progress < 0 ? entry : exit}px 0px`,
              easing: easing ?? 'linear',
            })),
            { timeline: scroll, duration: 'auto', fill: 'both' },
          ),
        )
      }
    }
  }
  reduced.addEventListener('change', resize, { signal })
  signal.addEventListener('abort', clear, { once: true })
  return { resize }
}
