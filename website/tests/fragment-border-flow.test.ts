import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  generateFragments,
  assembleBorder,
  borderEdge,
} from '../app/temple/fragment-button/fragment-generator.ts'
import {
  prepareBorderPose,
  floatingBorderPose,
} from '../app/temple/fragment-button/border-motion.ts'
import {
  createBorderFlow,
  advanceBorderFlow,
  travellingBorderPoses,
  type BorderFlow,
} from '../app/temple/fragment-button/border-flow.ts'

const bounds = { width: 260, height: 64 }
function fixture(seed: string, count: number) {
  return assembleBorder(generateFragments(seed, count), { ...bounds, overlap: 0.3, seed }).map(
    (piece, i) => prepareBorderPose(piece, bounds, `${seed}/${i}`),
  )
}
function gaps(flow: BorderFlow) {
  return flow.particles.map(
    (p, i) =>
      (flow.particles[i + 1]?.distance ?? flow.particles[0].distance + flow.perimeter) - p.distance,
  )
}

test('pieces travel, keeping their order and bounded gaps instead of forming a crowd', () => {
  for (let seed = 0; seed < 20; seed++)
    for (const count of [4, 8, 12]) {
      const flow = createBorderFlow(fixture(String(seed), count), bounds)
      const start = flow.particles.map((p) => p.distance)
      let previous = gaps(flow)
      for (let second = 0; second < 90; second++) {
        advanceBorderFlow(flow, 1)
        const next = gaps(flow)
        next.forEach((gap, i) => {
          assert.ok(gap >= Math.min(previous[i], flow.spacing) - 1e-7)
          assert.ok(gap <= Math.max(previous[i], flow.maxSpacing) + 1e-7)
        })
        previous = next
      }
      assert.ok(Math.max(...flow.particles.map((p, i) => Math.abs(p.distance - start[i]))) > 20)
      assert.ok(Math.min(...previous) >= flow.spacing - 1e-5)
      assert.ok(Math.max(...previous) <= flow.maxSpacing + 1e-5)
    }
})

test('travelling retains each fragment and aligns its actual cut at its current location', () => {
  const poses = fixture('alignment', 8),
    flow = createBorderFlow(poses, bounds)
  for (let i = 0; i < 30; i++) {
    advanceBorderFlow(flow, 1)
    travellingBorderPoses(flow, poses).forEach((pose, index) => {
      const piece = pose.aligned,
        a = (piece.angle * Math.PI) / 180
      assert.equal(piece.d, poses[index].aligned.d)
      assert.equal(piece.size, poses[index].aligned.size)
      for (const p of borderEdge(piece)) {
        const x = ((p.x + (piece.origin?.[0] ?? 0)) * piece.size) / 28
        const y = ((p.y + (piece.origin?.[1] ?? 0)) * piece.size) / 28
        const world = {
          x: piece.x + x * Math.cos(a) - y * Math.sin(a),
          y: piece.y + x * Math.sin(a) + y * Math.cos(a),
        }
        const error =
          pose.side % 2
            ? world.x - (pose.side === 1 ? 130 : -130)
            : world.y - (pose.side === 0 ? -32 : 32)
        assert.ok(Math.abs(error) < 1e-8)
      }
    })
  }
})

test('idle pieces turn continuously around the corners', () => {
  const poses = fixture('corner', 1),
    flow = createBorderFlow(poses, bounds)
  for (const distance of [0, 260, 324, 584]) {
    const at = (s: number) => {
      flow.particles[0].distance = s
      const pose = travellingBorderPoses(flow, poses)[0]
      const piece = floatingBorderPose(pose, 0)
      const angle = (piece.angle * Math.PI) / 180
      return { x: piece.x, y: piece.y, dx: Math.cos(angle), dy: Math.sin(angle) }
    }
    const a = at(distance - 0.001),
      b = at(distance + 0.001)
    assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < 0.02)
    assert.ok(Math.hypot(a.dx - b.dx, a.dy - b.dy) < 0.002)
  }
})

test('corner rotation has no angular-speed spikes or sudden entry/exit changes', () => {
  const poses = fixture('rotation-rate', 1),
    flow = createBorderFlow(poses, bounds)
  const step = 0.1
  const headings: number[] = []
  for (let s = -step; s <= flow.perimeter + step; s += step) {
    flow.particles[0].distance = s
    headings.push(floatingBorderPose(travellingBorderPoses(flow, poses)[0], 0).angle)
  }
  const rates = headings.slice(1).map((angle, i) => {
    const delta = ((((angle - headings[i] + 180) % 360) + 360) % 360) - 180
    return Math.abs(delta / step)
  })
  const peak = Math.max(...rates)
  const jump = Math.max(...rates.slice(1).map((rate, i) => Math.abs(rate - rates[i])))
  assert.ok(
    peak < 3 && jump < 0.1,
    `Peak ${peak.toFixed(3)}°/px; abrupt rate change ${jump.toFixed(3)}°/px`,
  )
})
