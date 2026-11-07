import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createClosingPace } from '../closing-pace.ts'

test('closing time eases in, slows the ground further, then releases both clocks continuously', () => {
  const pace = createClosingPace(1000, 3000, 1000, 3, 2700)
  const rate = (at: number, clock: (scroll: number) => number) => (clock(at + 10) - clock(at)) / 10
  assert.equal(pace.sceneAt(900), 900)
  assert.ok(rate(1000, pace.sceneAt) > rate(1100, pace.sceneAt))
  assert.ok(rate(1100, pace.sceneAt) > rate(1250, pace.sceneAt))
  assert.ok(Math.abs(rate(2000, pace.sceneAt) - 1 / 3) < 1e-10)
  const rampEnd = pace.points.at(-2)!.scroll
  const remaining = pace.groundStop - rampEnd
  const speeds = [0.25, 0.5, 0.75].map((fraction) =>
    pace.groundRateAt(rampEnd + remaining * fraction),
  )
  assert.ok(speeds[0] > speeds[1] && speeds[1] > speeds[2])
  assert.ok(Math.abs(speeds[0] - speeds[1] - (speeds[1] - speeds[2])) < 0.01)
  assert.equal(pace.groundAt(pace.groundStop + 1), pace.groundAt(pace.complete - 1))
  assert.equal(pace.groundRateAt(pace.complete - 1), 0)
  for (const clock of [pace.sceneAt, pace.groundAt, pace.travelAt]) {
    assert.ok(Math.abs(clock(pace.complete + 120) - clock(pace.complete) - 120) < 1e-10)
    assert.ok(Math.abs(clock(pace.complete + 0.001) - clock(pace.complete)) < 0.002)
  }
  assert.ok(Math.abs(pace.sceneAt(pace.map(2400)) - 2400) < 1e-10)
  const assembly = pace.map(2700)
  const before = assembly - 150
  assert.ok(Math.abs(rate(before - 20, pace.travelAt) - 1 / 3) < 1e-10)
  assert.ok(rate(before + 20, pace.travelAt) > rate(assembly - 30, pace.travelAt))
  assert.ok(
    Math.abs(rate(assembly + 20, pace.travelAt) - rate(assembly + 20, pace.groundAt)) < 1e-10,
  )
  assert.ok(rate(assembly + 20, pace.groundAt) > 0)
  assert.equal(pace.travelAt(pace.groundStop + 1), pace.travelAt(pace.complete - 1))
  assert.ok(Math.abs(pace.complete - pace.travelAt(pace.complete) - pace.extra) < 1e-10)
})
