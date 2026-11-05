import type { CircleFluid } from './circle-fluid.ts'

/** Native round fallback before enhancement and for reduced motion. */
export const circleRestSurface = 'M126 180a54 54 0 1 0 108 0a54 54 0 1 0-108 0Z'

// Density isocontours reconstructed from the simulated particles. Display-only:
// neither this contour nor the centre cover moves or constrains any particle.
export class DensitySurface {
  size: number
  cell: number
  field: Float32Array
  horizontal: number
  px: Float32Array
  py: Float32Array
  linkA: Int32Array
  linkB: Int32Array
  seen: Uint32Array
  walked: Uint32Array
  ids: number[]
  epoch: number
  loops: [number, number][][]
  vertices: number

  constructor(size = 241, width = 360) {
    this.size = size
    this.cell = width / (size - 1)
    this.field = new Float32Array(size * size)
    this.horizontal = size * (size - 1)
    const edges = this.horizontal * 2
    this.px = new Float32Array(edges)
    this.py = new Float32Array(edges)
    this.linkA = new Int32Array(edges)
    this.linkB = new Int32Array(edges)
    this.seen = new Uint32Array(edges)
    this.walked = new Uint32Array(edges)
    this.ids = []
    this.epoch = 0
    this.loops = []
    this.vertices = 0
  }

  update(fluid: Pick<CircleFluid, 'n' | 'x' | 'y'>) {
    const { field, size, cell } = this
    const scale = 1 / cell
    const radius = 7 * scale,
      r2 = radius * radius
    let minX = size - 1,
      minY = size - 1,
      maxX = 0,
      maxY = 0
    field.fill(0)
    for (let i = 0; i < fluid.n; i++) {
      const px = fluid.x[i] * scale,
        py = fluid.y[i] * scale
      const left = Math.max(0, Math.floor(px - radius))
      const right = Math.min(size - 1, Math.ceil(px + radius))
      const top = Math.max(0, Math.floor(py - radius))
      const bottom = Math.min(size - 1, Math.ceil(py + radius))
      minX = Math.min(minX, left)
      maxX = Math.max(maxX, right)
      minY = Math.min(minY, top)
      maxY = Math.max(maxY, bottom)
      for (let y = top; y <= bottom; y++) {
        for (let x = left; x <= right; x++) {
          const d = (x - px) ** 2 + (y - py) ** 2
          if (d < r2) {
            const w = 1 - d / r2
            field[y * size + x] += w * w
          }
        }
      }
    }
    return this.trace([minX, minY, maxX, maxY])
  }

  vertex(id: number) {
    if (this.seen[id] === this.epoch) return
    this.seen[id] = this.epoch
    this.ids.push(id)
    this.linkA[id] = this.linkB[id] = -1
    const { size, field, horizontal, cell } = this
    if (id < horizontal) {
      const x = id % (size - 1),
        y = (id / (size - 1)) | 0
      const i = y * size + x
      const t = (1 - field[i]) / (field[i + 1] - field[i])
      this.px[id] = (x + t) * cell
      this.py[id] = y * cell
    } else {
      const edge = id - horizontal
      const x = edge % size,
        y = (edge / size) | 0
      const i = y * size + x
      const t = (1 - field[i]) / (field[i + size] - field[i])
      this.px[id] = x * cell
      this.py[id] = (y + t) * cell
    }
  }

  connect(a: number, b: number) {
    this.vertex(a)
    this.vertex(b)
    if (this.linkA[a] === -1) this.linkA[a] = b
    else this.linkB[a] = b
    if (this.linkA[b] === -1) this.linkA[b] = a
    else this.linkB[b] = a
  }

  trace(bounds: readonly number[] = [0, 0, this.size - 1, this.size - 1]) {
    this.epoch++
    this.ids.length = 0
    this.loops = []
    this.vertices = 0
    const { size, field, horizontal } = this
    const left = Math.max(0, bounds[0] - 1),
      top = Math.max(0, bounds[1] - 1)
    const right = Math.min(size - 2, bounds[2]),
      bottom = Math.min(size - 2, bounds[3])
    for (let y = top; y <= bottom; y++) {
      for (let x = left; x <= right; x++) {
        const index = y * size + x
        const a = field[index] - 1,
          b = field[index + 1] - 1
        const c = field[index + size + 1] - 1,
          d = field[index + size] - 1
        const code = (a >= 0 ? 1 : 0) | (b >= 0 ? 2 : 0) | (c >= 0 ? 4 : 0) | (d >= 0 ? 8 : 0)
        if (code === 0 || code === 15) continue
        const t = y * (size - 1) + x,
          r = horizontal + y * size + x + 1
        const bt = t + size - 1,
          l = r - 1
        switch (code) {
          case 1:
          case 14:
            this.connect(l, t)
            break
          case 2:
          case 13:
            this.connect(t, r)
            break
          case 3:
          case 12:
            this.connect(l, r)
            break
          case 4:
          case 11:
            this.connect(r, bt)
            break
          case 6:
          case 9:
            this.connect(t, bt)
            break
          case 7:
          case 8:
            this.connect(l, bt)
            break
          case 5:
          case 10:
            // The bilinear saddle decides connectivity. The contour never
            // joins diagonally separated drops merely to keep one outline.
            if (a * c - b * d >= 0) {
              this.connect(t, r)
              this.connect(bt, l)
            } else {
              this.connect(l, t)
              this.connect(r, bt)
            }
            break
        }
      }
    }
    for (const start of this.ids) {
      if (this.walked[start] === this.epoch) continue
      const points: [number, number][] = []
      let previous = -1,
        current = start
      do {
        this.walked[current] = this.epoch
        const x = this.px[current],
          y = this.py[current]
        const last = points[points.length - 1]
        if (!last || Math.abs(x - last[0]) + Math.abs(y - last[1]) > 0.0001) points.push([x, y])
        const next = this.linkA[current] === previous ? this.linkB[current] : this.linkA[current]
        previous = current
        current = next
      } while (current !== start && current !== -1 && this.walked[current] !== this.epoch)
      if (current === start && points.length > 2) this.loops.push(points)
    }
    const pair = (x: number, y: number) =>
      `${Math.round(x * 100) / 100} ${Math.round(y * 100) / 100}`
    let path = ''
    for (const points of this.loops) {
      const last = points[points.length - 1],
        first = points[0]
      path += `M${pair((last[0] + first[0]) / 2, (last[1] + first[1]) / 2)}`
      // Short quadratic segments round the 1.5px grid corners. The control
      // polygon is the measured density contour, not a target shape.
      for (let i = 0; i < points.length; i++) {
        const p = points[i],
          next = points[(i + 1) % points.length]
        path += `Q${pair(p[0], p[1])} ${pair((p[0] + next[0]) / 2, (p[1] + next[1]) / 2)}`
      }
      path += 'Z'
      this.vertices += points.length
    }
    return path
  }
}
