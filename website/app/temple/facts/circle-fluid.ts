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
  releaseAsymmetry: number
  /** Seconds between flank wetting fronts; null retains the website release. */
  releaseSideDelay: number | null
  seatAdhesion: number
  targetDistances: Float64Array
  targetLoad: number
  targetGain: number
  steps: number
  forces: number
  drag: number
  clamps: number
  dots: CircleTarget[]
  private peeling?: { age: number; side: number; relaxation: number }
  private wetSeat?: CircleTarget
  private wetParticles?: Float64Array
  private circulation?: CircleTarget & { age: number; duration: number; strength: number }

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
    this.releaseAsymmetry = 1
    this.releaseSideDelay = null
    this.seatAdhesion = 0
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
  /** Preserve a released seat's wetting while the pointer crosses free space. */
  setTarget(next: CircleTarget | null, random: () => number = Math.random) {
    const previous = this.target
    const sameSeat =
      previous?.r && next?.r && Math.hypot(previous.x - next.x, previous.y - next.y) < 0.1
    if (previous?.r && !sameSeat && this.releaseSideDelay !== null) {
      this.release(random)
    } else if (previous && !next && !(this.peeling && !previous.r)) {
      this.release(random)
    }
    this.target = next
  }
  /** Release through circulation or explicitly delayed surface wetting. */
  release(random: () => number = Math.random) {
    const target = this.target
    if (!target) return
    this.target = null
    this.wetSeat = target.r ? { ...target } : undefined
    if (target.r) {
      this.wetParticles ??= new Float64Array(this.n)
      for (let i = 0; i < this.n; i++) {
        const distance = Math.hypot(this.x[i] - target.x, this.y[i] - target.y)
        this.wetParticles[i] = Math.min(1, Math.max(0, (target.r + 10 - distance) / 6))
      }
    }
    const sign = random() < 0.5 ? -1 : 1
    const amount = random()
    this.peeling =
      target.r && this.releaseSideDelay !== null
        ? { age: 0, side: sign, relaxation: 0.8 + amount * 0.2 }
        : undefined
    const spin = sign * (target.r ? (this.peeling ? 0 : 3.2 + amount * 1.3) : 3 + amount * 3.5)
    if (this.peeling) this.circulation = undefined
    const impulse = target.r ? spin * this.releaseAsymmetry : spin
    if (target.r && !this.peeling)
      this.circulation = { ...target, age: 0, duration: 0.7 + random() * 0.3, strength: spin * 24 }
    const dx = target.x - 180,
      dy = target.y - 180
    const distance = Math.hypot(dx, dy) || 1
    let totalX = 0,
      totalY = 0
    const support = target.r ? 40 * 40 : 48 * 48
    for (let i = 0; i < this.n; i++) {
      const x = this.x[i] - target.x,
        y = this.y[i] - target.y
      const weight = Math.exp(-(x * x + y * y) / support)
      this.targetDistances[i] = weight
      totalX += target.r ? -y * impulse * weight : (-dy / distance) * impulse * 4 * weight
      totalY += target.r ? x * impulse * weight : (dx / distance) * impulse * 4 * weight
    }
    for (let i = 0; i < this.n; i++) {
      const x = this.x[i] - target.x,
        y = this.y[i] - target.y
      const weight = this.targetDistances[i]
      // Change velocity only. Counterbalance the impulse through the body so
      // local angular momentum adds no net linear drift or prescribed pose.
      this.vx[i] +=
        (target.r ? -y * impulse * weight : (-dy / distance) * impulse * 4 * weight) -
        totalX / this.n
      this.vy[i] +=
        (target.r ? x * impulse * weight : (dx / distance) * impulse * 4 * weight) - totalY / this.n
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
    let circulation = this.circulation
    if (target) {
      circulation = this.circulation = undefined
      // A free pointer or another seat must not erase the previous seat's
      // release. Returning to that same seat replaces wetting with collection.
      const sameSeat =
        target.r &&
        this.wetSeat &&
        Math.hypot(target.x - this.wetSeat.x, target.y - this.wetSeat.y) < 0.1
      if (!this.peeling || sameSeat) {
        this.wetSeat = undefined
        this.peeling = undefined
      }
    }
    if (this.peeling) {
      this.peeling.age += dt
      if (this.peeling.age > 0.8 + 2 * (this.releaseSideDelay ?? 0) + this.peeling.relaxation) {
        this.peeling = undefined
        this.wetSeat = undefined
      }
    }
    if (circulation) {
      circulation.age += dt
      if (circulation.age >= circulation.duration) circulation = this.circulation = undefined
    }
    const spinAge = circulation ? circulation.age / circulation.duration : 1
    const spinStrength = circulation
      ? circulation.strength * this.releaseAsymmetry * (1 - spinAge * spinAge * (3 - 2 * spinAge))
      : 0
    let spinMeanX = 0,
      spinMeanY = 0
    if (circulation) {
      for (let i = 0; i < n; i++) {
        const dx = x[i] - circulation.x,
          dy = y[i] - circulation.y
        const weight = Math.exp(-(dx * dx + dy * dy) / (40 * 40))
        spinMeanX -= (dy * spinStrength * weight) / n
        spinMeanY += (dx * spinStrength * weight) / n
      }
    }
    const wetSeat = this.seatAdhesion > 0 ? this.wetSeat : undefined
    let bridgeLoad = 0
    if (wetSeat) {
      const toCentre = Math.hypot(180 - wetSeat.x, 180 - wetSeat.y) || 1
      const nx = (180 - wetSeat.x) / toCentre,
        ny = (180 - wetSeat.y) / toCentre
      for (let i = 0; i < n; i++) {
        const dx = x[i] - wetSeat.x,
          dy = y[i] - wetSeat.y
        const above = dx * nx + dy * ny - wetSeat.r - 8
        const distance = Math.hypot(dx, dy)
        bridgeLoad +=
          Math.min(1, Math.max(0, above / 6)) *
          Math.min(1, Math.max(0, (wetSeat.r + 40 - distance) / 8))
      }
    }
    const wetting = this.peeling ? 1 : Math.min(1, bridgeLoad / 12)
    const adhesion = this.seatAdhesion * wetting * wetting * (3 - 2 * wetting)
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
      if (wetSeat && adhesion) {
        const tx = wetSeat.x - x[i],
          ty = wetSeat.y - y[i]
        const distance = Math.hypot(tx, ty) || 1
        const near = Math.min(1, Math.max(0, (wetSeat.r + 12 - distance) / 10))
        if (near === 0) this.wetParticles![i] = 0
        const contact = near * near * (3 - 2 * near) * this.wetParticles![i]
        // Wet only material already at the surface; do not recruit distant
        // particles. Relax it through bridge load or each flank's wetting front.
        let grip = adhesion * contact * (this.peeling ? 2 : 1)
        if (this.peeling) {
          const radial = Math.hypot(180 - wetSeat.x, 180 - wetSeat.y) || 1
          const nx = (180 - wetSeat.x) / radial,
            ny = (180 - wetSeat.y) / radial
          const along = ((x[i] - wetSeat.x) * nx + (y[i] - wetSeat.y) * ny) / distance
          const side = ((x[i] - wetSeat.x) * -ny + (y[i] - wetSeat.y) * nx) / distance
          const later = Math.min(1, Math.max(0, 0.5 + this.peeling.side * side * 2))
          const arc = Math.acos(Math.min(1, Math.max(-1, along))) / Math.PI
          // Release surface wetting from the incoming neck around each flank.
          // The outer tip loosens last; only real particle contact is affected.
          const start = arc * (0.8 + 2 * (this.releaseSideDelay ?? 0) * later)
          const phase = Math.min(
            1,
            Math.max(0, (this.peeling.age - start) / this.peeling.relaxation),
          )
          grip *= 1 - phase * phase * (3 - 2 * phase)
        }
        const pull = (this.attraction * 4 * grip * (distance - wetSeat.r - 2)) / distance
        const friction = (this.peeling ? 60 : 40) * grip
        ax += tx * pull - vx[i] * friction
        ay += ty * pull - vy[i] * friction
      }
      if (circulation) {
        const dx = x[i] - circulation.x,
          dy = y[i] - circulation.y
        const weight = Math.exp(-(dx * dx + dy * dy) / (40 * 40))
        ax += -dy * spinStrength * weight - spinMeanX
        ay += dx * spinStrength * weight - spinMeanY
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

/** Artist-selected material, 2026-11-06. The centre has no display-only cover. */
export const selectedCircleMaterial = Object.freeze({
  sigma: 18,
  drag: 2,
  attraction: 513,
  dotCapacity: 60,
  cursorCapacity: 245,
  releaseAsymmetry: 0,
  releaseSideDelay: 0.2,
  seatAdhesion: 0.25,
} satisfies Partial<CircleFluid>)

export function createCircleFluid() {
  return Object.assign(new CircleFluid(), selectedCircleMaterial)
}
