import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createCircleFluid } from '../app/temple/facts/circle-fluid.ts'
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

test('a released pool immediately drains while the next one grows independently', () => {
  const fluid = createCircleFluid()
  fluid.aim(1, 100, 0, 23)
  const [held] = fluid.step(1, true)
  fluid.aim(2, -100, 0, 23)
  let previousOld = held.x
  let previousNew = 0
  for (let frame = 0; frame < 20; frame++) {
    const [oldPool, newPool] = fluid.step(1 / 60)
    assert.ok(oldPool.x < previousOld, 'old material must keep draining on every frame')
    assert.ok(newPool.x < previousNew, 'new material must keep extending on every frame')
    assert.ok(
      Math.abs(oldPool.y) < 2 && Math.abs(newPool.y) < 2,
      'pools flow through the body rather than orbiting it',
    )
    previousOld = oldPool.x
    previousNew = newPool.x
  }
})

test('leaving gathers every pool completely back into the resting body', () => {
  const fluid = createCircleFluid()
  fluid.aim(1, 100, 0, 23)
  fluid.step(0, true)
  fluid.aim(2, 0, -100, 23)
  fluid.step(0.2)
  fluid.release()
  let lastReach = Infinity
  for (let frame = 0; frame < 180; frame++) {
    const pools = fluid.step(1 / 60)
    const reach = Math.max(0, ...pools.map((p) => Math.hypot(p.x, p.y) + p.radius))
    assert.ok(reach < lastReach || reach === 0)
    lastReach = reach
  }
  assert.equal(fluid.active, false)
  assert.equal(circleSurface(fluid.step(0)), circleSurface())
})

test('reduced motion places and releases the pool immediately without ambient drift', () => {
  const fluid = createCircleFluid()
  fluid.aim(4, -80, 60, 22)
  const held = fluid.step(0, true)
  assert.deepEqual(held, [{ x: -80, y: 60, radius: 22, neck: 1 }])
  assert.deepEqual(fluid.step(5, true), held)
  fluid.release()
  assert.deepEqual(fluid.step(0, true), [])
  assert.equal(fluid.active, false)
})

test('continuous input retargets from the current pool instead of snapping it', () => {
  const fluid = createCircleFluid()
  fluid.aim(1, 100, 0, 23)
  fluid.step(0, true)
  fluid.aim(1, 85, 20, 23)
  const [next] = fluid.step(1 / 60)
  assert.ok(next.x > 85 && next.x < 102)
  assert.ok(next.y > 0 && next.y < 20)
  const [settled] = fluid.step(5)
  assert.ok(Math.hypot(settled.x - 85, settled.y - 20) < 3)
})

test('the neck meets the outer pool tangentially in every direction', () => {
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 6) {
    const x = Math.cos(angle) * 98,
      y = Math.sin(angle) * 98
    const bridge = circleSurface([{ x, y, radius: 23, neck: 1 }]).split('M')[3]
    const segments = bridge.match(/[CLC][^CLCZ]+/g)!.map((segment) =>
      segment
        .slice(1)
        .match(/-?\d+(?:\.\d+)?/g)!
        .map(Number),
    )
    const top = segments[1]
    const bottom = segments[2]
    const departing = segments[3]
    for (const [px, py, tx, ty] of [
      [top[4], top[5], top[4] - top[2], top[5] - top[3]],
      [bottom[0], bottom[1], departing[0] - bottom[0], departing[1] - bottom[1]],
    ]) {
      const rx = px - 50 - x,
        ry = py - 50 - y
      const cosine = (rx * tx + ry * ty) / (Math.hypot(rx, ry) * Math.hypot(tx, ty))
      assert.ok(Math.abs(cosine) < 0.002, `a tangent join at ${angle}: ${cosine}`)
      assert.ok(rx * ty - ry * tx > 0, 'the join follows the perimeter without a cusp')
    }
  }
})
