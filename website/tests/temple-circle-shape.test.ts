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

test('a sideways pull does not raise an extra shoulder above the circle', () => {
  // The target tip is within the body's vertical range, so this pose should
  // turn toward it without creating an unrelated bump above the top edge.
  const numbers = circleSurface(-104.7, -34)
    .match(/-?\d+(?:\.\d+)?/g)!
    .map(Number)
  let startY = numbers[1]
  for (let i = 2; i < numbers.length; i += 6) {
    const control1Y = numbers[i + 1]
    const control2Y = numbers[i + 3]
    const endY = numbers[i + 5]
    for (let step = 0; step <= 40; step++) {
      const t = step / 40
      const y =
        (1 - t) ** 3 * startY +
        3 * (1 - t) ** 2 * t * control1Y +
        3 * (1 - t) * t ** 2 * control2Y +
        t ** 3 * endY
      assert.ok(y >= -0.05, `unwanted shoulder at y=${y}`)
    }
    startY = endY
  }
})

test('the upper flank of a sideways tip does not curl back below the tip', () => {
  const numbers = circleSurface(-104.7, -34)
    .match(/-?\d+(?:\.\d+)?/g)!
    .map(Number)
  const vertices = [numbers.slice(0, 2)]
  for (let i = 2; i < numbers.length; i += 6) vertices.push(numbers.slice(i + 4, i + 6))
  const tip = vertices.reduce(
    (nearest, point, index) => (point[0] < vertices[nearest][0] ? index : nearest),
    0,
  )
  let startY = vertices[tip][1]
  for (let i = 2 + tip * 6; i < numbers.length; i += 6) {
    for (let step = 0; step <= 40; step++) {
      const t = step / 40
      const y =
        (1 - t) ** 3 * startY +
        3 * (1 - t) ** 2 * t * numbers[i + 1] +
        3 * (1 - t) * t ** 2 * numbers[i + 3] +
        t ** 3 * numbers[i + 5]
      assert.ok(y <= vertices[tip][1] + 0.05, `tip curls backwards to y=${y}`)
      assert.ok(y <= startY + 0.05, `rounded flank reverses at y=${y}`)
    }
    startY = numbers[i + 5]
  }
})
