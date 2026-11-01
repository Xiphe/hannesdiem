import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generateFragments } from '../app/temple/fragment-button/fragment-generator.ts'
import { createFragmentBurst, burstFragment } from '../app/temple/fragment-button/fragment-burst.ts'

test('a click scatters the same pieces in every quadrant, then zooms them into the live border', () => {
  const pieces = generateFragments('synthetic-burst', 8)
  const burst = createFragmentBurst(pieces, 900, 'click-one')
  const quadrants = new Set(burst.flights.map((f) => `${Math.sign(f.dx)},${Math.sign(f.dy)}`))
  assert.equal(quadrants.size, 4)
  burst.flights.forEach((flight, i) => {
    const start = burstFragment(flight, 0, pieces[i])
    assert.deepEqual(start.piece, pieces[i])
    assert.equal(start.opacity, 1)
    const flying = burstFragment(flight, flight.duration / 2, pieces[i])
    assert.ok(Math.hypot(flying.piece.x - pieces[i].x, flying.piece.y - pieces[i].y) > 100)
    assert.equal(flying.piece.d, pieces[i].d)
    assert.equal(flying.piece.size, pieces[i].size)
    // Return at a new live location, rather than playing the flight backwards.
    const live = { ...pieces[i], x: pieces[i].x + 40 }
    const absent = burstFragment(flight, flight.duration, live)
    assert.equal(absent.opacity, 1)
    assert.equal(absent.piece.size, 0)
    assert.equal(absent.piece.x, live.x)
    const returning = burstFragment(flight, flight.returnAt + flight.returnDuration / 2, live)
    assert.equal(returning.opacity, 1)
    assert.ok(returning.piece.size > 0 && returning.piece.size < live.size)
    assert.equal(returning.piece.x, live.x)
    assert.deepEqual(burstFragment(flight, burst.end, live).piece, live)
    assert.equal(burstFragment(flight, burst.end, live).opacity, 1)
  })
})

test('reduced motion keeps a short opacity response without travel or spin', () => {
  const pieces = generateFragments('reduced', 4)
  const burst = createFragmentBurst(pieces, 900, 'click', true)
  burst.flights.forEach((flight, i) => {
    const middle = burstFragment(flight, flight.duration / 2, pieces[i])
    assert.deepEqual(middle.piece, pieces[i])
    assert.ok(middle.opacity < 1)
    assert.equal(burstFragment(flight, burst.end, pieces[i]).opacity, 1)
  })
})
