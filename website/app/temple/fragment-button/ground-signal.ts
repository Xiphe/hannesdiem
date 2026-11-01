import { randomFrom, type Piece } from './fragment-generator.ts'
import { fragmentStroke } from './material.ts'

/** One occasional edge signal. Native SVG animation follows its drifting plane. */
export function mountGroundSignal(
  host: HTMLElement,
  pieces: readonly Piece[],
  paths: readonly SVGPathElement[],
  seed: string,
  signal: AbortSignal,
) {
  const random = randomFrom(seed + '/signals')
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const geometry = paths.map((path) => {
    const length = path.getTotalLength()
    return {
      box: path.getBBox(),
      samples: Array.from({ length: 40 }, (_, i) => path.getPointAtLength((i * length) / 40)),
    }
  })
  let timer: ReturnType<typeof setTimeout> | undefined
  let active: SVGGElement | undefined
  function clear() {
    clearTimeout(timer)
    active?.remove()
    active = undefined
  }
  function schedule(delay: number) {
    if (!signal.aborted && !document.hidden && !reduced.matches) timer = setTimeout(start, delay)
  }
  function choose() {
    const candidates = []
    for (const piece of host.querySelectorAll<SVGSVGElement>('.fragment-ground-piece')) {
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
          layer: Number((piece.parentElement as HTMLElement).dataset.layer),
          score: visible + random() * 8,
        })
    }
    const topLayer = Math.max(...candidates.map(({ layer }) => layer))
    return candidates.filter(({ layer }) => layer === topLayer).sort((a, b) => b.score - a.score)[0]
  }
  function start() {
    if (signal.aborted || document.hidden || reduced.matches) return
    if (host.dataset.state !== 'ready') return schedule(2000)
    const selected = choose()
    if (!selected) return schedule(2000)
    const { piece, index } = selected
    const { box } = geometry[index]
    const travel = 1.25 + random() * 0.5
    const life = travel + 1.5
    const ns = 'http://www.w3.org/2000/svg'
    const svg = document.createElementNS(ns, 'g')
    svg.classList.add('fragment-ground-signal')
    svg.setAttribute('aria-hidden', 'true')
    svg.style.setProperty('--signal-travel', `${travel}s`)
    svg.style.setProperty('--signal-life', `${life}s`)
    const group = document.createElementNS(ns, 'g')
    const id = `edge-mask-${crypto.randomUUID()}`
    const d = pieces[index].d!
    // Mask the opaque body, including its rounded stroke: only a narrow outer
    // rim remains. The moving dash is bounded to one actual piece, never a page.
    group.innerHTML = `<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="${box.x - 4}" y="${box.y - 4}" width="${box.width + 8}" height="${box.height + 8}"><rect x="${box.x - 4}" y="${box.y - 4}" width="${box.width + 8}" height="${box.height + 8}" fill="white"/><path d="${d}" fill="black" stroke="black" stroke-width="${fragmentStroke}" stroke-linejoin="round"/></mask></defs><g mask="url(#${id})"><path class="fragment-signal-trail" d="${d}" pathLength="1"/><path class="fragment-signal-tip" d="${d}" pathLength="1"/></g>`
    svg.appendChild(group)
    piece.querySelector(':scope > g')!.appendChild(svg)
    active = svg
    timer = setTimeout(() => {
      svg.remove()
      active = undefined
      schedule(1200 + random() * 1800)
    }, life * 1000)
  }
  function reset() {
    clear()
    schedule(1200)
  }
  reduced.addEventListener('change', reset, { signal })
  document.addEventListener('visibilitychange', reset, { signal })
  signal.addEventListener('abort', clear, { once: true })
  reset()
}
