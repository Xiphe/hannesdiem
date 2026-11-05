// Experimental 2D particle liquid. Clavet, Beaudoin & Poulin (2005),
// Algorithms 1, 2 and 5. Independently implemented from the published equations.
// No prescribed outline, pose interpolation, elastic links, or drawn bridges.
export type CircleTarget = { x: number; y: number; r: number }

export class CircleFluid {
  h: number
  cell: number
  cols: number
  head: Int32Array
  n: number
  x: Float64Array
  y: Float64Array
  vx: Float64Array
  vy: Float64Array
  ox: Float64Array
  oy: Float64Array
  next: Int32Array
  neighbors: Int32Array
  sigma: number
  attraction: number
  k: number
  nearK: number
  restDensity: number
  target: CircleTarget | null
  dotCapacity: number
  cursorCapacity: number
  targetDistances: Float64Array
  targetLoad: number
  targetGain: number
  steps: number
  forces: number
  drag: number
  clamps: number
  dots: CircleTarget[]

  constructor(spacing = 4) {
    this.h = 10
    this.cell = 12
    this.cols = 32
    this.head = new Int32Array(this.cols ** 2)
    const positions = []
    for (let row = -16; row <= 16; row++) {
      const y = (row * spacing * Math.sqrt(3)) / 2
      for (let col = -16; col <= 16; col++) {
        const x = (col + (row & 1) / 2) * spacing
        if (x * x + y * y < 54 ** 2) positions.push(x + 180, y + 180)
      }
    }
    this.n = positions.length / 2
    this.x = new Float64Array(this.n)
    this.y = new Float64Array(this.n)
    this.vx = new Float64Array(this.n)
    this.vy = new Float64Array(this.n)
    this.ox = new Float64Array(this.n)
    this.oy = new Float64Array(this.n)
    this.next = new Int32Array(this.n)
    this.neighbors = new Int32Array(this.n)
    for (let i = 0; i < this.n; i++) {
      this.x[i] = positions[i * 2]
      this.y[i] = positions[i * 2 + 1]
    }
    this.sigma = 61
    this.attraction = 682
    this.k = 3600
    this.nearK = 7200
    this.restDensity = 4.8
    this.target = null
    this.dotCapacity = 63
    this.cursorCapacity = 245
    this.targetDistances = new Float64Array(this.n)
    this.targetLoad = 0
    this.targetGain = 1
    this.steps = 0
    this.forces = 1
    this.drag = 8
    this.clamps = 0
    this.dots = Array.from({ length: 10 }, (_, i) => {
      const a = (i * Math.PI) / 5 - Math.PI / 2
      return { x: 180 + Math.cos(a) * 110, y: 180 + Math.sin(a) * 110, r: 13 }
    })
  }
  /** A single, slight imbalance on release; pressure and viscosity do the rest. */
  release(random: () => number = Math.random) {
    const target = this.target
    if (!target) return
    this.target = null
    const dx = target.x - 180,
      dy = target.y - 180,
      distance = Math.hypot(dx, dy) || 1
    const speed = (12 + random() * 14) * (random() < 0.5 ? -1 : 1)
    let total = 0
    for (let i = 0; i < this.n; i++) {
      const x = this.x[i] - target.x,
        y = this.y[i] - target.y
      this.targetDistances[i] = Math.exp(-(x * x + y * y) / (48 * 48))
      total += this.targetDistances[i]
    }
    const mean = total / this.n
    for (let i = 0; i < this.n; i++) {
      // The collected end moves a little sideways; the body counterbalances
      // it, adding no net linear momentum and never moving a particle by hand.
      const impulse = (this.targetDistances[i] - mean) * speed
      this.vx[i] += (-dy / distance) * impulse
      this.vy[i] += (dx / distance) * impulse
    }
  }
  grid() {
    this.head.fill(-1)
    for (let i = 0; i < this.n; i++) {
      const gx = Math.max(0, Math.min(31, (this.x[i] / this.cell) | 0))
      const gy = Math.max(0, Math.min(31, (this.y[i] / this.cell) | 0))
      const index = gy * this.cols + gx
      this.next[i] = this.head[index]
      this.head[index] = i
    }
  }
  nearby(i: number) {
    const gx = (this.x[i] / this.cell) | 0,
      gy = (this.y[i] / this.cell) | 0
    let count = 0
    for (let yy = Math.max(0, gy - 1); yy <= Math.min(31, gy + 1); yy++)
      for (let xx = Math.max(0, gx - 1); xx <= Math.min(31, gx + 1); xx++)
        for (let j = this.head[yy * this.cols + xx]; j !== -1; j = this.next[j])
          if (j !== i) this.neighbors[count++] = j
    return count
  }
  step(dt = 1 / 120) {
    const { n, x, y, vx, vy, ox, oy, h } = this
    const damping = Math.exp(-dt * this.drag)
    const target = this.target
    let load = 0
    if (target)
      for (let i = 0; i < n; i++) {
        const dx = target.x - x[i],
          dy = target.y - y[i]
        const distance = Math.sqrt(dx * dx + dy * dy)
        this.targetDistances[i] = distance
        // Smooth local collection measure for either a dot or the free cursor.
        load += Math.min(1, Math.max(0, (32 - distance) / 8))
      }
    // Free-pointer influence fades from the central pool to the outer edge.
    // Apply the same envelope to force and load budget; the physical dots
    // retain their independently selected coating amount.
    const radius = target ? Math.hypot(target.x - 180, target.y - 180) : 0
    const outward = Math.min(1, Math.max(0, (radius - 54) / (145 - 54)))
    const reach = target && !target.r ? 1 - outward * outward * (3 - 2 * outward) : 1
    const capacity = target?.r ? this.dotCapacity : this.cursorCapacity * reach
    const collecting = target && capacity > 0
    const gain = collecting ? reach / (1 + (load / capacity) ** 6) : 0
    this.targetLoad = load
    this.targetGain = gain
    for (let i = 0; i < n; i++) {
      let dx = x[i] - 180,
        dy = y[i] - 180
      // A soft central potential keeps the liquid in this zero-gravity widget.
      const anchor = 5 + 60 * Math.exp(-(dx * dx + dy * dy) / (35 * 35))
      let ax = -dx * anchor,
        ay = -dy * anchor
      const t = target
      if (collecting && t) {
        const tx = t.x - x[i],
          ty = t.y - y[i],
          d = this.targetDistances[i] || 1
        // An attractive annular field around a physical circular obstacle.
        const support = Math.exp(-(d * d) / (38 * 38))
        const wet = t.r ? Math.min(1, Math.max(0, (28 - d) / 8)) : 0
        const film = wet * wet * (3 - 2 * wet)
        // A thin adhesive layer retains already-arrived liquid. Intake from
        // farther away is regulated independently by the measured dot load.
        const shielding = (1 - gain * Math.exp(-(d * d) / (35 * 35))) * (1 - film)
        ax *= shielding
        ay *= shielding
        // Ease the external attraction as the dot fills. Excess material is
        // still simulated and can flow back; nothing is clipped or deleted.
        const pull =
          (this.attraction * (gain * (1 - film) + 4 * film) * support * (d - (t.r ? t.r + 3 : 0))) /
          d
        ax += tx * pull
        ay += ty * pull
      }
      vx[i] = (vx[i] + ax * dt * this.forces) * damping
      vy[i] = (vy[i] + ay * dt * this.forces) * damping
    }
    this.grid()
    // Pairwise viscosity dissipates inward relative motion, preserving momentum.
    for (let i = 0; i < n; i++) {
      const count = this.nearby(i)
      for (let k = 0; k < count; k++) {
        const j = this.neighbors[k]
        if (j <= i) continue
        let dx = x[j] - x[i],
          dy = y[j] - y[i],
          r = Math.sqrt(dx * dx + dy * dy)
        if (r < 0.001 || r >= h) continue
        dx /= r
        dy /= r
        const u = (vx[i] - vx[j]) * dx + (vy[i] - vy[j]) * dy
        if (u <= 0) continue
        const impulse = Math.min(u, dt * (1 - r / h) * (this.sigma * u + 0.03 * u * u)) * 0.5
        vx[i] -= impulse * dx
        vy[i] -= impulse * dy
        vx[j] += impulse * dx
        vy[j] += impulse * dy
      }
    }
    for (let i = 0; i < n; i++) {
      ox[i] = x[i]
      oy[i] = y[i]
      const speed = Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i])
      if (speed > 180) {
        vx[i] *= 180 / speed
        vy[i] *= 180 / speed
        this.clamps++
      }
      x[i] += vx[i] * dt
      y[i] += vy[i] * dt
    }
    this.grid()
    for (let i = 0; i < n; i++) {
      const count = this.nearby(i)
      let density = 0,
        near = 0
      for (let k = 0; k < count; k++) {
        const j = this.neighbors[k],
          r = Math.sqrt((x[j] - x[i]) ** 2 + (y[j] - y[i]) ** 2)
        if (r >= h) continue
        const w = 1 - r / h
        density += w * w
        near += w * w * w
      }
      // Negative pressure supplies cohesion. Near-pressure resists clustering.
      const pressure = this.k * (density - this.restDensity),
        nearPressure = this.nearK * near
      let cx = 0,
        cy = 0
      for (let k = 0; k < count; k++) {
        const j = this.neighbors[k],
          dx = x[j] - x[i],
          dy = y[j] - y[i],
          r = Math.sqrt(dx * dx + dy * dy)
        if (r < 0.001 || r >= h) continue
        const w = 1 - r / h
        const displacement = (dt * dt * (pressure * w + nearPressure * w * w) * 0.5) / r
        const mx = dx * displacement,
          my = dy * displacement
        x[j] += mx
        y[j] += my
        cx -= mx
        cy -= my
      }
      x[i] += cx
      y[i] += cy
    }
    for (let i = 0; i < n; i++) {
      // Resolve contacts with the surrounding dots; the centre has no shape cage.
      for (const dot of this.dots) {
        const dx = x[i] - dot.x,
          dy = y[i] - dot.y,
          r = Math.sqrt(dx * dx + dy * dy),
          limit = dot.r + 1.6
        if (r < limit && r > 0.001) {
          x[i] = dot.x + (dx * limit) / r
          y[i] = dot.y + (dy * limit) / r
        }
      }
      x[i] = Math.max(8, Math.min(352, x[i]))
      y[i] = Math.max(8, Math.min(352, y[i]))
      vx[i] = (x[i] - ox[i]) / dt
      vy[i] = (y[i] - oy[i]) / dt
    }
    this.steps++
  }
  metrics() {
    let cx = 0,
      cy = 0,
      energy = 0,
      minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity
    for (let i = 0; i < this.n; i++) {
      cx += this.x[i]
      cy += this.y[i]
      energy += this.vx[i] ** 2 + this.vy[i] ** 2
      minX = Math.min(minX, this.x[i])
      maxX = Math.max(maxX, this.x[i])
      minY = Math.min(minY, this.y[i])
      maxY = Math.max(maxY, this.y[i])
    }
    return {
      particles: this.n,
      centre: [cx / this.n, cy / this.n],
      energy: energy / this.n,
      bounds: [minX, minY, maxX, maxY],
      steps: this.steps,
      clamps: this.clamps,
    }
  }
}
