import { randomFrom } from './fragment-generator.ts'
import type { BorderPose } from './border-motion.ts'

type Bounds = { width: number; height: number }
type Particle = { index: number; distance: number; velocity: number; speed: number; phase: number }
export type BorderFlow = {
  bounds: Bounds
  perimeter: number
  particles: Particle[]
  time: number
  spacing: number
  maxSpacing: number
}
const wrap = (distance: number, perimeter: number) =>
  ((distance % perimeter) + perimeter) % perimeter

export function createBorderFlow(poses: BorderPose[], bounds: Bounds): BorderFlow {
  const { width: w, height: h } = bounds
  const perimeter = 2 * (w + h)
  const particles = poses
    .map((pose, index) => {
      const { x, y } = pose.pivot
      const distance = [x + w / 2, w + y + h / 2, w + h + w / 2 - x, 2 * w + h + h / 2 - y][
        pose.side
      ]
      const random = randomFrom(`${index}/${pose.aligned.d}/travel`)
      return {
        index,
        distance: wrap(distance, perimeter),
        velocity: 0,
        speed: (4 + random() * 4) * (random() < 0.5 ? -1 : 1),
        phase: random() * Math.PI * 2,
      }
    })
    .sort((a, b) => a.distance - b.distance)
  // Centre spacing permits partial silhouette overlap, without squeezing several
  // fragments into one patch. Unequal gaps are intentional; no evenly spaced train.
  return {
    bounds,
    perimeter,
    particles,
    time: 0,
    spacing: (perimeter / Math.max(1, poses.length)) * 0.42,
    maxSpacing: (perimeter / Math.max(1, poses.length)) * 1.85,
  }
}

export function advanceBorderFlow(flow: BorderFlow, seconds: number) {
  const { particles, perimeter, spacing, maxSpacing } = flow
  if (particles.length < 2) return
  let remaining = Math.max(0, seconds)
  while (remaining > 0) {
    const dt = Math.min(remaining, 1 / 30)
    remaining -= dt
    flow.time += dt
    const gaps = particles.map(
      (p, i) =>
        (i === particles.length - 1
          ? particles[0].distance + perimeter
          : particles[i + 1].distance) - p.distance,
    )
    const steps = particles.map((p, i) => {
      const ahead = gaps[i],
        behind = gaps[(i + particles.length - 1) % particles.length]
      const pressure =
        (ahead - behind) * 0.035 +
        Math.max(0, spacing * 1.8 - behind) * 0.7 -
        Math.max(0, spacing * 1.8 - ahead) * 0.7
      const desired = Math.max(
        -12,
        Math.min(12, p.speed + Math.sin(flow.time * 0.27 + p.phase) * 3 + pressure),
      )
      p.velocity += (desired - p.velocity) * (1 - Math.exp(-dt * 1.8))
      // Both neighbours may approach at once, so each can consume at most half
      // the available gap. Already-close saved pieces may separate, never bunch further.
      const lower = Math.max(
        -Math.max(0, behind - spacing) / 2,
        -Math.max(0, maxSpacing - ahead) / 2,
      )
      const upper = Math.min(Math.max(0, ahead - spacing) / 2, Math.max(0, maxSpacing - behind) / 2)
      return Math.max(lower, Math.min(upper, p.velocity * dt))
    })
    particles.forEach((p, i) => (p.distance += steps[i]))
  }
}

function sample(distance: number, bounds: Bounds) {
  const { width: w, height: h } = bounds
  const perimeter = 2 * (w + h),
    s = wrap(distance, perimeter)
  const lengths = [w, h, w, h]
  const corners = [
    { x: -w / 2, y: -h / 2 },
    { x: w / 2, y: -h / 2 },
    { x: w / 2, y: h / 2 },
    { x: -w / 2, y: h / 2 },
  ]
  const directions = [
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 0, y: -1 },
  ]
  let side = 0,
    along = s
  while (side < 3 && along >= lengths[side]) along -= lengths[side++]
  const dir = directions[side],
    corner = corners[side]
  const pivot = { x: corner.x + dir.x * along, y: corner.y + dir.y * along }
  const radius = Math.min(12, w / 4, h / 4)
  let idlePivot = pivot,
    heading = side * 90
  if (along < radius || lengths[side] - along < radius) {
    const nearStart = along < radius
    const next = nearStart ? side : (side + 1) % 4,
      prev = (next + 3) % 4
    const c = corners[next],
      before = directions[prev],
      after = directions[next]
    const t = nearStart
      ? (radius + along) / (2 * radius)
      : (along - lengths[side] + radius) / (2 * radius)
    const a = { x: c.x - before.x * radius, y: c.y - before.y * radius }
    const b = { x: c.x + after.x * radius, y: c.y + after.y * radius }
    idlePivot = {
      x: (1 - t) ** 2 * a.x + 2 * (1 - t) * t * c.x + t * t * b.x,
      y: (1 - t) ** 2 * a.y + 2 * (1 - t) * t * c.y + t * t * b.y,
    }
  }
  // Let rotation anticipate the bend and settle after it. Deriving it directly
  // from the tight quadratic tangent doubles angular speed at mid-corner and
  // starts/stops that speed abruptly. Keep the original positional path, so
  // hover alignment still needs only a small translation.
  const turnRange = Math.min(30, w / 4, h / 2)
  if (along < turnRange || lengths[side] - along < turnRange) {
    const nearStart = along < turnRange
    const next = nearStart ? side : (side + 1) % 4
    const prev = (next + 3) % 4
    const t = nearStart
      ? (turnRange + along) / (2 * turnRange)
      : (along - lengths[side] + turnRange) / (2 * turnRange)
    heading = prev * 90 + t * t * (3 - 2 * t) * 90
  }
  return { pivot, idlePivot, heading, side }
}

export function travellingBorderPoses(flow: BorderFlow, poses: BorderPose[]): BorderPose[] {
  const result = poses.slice()
  for (const p of flow.particles) {
    const pose = poses[p.index],
      at = sample(p.distance, flow.bounds)
    const angle = pose.aligned.angle + (at.side - pose.side) * 90
    const a = (angle * Math.PI) / 180
    const rotated = {
      x: pose.localPivot.x * Math.cos(a) - pose.localPivot.y * Math.sin(a),
      y: pose.localPivot.x * Math.sin(a) + pose.localPivot.y * Math.cos(a),
    }
    result[p.index] = {
      ...pose,
      ...at,
      aligned: { ...pose.aligned, angle, x: at.pivot.x - rotated.x, y: at.pivot.y - rotated.y },
    }
  }
  return result
}
