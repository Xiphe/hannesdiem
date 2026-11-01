import { fragmentStroke, groundMaterial } from './material.ts'
import { randomFrom } from './fragment-generator.ts'

export type GroundBand = { start: number; end: number }

/** Seeded overlapping assemblies, placed around real gaps rather than tiled. */
export function paintGroundPieces(
  host: HTMLElement,
  planes: readonly HTMLElement[],
  bands: readonly (readonly GroundBand[])[],
) {
  const material = groundMaterial(host)
  if (!material) return
  // The desktop-sized forms otherwise merge into a solid surface on a phone.
  const compact = Math.min(1, host.clientWidth / 1200)
  const ns = 'http://www.w3.org/2000/svg'
  const probe = document.createElementNS(ns, 'svg')
  probe.style.position = 'absolute'
  probe.style.visibility = 'hidden'
  const path = document.createElementNS(ns, 'path')
  const measurement = document.createElementNS(ns, 'g')
  measurement.appendChild(path)
  probe.appendChild(measurement)
  host.appendChild(probe)
  for (const plane of planes) plane.replaceChildren()
  for (const [layer, spaces] of bands.entries()) {
    for (const [band, space] of spaces.entries()) {
      const available = space.end - space.start
      if (available < 160) continue
      // A fuller assembly, retaining the large scale and irregular overlaps.
      const count = Math.max(
        compact < 0.6 ? 1 : 2,
        Math.round((host.clientWidth * available * 3.2 * compact) / (1920 * 1600)),
      )
      for (let slot = 0; slot < count; slot++) {
        const random = randomFrom(`${material.seed}/sculpture/${layer}/${band}/${slot}`)
        const index = (band * 3 + layer + slot * 5) % material.pieces.length
        const piece = material.pieces[index]
        const angle = random() * 360
        path.setAttribute('d', piece.d!)
        path.setAttribute('transform', `rotate(${angle})`)
        // Measure the rotated silhouette itself. Rotating its rectangular
        // bounding box leaves empty triangular corners that widen the gap.
        const bounds = measurement.getBBox()
        const left = bounds.x - 2
        const top = bounds.y - 2
        const width = bounds.width + 4
        const h = bounds.height + 4
        // Uniformly fit the intact shape into its space; never cut an outline
        // or compress it vertically to manufacture a hole for a chorus.
        const scale = Math.min(
          (piece.size * 24 * compact) / 28,
          available / h,
          compact < 1 ? (host.clientWidth * 1.5) / width : Infinity,
        )
        const tone = Math.round(7 + random() * 8)
        const x = host.clientWidth * (0.1 + random() * 0.8) - (width * scale) / 2
        const slack = available - h * scale
        // Hold the assembly's ends against the intended gap. Random placement
        // alone can leave another large empty interval beside the last verse.
        const offset =
          count === 1
            ? (slack * layer) / 2
            : slot === 0
              ? 0
              : slot === count - 1
                ? slack
                : random() * slack
        const y = space.start + offset
        const svg = document.createElementNS(ns, 'svg')
        svg.classList.add('fragment-ground-piece')
        svg.dataset.groundIndex = String(index)
        svg.setAttribute('viewBox', `${left} ${top} ${width} ${h}`)
        svg.setAttribute('width', String(width * scale))
        svg.setAttribute('height', String(h * scale))
        svg.style.left = `${64 + x}px`
        svg.style.top = `${64 + y}px`
        const id = `ground-shade-${crypto.randomUUID()}`
        const colour = (shift: number) =>
          `light-dark(rgb(${247 - tone + shift} ${236 - tone + shift} ${223 - tone + shift}), rgb(${tone + shift} ${tone + 1 + shift} ${tone + shift}))`
        svg.innerHTML = `<defs><linearGradient id="${id}" x1="0%" y1="0%" x2="100%" y2="100%"><stop style="stop-color:${colour(2)}"/><stop offset="1" style="stop-color:${colour(-2)}"/></linearGradient></defs><g transform="rotate(${angle})"><path d="${material.pieces[index].d}" fill="url(#${id})" stroke="url(#${id})" stroke-width="${fragmentStroke}" stroke-linejoin="round" stroke-linecap="round"/></g>`
        planes[layer].appendChild(svg)
      }
    }
  }
  probe.remove()
}
