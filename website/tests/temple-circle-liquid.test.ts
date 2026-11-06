import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CircleFluid, createCircleFluid } from '../app/temple/facts/circle-fluid.ts'
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

test('release varies the physical return without teleporting, drifting or repeated kicks', () => {
  const held = new CircleFluid()
  held.target = held.dots[2]
  advance(held, 600)
  const momentum = (fluid: CircleFluid) => [
    fluid.vx.reduce((sum, value) => sum + value, 0),
    fluid.vy.reduce((sum, value) => sum + value, 0),
  ]
  const variants = [0.2, 0.8].map((sample) => {
    const fluid = new CircleFluid()
    fluid.x.set(held.x)
    fluid.y.set(held.y)
    fluid.vx.set(held.vx)
    fluid.vy.set(held.vy)
    fluid.target = fluid.dots[2]
    const before = momentum(fluid)
    fluid.release(() => sample)
    assert.equal(fluid.target, null)
    assert.deepEqual(fluid.x, held.x)
    assert.deepEqual(fluid.y, held.y)
    momentum(fluid).forEach((value, axis) => assert.ok(Math.abs(value - before[axis]) < 1e-8))
    const velocity = fluid.vx.slice()
    fluid.release(() => {
      throw new Error('a released target cannot receive another kick')
    })
    assert.deepEqual(fluid.vx, velocity)
    advance(fluid, 120)
    return fluid
  })
  const difference = Math.max(
    ...variants[0].x.map((x, i) =>
      Math.hypot(x - variants[1].x[i], variants[0].y[i] - variants[1].y[i]),
    ),
  )
  assert.ok(difference > 0.5, 'different impulses produce different physical return paths')
  for (const fluid of variants) {
    advance(fluid, 840)
    assert.equal(fluid.n, held.n)
    assert.ok(Math.hypot(...fluid.metrics().centre.map((v) => v - 180)) < 2)
  }
})

test('the two visible seat arcs open at different times and the leading side varies', () => {
  const held = new CircleFluid()
  const seat = held.dots[2]
  held.target = seat
  advance(held, 600)
  const dx = (seat.x - 180) / 110,
    dy = (seat.y - 180) / 110
  const phases = [0.2, 0.8].map((sample) => {
    const fluid = new CircleFluid()
    for (const field of ['x', 'y', 'vx', 'vy'] as const) fluid[field].set(held[field])
    fluid.target = fluid.dots[2]
    fluid.release(() => sample)
    const surface = new DensitySurface()
    const lastCovered = [0, 0]
    for (let frame = 0; frame < 360; frame++) {
      fluid.step()
      if (frame % 12 !== 0) continue
      surface.update(fluid)
      for (let side = 0; side < 2; side++) {
        const sign = side ? 1 : -1
        const x = Math.round((seat.x - sign * dy * 19) / surface.cell)
        const y = Math.round((seat.y + sign * dx * 19) / surface.cell)
        if (surface.field[y * surface.size + x] > 1) lastCovered[side] = frame
      }
    }
    assert.ok(
      Math.abs(lastCovered[0] - lastCovered[1]) >= 36,
      'visible arcs must open at least 0.3s apart',
    )
    return lastCovered[0] - lastCovered[1]
  })
  assert.ok(
    phases[0] * phases[1] < 0,
    'the earlier side changes rather than always choosing the same arc',
  )
})

test('choosing a new seat cancels the transient release flow at the previous seat', () => {
  const fluid = new CircleFluid()
  fluid.target = fluid.dots[2]
  advance(fluid, 480)
  fluid.release(() => 0.2)
  advance(fluid, 12)
  const withoutReleaseFlow = new CircleFluid()
  for (const field of ['x', 'y', 'vx', 'vy'] as const) withoutReleaseFlow[field].set(fluid[field])
  fluid.target = fluid.dots[7]
  withoutReleaseFlow.target = withoutReleaseFlow.dots[7]
  fluid.step()
  withoutReleaseFlow.step()
  assert.deepEqual(fluid.x, withoutReleaseFlow.x)
  assert.deepEqual(fluid.y, withoutReleaseFlow.y)
})

test('seat release asymmetry scales its impulse and can stop extra circulation live', () => {
  const held = new CircleFluid()
  held.target = held.dots[2]
  advance(held, 480)
  const copy = () => {
    const fluid = new CircleFluid()
    for (const field of ['x', 'y', 'vx', 'vy'] as const) fluid[field].set(held[field])
    return fluid
  }
  const zero = copy()
  zero.releaseAsymmetry = 0
  zero.target = zero.dots[2]
  zero.release(() => 0.2)
  const plain = copy()
  advance(zero, 60)
  advance(plain, 60)
  assert.deepEqual(zero.x, plain.x)
  assert.deepEqual(zero.y, plain.y)

  const normal = copy(),
    stronger = copy()
  assert.equal(normal.releaseAsymmetry, 1)
  stronger.releaseAsymmetry = 2
  for (const fluid of [normal, stronger]) {
    fluid.target = fluid.dots[2]
    fluid.release(() => 0.2)
  }
  for (const axis of ['vx', 'vy'] as const)
    for (let i = 0; i < held.n; i++)
      assert.ok(
        Math.abs(stronger[axis][i] - held[axis][i] - 2 * (normal[axis][i] - held[axis][i])) < 1e-10,
      )
  advance(normal, 12)
  const withoutFlow = new CircleFluid()
  for (const field of ['x', 'y', 'vx', 'vy'] as const) withoutFlow[field].set(normal[field])
  normal.releaseAsymmetry = 0
  normal.step()
  withoutFlow.step()
  assert.deepEqual(normal.x, withoutFlow.x)
  assert.deepEqual(normal.y, withoutFlow.y)

  // This control belongs to the two seat arcs; free-cursor release stays intact.
  const cursors = [0, 2].map((amount) => {
    const fluid = copy()
    fluid.releaseAsymmetry = amount
    fluid.target = { x: 260, y: 180, r: 0 }
    fluid.release(() => 0.2)
    advance(fluid, 12)
    return fluid
  })
  assert.deepEqual(cursors[0].x, cursors[1].x)
  assert.deepEqual(cursors[0].y, cursors[1].y)
})

test('seat wetting holds the existing outer coating and releases when grip is removed', () => {
  const held = new CircleFluid()
  held.target = held.dots[5]
  advance(held, 600)
  const variants = [0, 1].map((grip) => {
    const fluid = new CircleFluid()
    for (const field of ['x', 'y', 'vx', 'vy'] as const) fluid[field].set(held[field])
    fluid.seatAdhesion = grip
    fluid.target = fluid.dots[5]
    fluid.release(() => 0.2)
    advance(fluid, 120)
    const surface = new DensitySurface()
    surface.update(fluid)
    const seat = fluid.dots[5]
    const outer =
      surface.field[
        Math.round((seat.y + 16) / surface.cell) * surface.size + Math.round(seat.x / surface.cell)
      ]
    return { fluid, outer }
  })
  assert.ok(variants[0].outer < 1, 'without wetting the outside has already detached')
  assert.ok(variants[1].outer > 1, 'wetting keeps actual liquid touching the outer seat rim')
  const wet = variants[1].fluid
  wet.seatAdhesion = 0
  advance(wet, 960)
  assert.equal(wet.n, held.n)
  assert.ok(Math.hypot(...wet.metrics().centre.map((value) => value - 180)) < 2)
  assert.ok([...wet.x, ...wet.y].every(Number.isFinite))
})

test('flank delay separates the visible study-size coating and finishes draining', () => {
  const held = new CircleFluid()
  held.dots = held.dots.map((seat) => ({ ...seat, r: 16 }))
  held.target = held.dots[5]
  advance(held, 360) // The study's Test return collects for three physical seconds.
  const results = [
    [0, 0.2],
    [1, 0.2],
    [2, 0.2],
    [1, 0.8],
  ].map(([delay, sample]) => {
    const fluid = new CircleFluid()
    fluid.dots = held.dots.map((seat) => ({ ...seat }))
    for (const field of ['x', 'y', 'vx', 'vy'] as const) fluid[field].set(held[field])
    fluid.releaseSideDelay = delay
    fluid.seatAdhesion = 1
    fluid.target = fluid.dots[5]
    fluid.release(() => sample)
    // This mode changes wetting, without adding a rotational impulse.
    assert.deepEqual(fluid.vx, held.vx)
    assert.deepEqual(fluid.vy, held.vy)
    const seat = fluid.dots[5]
    const surface = new DensitySurface()
    const lastCovered = [0, 0]
    for (let step = 0; step < 960; step++) {
      fluid.step()
      if (step % 12 !== 0) continue
      surface.update(fluid)
      for (let flank = 0; flank < 2; flank++) {
        const sign = flank ? 1 : -1
        let density = 0
        for (const angle of [-0.15, 0, 0.15]) {
          const theta = Math.atan2(seat.y - 180, seat.x - 180) + Math.PI / 2 + angle
          const x = Math.round((seat.x + sign * Math.cos(theta) * (seat.r + 5)) / surface.cell)
          const y = Math.round((seat.y + sign * Math.sin(theta) * (seat.r + 5)) / surface.cell)
          density += surface.field[y * surface.size + x] / 3
        }
        if (density > 1) lastCovered[flank] = step / 120
      }
    }
    assert.equal(fluid.n, held.n)
    assert.ok([...fluid.x, ...fluid.y].every(Number.isFinite))
    assert.ok(Math.hypot(...fluid.metrics().centre.map((value) => value - 180)) < 2)
    surface.update(fluid)
    assert.equal(surface.loops.length, 1, 'the coating must drain rather than leave a stale arm')
    return lastCovered[0] - lastCovered[1]
  })
  assert.ok(Math.abs(results[0]) <= 0.3, 'zero adds no deliberate side delay')
  assert.ok(Math.abs(results[1]) >= 0.6, 'one-second wetting delay is clearly visible')
  assert.ok(
    Math.abs(results[2]) >= Math.abs(results[1]) + 0.4,
    'more delay increases visible separation',
  )
  assert.ok(results[1] * results[3] < 0, 'either flank can lead')
})

test('normal seat to cursor to outside motion preserves the two-flank release', () => {
  const fluid = new CircleFluid()
  fluid.dots = fluid.dots.map((seat) => ({ ...seat, r: 16 }))
  fluid.releaseSideDelay = 2
  fluid.seatAdhesion = 1
  fluid.setTarget(fluid.dots[5])
  advance(fluid, 360)
  fluid.setTarget({ x: 180, y: 320, r: 0 }, () => 0.2)
  advance(fluid, 6)
  fluid.setTarget(null, () => {
    throw new Error('a departing free cursor must not replace the released seat')
  })
  advance(fluid, 270)
  const surface = new DensitySurface()
  surface.update(fluid)
  const seat = fluid.dots[5]
  const sides = [-1, 1].map((sign) => {
    let density = 0
    for (const angle of [-0.15, 0, 0.15]) {
      const x = Math.round((seat.x + sign * Math.cos(angle) * (seat.r + 5)) / surface.cell)
      const y = Math.round((seat.y + Math.sin(angle) * (seat.r + 5)) / surface.cell)
      density += surface.field[y * surface.size + x] / 3
    }
    return density > 1
  })
  assert.notEqual(
    sides[0],
    sides[1],
    'the actual pointer exit must leave a visible wet/dry flank interval',
  )
  advance(fluid, 720)
  surface.update(fluid)
  assert.equal(surface.loops.length, 1)
  assert.ok(Math.hypot(...fluid.metrics().centre.map((value) => value - 180)) < 2)
})

test('selected material keeps real seat holes and returns after native-size pointer exits', () => {
  for (const radius of [16, (32 * 140) / 240]) {
    const fluid = createCircleFluid()
    fluid.dots = fluid.dots.map((seat) => ({ ...seat, r: radius }))
    const seat = fluid.dots[5]
    fluid.setTarget(seat)
    advance(fluid, 360)
    const surface = new DensitySurface()
    surface.update(fluid)
    assert.ok(
      surface.field[
        Math.round(seat.y / surface.cell) * surface.size + Math.round(seat.x / surface.cell)
      ] < 1,
    )
    const velocity = fluid.vx.slice()
    fluid.setTarget({ x: 180, y: 320, r: 0 }, () => 0.2)
    assert.deepEqual(fluid.vx, velocity, 'selected release adds no rotational kick')
    advance(fluid, 6)
    fluid.setTarget(null)
    advance(fluid, 1200)
    surface.update(fluid)
    assert.equal(surface.loops.length, 1)
    assert.ok(Math.hypot(...fluid.metrics().centre.map((value) => value - 180)) < 2)
  }
})
