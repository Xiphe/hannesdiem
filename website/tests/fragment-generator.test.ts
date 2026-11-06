import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generateFragments } from '../../contracts/temple/fragments.ts'

test('a seed reproduces a batch, while other seeds produce new geometry', () => {
  const first = generateFragments('batch-a', 8)
  assert.deepEqual(first, generateFragments('batch-a', 8))
  assert.notDeepEqual(
    first.map((p) => p.d),
    generateFragments('batch-b', 8).map((p) => p.d),
  )
  assert.equal(new Set(first.map((p) => p.d)).size, 8)
})

test('generated sizes stay within a moderate range', () => {
  for (let seed = 0; seed < 100; seed++)
    for (const piece of generateFragments(String(seed), 12))
      assert.ok(piece.size >= 44 && piece.size <= 80)
})
