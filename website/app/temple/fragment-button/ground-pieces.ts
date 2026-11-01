import { fragmentStroke, groundMaterial, patternSize, placeGroundPieces } from './material.ts'

/** Real, individually movable copies of the same six seeded texture placements. */
export function paintGroundPieces(host: HTMLElement, planes: readonly HTMLElement[]) {
  const material = groundMaterial(host)
  if (!material) return
  const ns = 'http://www.w3.org/2000/svg'
  const probe = document.createElementNS(ns, 'svg')
  probe.style.position = 'absolute'
  probe.style.visibility = 'hidden'
  const path = document.createElementNS(ns, 'path')
  probe.appendChild(path)
  host.appendChild(probe)
  const boxes = material.pieces.map((piece) => {
    path.setAttribute('d', piece.d!)
    const box = path.getBBox()
    return { x: box.x - 2, y: box.y - 2, width: box.width + 4, height: box.height + 4 }
  })
  probe.remove()
  for (const plane of planes) plane.replaceChildren()
  const height = planes[0].offsetHeight
  for (const placement of placeGroundPieces(material.pieces, material.seed)) {
    const { index, size, angle, tone, layer } = placement
    const box = boxes[index]
    const scale = size / 28
    const radians = (angle * Math.PI) / 180
    const corners = [
      [box.x, box.y],
      [box.x + box.width, box.y],
      [box.x, box.y + box.height],
      [box.x + box.width, box.y + box.height],
    ].map(([x, y]) => ({
      x: x * Math.cos(radians) - y * Math.sin(radians),
      y: x * Math.sin(radians) + y * Math.cos(radians),
    }))
    const left = Math.min(...corners.map((p) => p.x))
    const top = Math.min(...corners.map((p) => p.y))
    const width = Math.max(...corners.map((p) => p.x)) - left
    const h = Math.max(...corners.map((p) => p.y)) - top
    // Include overlapping edge copies, but never cut a piece along a screen half.
    for (
      let column = Math.floor((-placement.x - (left + width) * scale) / patternSize.width);
      column <= Math.ceil((host.clientWidth - placement.x - left * scale) / patternSize.width);
      column++
    ) {
      const x = placement.x + column * patternSize.width
      if (x + (left + width) * scale < -48 || x + left * scale > host.clientWidth + 48) continue
      for (
        let row = Math.floor((-placement.y - (top + h) * scale) / patternSize.height);
        row <= Math.ceil((height - placement.y - top * scale) / patternSize.height);
        row++
      ) {
        const y = placement.y + row * patternSize.height
        if (y + (top + h) * scale < 0 || y + top * scale > height) continue
        const svg = document.createElementNS(ns, 'svg')
        svg.classList.add('fragment-ground-piece')
        svg.dataset.groundIndex = String(index)
        svg.dataset.groundCentre = String(x + (left + width / 2) * scale)
        svg.dataset.groundWidth = String(width * scale)
        svg.setAttribute('viewBox', `${left} ${top} ${width} ${h}`)
        svg.setAttribute('width', String(width * scale))
        svg.setAttribute('height', String(h * scale))
        svg.style.left = `${64 + x + left * scale}px`
        svg.style.top = `${64 + y + top * scale}px`
        const id = `ground-shade-${crypto.randomUUID()}`
        const colour = (shift: number) =>
          `light-dark(rgb(${247 - tone + shift} ${236 - tone + shift} ${223 - tone + shift}), rgb(${tone + shift} ${tone + 1 + shift} ${tone + shift}))`
        svg.innerHTML = `<defs><linearGradient id="${id}" x1="0%" y1="0%" x2="100%" y2="100%"><stop style="stop-color:${colour(2)}"/><stop offset="1" style="stop-color:${colour(-2)}"/></linearGradient></defs><g transform="rotate(${angle})"><path d="${material.pieces[index].d}" fill="url(#${id})" stroke="url(#${id})" stroke-width="${fragmentStroke}" stroke-linejoin="round" stroke-linecap="round"/></g>`
        planes[layer].appendChild(svg)
      }
    }
  }
}
