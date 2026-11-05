import { test } from 'node:test'
import assert from 'node:assert/strict'
import { circleSurface } from '../app/temple/facts/circle-shape.ts'

test('the invitation rests on a circular perimeter', () => {
  const numbers = circleSurface()
    .match(/-?\d+(?:\.\d+)?/g)!
    .map(Number)
  let start = numbers.slice(0, 2)
  for (let i = 2; i < numbers.length; i += 6) {
    const end = numbers.slice(i + 4, i + 6)
    for (let step = 0; step <= 20; step++) {
      const t = step / 20
      const point = [0, 1].map(
        (axis) =>
          (1 - t) ** 3 * start[axis] +
          3 * (1 - t) ** 2 * t * numbers[i + axis] +
          3 * (1 - t) * t ** 2 * numbers[i + 2 + axis] +
          t ** 3 * end[axis],
      )
      assert.ok(Math.abs(Math.hypot(point[0] - 50, point[1] - 50) - 50) < 0.1)
    }
    start = end
  }
})

test('the pointing invitation has no backward folds along its boundary', () => {
  const poses = [
    [0, 0],
    [-104.7, -34],
  ]
  for (let angle = 0; angle < 360; angle += 10) {
    const radians = (angle * Math.PI) / 180
    poses.push([Math.cos(radians) * 110, Math.sin(radians) * 110])
  }
  for (const [dx, dy] of poses) {
    const numbers = circleSurface(dx, dy)
      .match(/-?\d+(?:\.\d+)?/g)!
      .map(Number)
    let start = numbers.slice(0, 2)
    for (let i = 2; i < numbers.length; i += 6) {
      const control1 = numbers.slice(i, i + 2)
      const control2 = numbers.slice(i + 2, i + 4)
      const end = numbers.slice(i + 4, i + 6)
      const chord = [end[0] - start[0], end[1] - start[1]]
      const length = Math.hypot(...chord)
      // Adjacent boundary samples should not acquire a backward-facing hook
      // between them. Sample the actual cubic used by the SVG renderer.
      for (let step = 0; step <= 40; step++) {
        const t = step / 40
        const tangent = [0, 1].map(
          (axis) =>
            3 *
            ((1 - t) ** 2 * (control1[axis] - start[axis]) +
              2 * (1 - t) * t * (control2[axis] - control1[axis]) +
              t ** 2 * (end[axis] - control2[axis])),
        )
        const forward = (tangent[0] * chord[0] + tangent[1] * chord[1]) / length
        assert.ok(
          forward >= -0.05,
          `backward fold at direction ${dx},${dy}, segment ${(i - 2) / 6}: ${forward}`,
        )
      }
      start = end
    }
  }
})

/** Sample the actual SVG cubics, including their interpolated flanks. */
function outlinePoints(dx: number, dy: number) {
  const numbers = circleSurface(dx, dy)
    .match(/-?\d+(?:\.\d+)?/g)!
    .map(Number)
  let start = numbers.slice(0, 2)
  const points = [start]
  for (let i = 2; i < numbers.length; i += 6) {
    const end = numbers.slice(i + 4, i + 6)
    for (let step = 1; step <= 20; step++) {
      const t = step / 20
      points.push(
        [0, 1].map(
          (axis) =>
            (1 - t) ** 3 * start[axis] +
            3 * (1 - t) ** 2 * t * numbers[i + axis] +
            3 * (1 - t) * t ** 2 * numbers[i + 2 + axis] +
            t ** 3 * end[axis],
        ),
      )
    }
    start = end
  }
  return points.slice(0, -1)
}

test('the soft nose keeps the same target clearance in every direction', () => {
  for (let angle = 0; angle < 360; angle += 10) {
    const radians = (angle * Math.PI) / 180
    const ux = Math.cos(radians),
      uy = Math.sin(radians)
    const points = outlinePoints(110 * ux, 110 * uy)
    const reach = Math.max(...points.map(([x, y]) => (x - 50) * ux + (y - 50) * uy))
    assert.ok(Math.abs(110 - reach - 24) < 0.1, `clearance at ${angle} degrees`)
    assert.ok(points.every(([x, y]) => Math.hypot(x - 50, y - 50) >= 49.9))
  }
})

test('the circular pull rotates uniformly without changing at diagonal targets', () => {
  const reference = outlinePoints(110, 0)
  for (let step = 1; step < 64; step += 7) {
    const angle = (step * Math.PI) / 32
    const rotated = outlinePoints(110 * Math.cos(angle), 110 * Math.sin(angle))
    for (const [index, [x, y]] of reference.entries()) {
      const expected = [
        50 + (x - 50) * Math.cos(angle) - (y - 50) * Math.sin(angle),
        50 + (x - 50) * Math.sin(angle) + (y - 50) * Math.cos(angle),
      ]
      const actual = rotated[(index + step * 20) % rotated.length]
      assert.ok(Math.hypot(actual[0] - expected[0], actual[1] - expected[1]) < 0.04)
    }
  }
})

test('switching between opposite places keeps the circular body intact', () => {
  const before = outlinePoints(110, 0)
  const after = outlinePoints(-110, 0)
  for (const t of [0.25, 0.5, 0.75]) {
    for (const [index, [x, y]] of before.entries()) {
      const next = after[index]
      const point = [x + (next[0] - x) * t, y + (next[1] - y) * t]
      assert.ok(Math.hypot(point[0] - 50, point[1] - 50) >= 49.9)
    }
  }
})
