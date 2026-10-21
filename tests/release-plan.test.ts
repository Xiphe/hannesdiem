import assert from 'node:assert/strict'
import { test } from 'node:test'
import { releaseChanges } from '../scripts/release-plan.ts'

test('ordinary CMS changes never select website deployment', () => {
  assert.deepEqual(
    releaseChanges([
      'content/pages/releases/album.tsx',
      'content/routes.ts',
      'content/navigation.ts',
      'content/media/cover.jpg',
      'scripts/build-og.ts',
    ]),
    { website: false, content: true },
  )
})
test('mixed changes and shared contracts release code and content', () => {
  for (const paths of [
    ['app/content-components.tsx', 'content/pages/about.tsx'],
    ['content/contract/index.d.ts'],
    ['package-lock.json'],
    ['cmx.config.ts'],
  ]) {
    assert.deepEqual(releaseChanges(paths), { website: true, content: true })
  }
  assert.deepEqual(releaseChanges(['app/style.css']), { website: true, content: false })
  assert.deepEqual(releaseChanges(['README.md', 'docs/content-publishing.md']), {
    website: false,
    content: false,
  })
})
