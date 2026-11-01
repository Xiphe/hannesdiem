import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  generateFragments,
  assembleBorder,
  piecesOverlap,
} from '../app/temple/fragment-button/fragment-generator.ts'

test('a seed reproduces a batch, while other seeds produce new geometry', () => {
  const first = generateFragments('batch-a', 8)
  assert.deepEqual(first, generateFragments('batch-a', 8))
  assert.notDeepEqual(
    first.map((p) => p.d),
    generateFragments('batch-b', 8).map((p) => p.d),
  )
  assert.equal(new Set(first.map((p) => p.d)).size, 8)
})

test('assembly preserves pieces while mixing joined edges and separate fragments', () => {
  for (let seed = 0; seed < 100; seed++)
    for (const count of [4, 8, 12]) {
      const pieces = generateFragments(String(seed), count)
      const options = { width: 260, height: 64, overlap: 0.3, seed: String(seed) }
      const result = assembleBorder(pieces, options)
      assert.deepEqual(
        result.map((p) => [p.d, p.size]),
        pieces.map((p) => [p.d, p.size]),
      )
      assert.deepEqual(result, assembleBorder(pieces, options))
      for (const p of result) {
        assert.ok([p.x, p.y, p.angle, p.size].every(Number.isFinite))
        assert.ok(Math.abs(p.x) >= 114 || Math.abs(p.y) >= 16)
      }
      // Actual ink connectivity: neither a single snake nor eight isolated dots.
      const seen = new Set<number>()
      const visit = (i: number) => {
        seen.add(i)
        for (let j = 0; j < count; j++)
          if (!seen.has(j) && piecesOverlap(result[i], result[j])) visit(j)
      }
      let components = 0
      for (let i = 0; i < count; i++)
        if (!seen.has(i)) {
          components++
          visit(i)
        }
      assert.ok(components > 1, `One continuous chain: seed${seed}`)
      if (count >= 8) assert.ok(components < count, `No shared edges: seed${seed}`)
    }
})

test('empty and single-piece assemblies stay usable', () => {
  assert.deepEqual(assembleBorder([], { width: 240, height: 64, overlap: 0.3, seed: 'empty' }), [])
  assert.equal(
    assembleBorder(generateFragments('one', 1), {
      width: 240,
      height: 64,
      overlap: 0.3,
      seed: 'one',
    }).length,
    1,
  )
})

test('assembly preserves manually edited sizes', () => {
  const original = generateFragments('manual', 8)
  original[0].size = 130
  original[1].size = 20
  const result = assembleBorder(original, { width: 260, height: 64, overlap: 0.3, seed: 'manual' })
  assert.deepEqual(
    result.map((p) => p.size),
    original.map((p) => p.size),
  )
})

test('generated sizes stay within a moderate range', () => {
  for (let seed = 0; seed < 100; seed++)
    for (const piece of generateFragments(String(seed), 12))
      assert.ok(piece.size >= 44 && piece.size <= 80)
})
