import {
  fragmentStroke,
  generateFragments,
  randomFrom,
} from '../../../../../contracts/temple/fragments.ts'

export type Tile = {
  d: string
  path: Path2D
  trim?: Path2D
  x: number
  y: number
  scale: number
  angle: number
  center: { x: number; y: number }
  drift: { x: number; y: number }
}

// Keep the background contours inside the face; cut perimeter pieces to the
// accepted button silhouette. The cut belongs to each piece and moves with it.
// This cover is local study composition; it does not alter the shared primitive.
export function assembleTiles(width: number, height: number): Tile[] {
  const random = randomFrom('temple/button/small-tiles')
  const live = [...document.querySelectorAll('.fragment-ground-piece path')]
    .map((path) => path.getAttribute('d')!)
    .filter(Boolean)
  const outlines = [
    ...new Set(
      live.length ? live : generateFragments('temple-button-tiles', 20).map((piece) => piece.d!),
    ),
  ]
  const shapes = outlines.map((d) => {
    const contour = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    contour.setAttribute('d', d)
    const length = contour.getTotalLength()
    let top = 0
    for (let i = 0; i < 96; i++) top = Math.min(top, contour.getPointAtLength((length * i) / 96).y)
    return { d, path: new Path2D(d), center: { x: 0, y: top / 2 } }
  })
  const probe = document.createElement('canvas')
  probe.width = Math.ceil(width)
  probe.height = Math.ceil(height)
  const ctx = probe.getContext('2d', { willReadFrequently: true })!
  ctx.beginPath()
  ctx.roundRect(0, 0, width, height, 8)
  ctx.fill()
  const silhouette = ctx.getImageData(0, 0, probe.width, probe.height).data
  const remaining = new Uint8Array(probe.width * probe.height)
  for (let i = 0; i < remaining.length; i++) remaining[i] = silhouette[i * 4 + 3] > 250 ? 1 : 0
  let left = remaining.reduce((sum, v) => sum + v, 0)
  type Candidate = { tile: Tile; pixels: number[]; used: boolean }
  const candidates: Candidate[] = []
  const step = Math.max(12, height * 0.4)
  for (let y = -step / 2; y < height + step; y += step)
    for (let x = -step / 2; x < width + step; x += step)
      for (let turn = 0; turn < 5; turn++) {
        const shape = shapes[Math.floor(random() * shapes.length)]
        const tile: Tile = {
          ...shape,
          x: x + (random() - 0.5) * step * 0.3,
          y: y + (random() - 0.5) * step * 0.3,
          scale: (height * (1.35 + random() * 0.55)) / 28,
          angle: ((turn * 36 + random() * 22) * Math.PI) / 180,
          drift: {
            x: Math.max(-1, Math.min(1, (x - width / 2) / (width / 2))) * 2.6,
            y: Math.max(-1, Math.min(1, (y - height / 2) / (height / 2))) * 2.2,
          },
        }
        ctx.clearRect(0, 0, probe.width, probe.height)
        paintTile(ctx, tile, 0, 0, '#373532')
        const data = ctx.getImageData(0, 0, probe.width, probe.height).data
        const pixels: number[] = []
        for (let i = 0; i < remaining.length; i++)
          if (silhouette[i * 4 + 3] > 250 && data[i * 4 + 3] > 250) pixels.push(i)
        if (pixels.length) candidates.push({ tile, pixels, used: false })
      }
  const tiles: Tile[] = []
  while (left > 0) {
    let best: Candidate | undefined,
      score = -Infinity
    for (const candidate of candidates) {
      if (candidate.used) continue
      let fresh = 0
      for (const pixel of candidate.pixels) fresh += remaining[pixel]
      if (!fresh) continue
      const value = fresh - (candidate.pixels.length - fresh) * 0.12
      if (value > score) {
        best = candidate
        score = value
      }
    }
    if (!best) break
    best.used = true
    tiles.push(best.tile)
    for (const pixel of best.pixels) {
      left -= remaining[pixel]
      remaining[pixel] = 0
    }
  }
  probe.width = probe.height = 0
  const boundary = new Path2D()
  boundary.roundRect(0, 0, width, height, 8)
  for (const tile of tiles) {
    // Intersection in the tile's original coordinates. Later translations,
    // rotation and uniform release carry this cut along with its fragment.
    const placement = new DOMMatrix()
      .translate(tile.x, tile.y)
      .rotate((tile.angle * 180) / Math.PI)
      .scale(tile.scale)
      .translate(-tile.center.x, -tile.center.y)
    tile.trim = new Path2D()
    tile.trim.addPath(boundary, placement.inverse())
  }
  return tiles
}

export function paintTile(
  ctx: CanvasRenderingContext2D,
  tile: Tile,
  progress: number,
  gap: number,
  fill: string,
) {
  ctx.save()
  ctx.translate(tile.x + tile.drift.x * gap * progress, tile.y + tile.drift.y * gap * progress)
  ctx.rotate(tile.angle)
  // Per-piece cuts travel with the fragments, with no fixed outer stencil.
  const scale = tile.scale * (1 - progress * 0.07)
  ctx.scale(scale, scale)
  ctx.translate(-tile.center.x, -tile.center.y)
  if (tile.trim) ctx.clip(tile.trim)
  ctx.fillStyle = ctx.strokeStyle = fill
  ctx.lineWidth = fragmentStroke
  ctx.lineJoin = ctx.lineCap = 'round'
  ctx.fill(tile.path)
  ctx.stroke(tile.path)
  ctx.restore()
}
