import { randomFrom, type Piece } from '../../../../contracts/temple/fragments.ts'
import { traceOutline } from './trace-outline.ts'

/** Occasional outline traces. Native SVG animation follows each drifting piece. */
export function mountGroundSignal(
  host: HTMLElement,
  pieces: readonly Pick<Piece, 'd'>[],
  paths: readonly SVGPathElement[],
  seed: string,
  signal: AbortSignal,
) {
  const random = randomFrom(seed + '/signals')
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const geometry = paths.map((path, index) => {
    const length = path.getTotalLength()
    return {
      outline: traceOutline(pieces[index].d),
      samples: Array.from({ length: 40 }, (_, i) => path.getPointAtLength((i * length) / 40)),
    }
  })
  let timer: ReturnType<typeof setTimeout> | undefined
  const active = new Map<
    SVGGElement,
    { piece: SVGSVGElement; cleanup: ReturnType<typeof setTimeout> }
  >()
  function clear() {
    clearTimeout(timer)
    for (const [trace, { cleanup }] of active) {
      clearTimeout(cleanup)
      trace.remove()
    }
    active.clear()
  }
  function schedule(delay: number) {
    if (!signal.aborted && !document.hidden && !reduced.matches) timer = setTimeout(start, delay)
  }
  function choose() {
    const candidates = []
    const occupied = new Set([...active.values()].map(({ piece }) => piece))
    for (const piece of host.querySelectorAll<SVGSVGElement>('.fragment-ground-piece')) {
      if (occupied.has(piece)) continue
      const bounds = piece.getBoundingClientRect()
      if (
        bounds.bottom <= 24 ||
        bounds.top >= innerHeight - 24 ||
        bounds.right <= 24 ||
        bounds.left >= innerWidth - 24
      )
        continue
      const index = Number(piece.dataset.groundIndex)
      const path = piece.querySelector<SVGPathElement>(':scope > g > path')!
      const matrix = path.getScreenCTM()
      if (!matrix) continue
      const visible = geometry[index].samples.filter((point) => {
        const p = new DOMPoint(point.x, point.y).matrixTransform(matrix)
        return p.x > 24 && p.x < innerWidth - 24 && p.y > 24 && p.y < innerHeight - 24
      }).length
      if (visible >= 5)
        candidates.push({
          piece,
          index,
          scale: Math.hypot(matrix.a, matrix.b),
          layer: Number((piece.parentElement as HTMLElement).dataset.layer),
          score: visible + random() * 8,
        })
    }
    const topLayer = Math.max(...candidates.map(({ layer }) => layer))
    return candidates.filter(({ layer }) => layer === topLayer).sort((a, b) => b.score - a.score)[0]
  }
  function start() {
    if (signal.aborted || document.hidden || reduced.matches) return
    if (host.dataset.state !== 'ready') return schedule(300)
    for (const [trace, { piece, cleanup }] of active) {
      if (piece.isConnected) continue
      clearTimeout(cleanup)
      trace.remove()
      active.delete(trace)
    }
    if (active.size >= 6) return schedule(300)
    if (random() < 0.75) return schedule(250 + random() * 300)
    const selected = choose()
    if (!selected) return schedule(300)
    const { piece, index, scale } = selected
    const travel = 1.75 + random() * 0.7
    const life = travel + 1.5
    const ns = 'http://www.w3.org/2000/svg'
    const svg = document.createElementNS(ns, 'g')
    svg.classList.add('fragment-ground-signal')
    svg.dataset.direction = random() < 0.5 ? 'forward' : 'reverse'
    svg.setAttribute('aria-hidden', 'true')
    svg.style.setProperty('--signal-travel', `${travel}s`)
    // Keep dash lengths and pathLength in the same SVG coordinate system.
    // non-scaling-stroke repeated the normalized dash pattern at large scales.
    svg.style.setProperty('--signal-stroke-width', String(3 / scale))
    const d = geometry[index].outline
    // The route includes the visible rounded corners, so the light travels
    // around each arc instead of lighting a whole thick stroke join at once.
    svg.innerHTML = `<path class="fragment-signal-trail" d="${d}" pathLength="1"/><path class="fragment-signal-tip" d="${d}" pathLength="1"/>`
    const body = piece.querySelector(':scope > g')!
    // The opaque tile trims the inner half and any buried concave offsets.
    body.insertBefore(svg, body.querySelector(':scope > path'))
    const cleanup = setTimeout(() => {
      svg.remove()
      active.delete(svg)
    }, life * 1000)
    active.set(svg, { piece, cleanup })
    schedule(250 + random() * 300)
  }
  function reset() {
    clear()
    schedule(100)
  }
  reduced.addEventListener('change', reset, { signal })
  document.addEventListener('visibilitychange', reset, { signal })
  signal.addEventListener('abort', clear, { once: true })
  reset()
}
