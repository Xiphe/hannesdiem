import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  borderEdge,
  generateFragments,
  assembleBorder,
} from '../app/temple/fragment-button/fragment-generator.ts'
import {
  prepareBorderPose,
  floatingBorderPose,
} from '../app/temple/fragment-button/border-motion.ts'

const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`)
test('the actual oblique cut aligns exactly to its nearest border, preserving its slot and size', () => {
  const bounds = { width: 260, height: 64 }
  for (let seed = 0; seed < 50; seed++) {
    const pieces = assembleBorder(generateFragments(String(seed), 8), {
      ...bounds,
      seed: String(seed),
      overlap: 0.3,
    })
    for (const piece of pieces) {
      const pose = prepareBorderPose(piece, bounds, String(seed))
      assert.equal(pose.aligned.d, piece.d)
      assert.equal(pose.aligned.size, piece.size)
      const angle = (pose.aligned.angle * Math.PI) / 180
      const points = borderEdge(piece).map((p) => {
        const x = ((p.x + (piece.origin?.[0] ?? 0)) * piece.size) / 28
        const y = ((p.y + (piece.origin?.[1] ?? 0)) * piece.size) / 28
        return {
          x: pose.aligned.x + x * Math.cos(angle) - y * Math.sin(angle),
          y: pose.aligned.y + x * Math.sin(angle) + y * Math.cos(angle),
        }
      })
      for (const p of points) {
        if (pose.side % 2) near(p.x, pose.side === 1 ? 130 : -130)
        else near(p.y, pose.side === 0 ? -32 : 32)
      }
      for (const time of [0, 500, 2500, 10000]) {
        const idle = floatingBorderPose(pose, time)
        assert.equal(idle.d, piece.d)
        assert.equal(idle.size, piece.size)
        // Floating happens around the same edge midpoint, never another slot.
        const a = (idle.angle * Math.PI) / 180
        const x = idle.x + pose.localPivot.x * Math.cos(a) - pose.localPivot.y * Math.sin(a)
        const y = idle.y + pose.localPivot.x * Math.sin(a) + pose.localPivot.y * Math.cos(a)
        assert.ok(Math.hypot(x - pose.pivot.x, y - pose.pivot.y) < 5.2)
      }
      assert.deepEqual(floatingBorderPose(pose, 0, true), floatingBorderPose(pose, 10000, true))
    }
  }
})

test('collinear subdivisions form one straight edge rather than tiny independent slots', () => {
  const edge = borderEdge({
    kind: 0,
    x: 0,
    y: 0,
    size: 64,
    angle: 0,
    d: 'M-14 0L-7 0L0 0L7 0L14 0L3 -8L-9 -5Z',
  })
  assert.deepEqual(edge, [
    { x: -14, y: 0 },
    { x: 14, y: 0 },
  ])
})
