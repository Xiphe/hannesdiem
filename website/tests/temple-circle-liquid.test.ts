import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CircleFluid } from '../app/temple/facts/circle-fluid.ts'
import { DensitySurface } from '../app/temple/facts/circle-surface.ts'

const advance = (fluid: CircleFluid, count: number) => {
  for (let i = 0; i < count; i++) fluid.step()
  assert.ok([...fluid.x, ...fluid.y, ...fluid.vx, ...fluid.vy].every(Number.isFinite))
}

test('real material travels between targets and remains conserved on release', () => {
  const fluid = new CircleFluid()
  const count = fluid.n
  fluid.target = fluid.dots[2]
  advance(fluid, 600)
  assert.ok(fluid.targetLoad > 10)
  const before = fluid.x.slice()
  fluid.target = fluid.dots[7]
  fluid.step()
  assert.ok(
    fluid.x.every((x, i) => Math.abs(x - before[i]) < 3),
    'retargeting cannot teleport material',
  )
  advance(fluid, 600)
  assert.ok(fluid.targetLoad > 10)
  fluid.target = null
  advance(fluid, 960)
  assert.equal(fluid.n, count)
  assert.ok(Math.hypot(...fluid.metrics().centre.map((v) => v - 180)) < 2)
  assert.equal(new DensitySurface().update(fluid).includes('NaN'), false)
})

test('dot and free-pointer budgets independently regulate the collected amount', () => {
  for (const kind of ['dot', 'cursor']) {
    const loads: number[] = []
    for (const amount of [15, 90]) {
      const fluid = new CircleFluid()
      fluid.dotCapacity = kind === 'dot' ? amount : 63
      fluid.cursorCapacity = kind === 'cursor' ? amount : 245
      fluid.target = kind === 'dot' ? fluid.dots[2] : { x: 250, y: 180, r: 0 }
      advance(fluid, 600)
      loads.push(fluid.targetLoad)
    }
    assert.ok(loads[1] > loads[0], `${kind}: more collection must gather more liquid`)
  }
})

test('outward cursor influence fades to exactly released dynamics; zero releases either target', () => {
  let gain = Infinity
  for (const radius of [80, 110, 130, 144, 145]) {
    const fluid = new CircleFluid()
    fluid.target = { x: 180 + radius, y: 180, r: 0 }
    fluid.step()
    assert.ok(fluid.targetGain < gain)
    gain = fluid.targetGain
  }
  for (const target of ['dot', 'cursor', 'outside']) {
    const fluid = new CircleFluid()
    const released = new CircleFluid()
    fluid.target =
      target === 'dot' ? fluid.dots[2] : { x: target === 'outside' ? 325 : 250, y: 180, r: 0 }
    if (target !== 'outside') fluid.dotCapacity = fluid.cursorCapacity = 0
    advance(fluid, 60)
    advance(released, 60)
    assert.deepEqual(fluid.x, released.x)
    assert.deepEqual(fluid.y, released.y)
  }
})

for (const kind of ['disk', 'annulus', 'separate', 'diagonal']) {
  test(`SVG density contours preserve ${kind} topology`, () => {
    const surface = new DensitySurface(81, 80)
    for (let y = 0; y < 81; y++)
      for (let x = 0; x < 81; x++) {
        const radius = Math.hypot(x - 40, y - 40)
        surface.field[y * 81 + x] =
          kind === 'disk'
            ? 1 + (20 - radius) / 4
            : kind === 'annulus'
              ? 1 + Math.min(24 - radius, radius - 12) / 4
              : kind === 'separate'
                ? Math.max(
                    1 + (9 - Math.hypot(x - 21, y - 40)) / 4,
                    1 + (9 - Math.hypot(x - 59, y - 40)) / 4,
                  )
                : Math.max(
                    0,
                    1 +
                      Math.max(14 - Math.hypot(x - 27, y - 27), 14 - Math.hypot(x - 53, y - 53)) /
                        4,
                  )
      }
    const path = surface.trace()
    assert.ok(!/NaN|Infinity/.test(path))
    assert.equal(surface.loops.length, kind === 'disk' ? 1 : 2)
    assert.equal((path.match(/Z/g) || []).length, surface.loops.length)
    for (const id of surface.ids) assert.ok(surface.linkA[id] >= 0 && surface.linkB[id] >= 0)
    if (kind === 'disk')
      for (const [x, y] of surface.loops[0])
        assert.ok(Math.abs(Math.hypot(x - 40, y - 40) - 20) < 0.03)
  })
}

test('SVG resolves both saddle orientations without merging separated droplets', () => {
  for (const diagonal of [false, true])
    for (const value of [1.2, 2.4]) {
      const surface = new DensitySurface(5, 4)
      const corners = diagonal
        ? [
            [1, 2],
            [2, 1],
          ]
        : [
            [1, 1],
            [2, 2],
          ]
      for (const [x, y] of corners) surface.field[y * 5 + x] = value
      surface.trace()
      assert.equal(surface.loops.length, value < 2 ? 2 : 1)
    }
  assert.equal(new DensitySurface(5, 4).trace(), '')
})

test('a held seat keeps a hollow interior surrounded by simulated liquid', () => {
  const fluid = new CircleFluid()
  const seat = fluid.dots[2]
  fluid.target = seat
  advance(fluid, 960)
  const surface = new DensitySurface()
  surface.update(fluid)
  const x = Math.round(seat.x / surface.cell)
  const y = Math.round(seat.y / surface.cell)
  assert.ok(surface.field[y * surface.size + x] < 1, 'the seat interior remains a real hole')
  let nearby = 0
  for (let i = 0; i < fluid.n; i++) {
    const distance = Math.hypot(fluid.x[i] - seat.x, fluid.y[i] - seat.y)
    assert.ok(distance >= seat.r + 1.6 - 1e-6, 'seat contact excludes liquid from the interior')
    if (distance < 35) nearby++
  }
  assert.ok(nearby > 10, 'simulated material still gathers around the seat')
})
