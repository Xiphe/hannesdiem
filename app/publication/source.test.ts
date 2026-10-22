import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createContentSource, type SiteMetadata } from './index.ts'
import { documents as fixture } from '../../tests/host-fixture.ts'

test('prepared sources keep page content, metadata and revision in one snapshot', async () => {
  const documents = structuredClone(fixture)
  const first = createContentSource(documents, 'first')
  documents.fixture.content.title = 'Updated title'
  const site = documents._site.content.site as SiteMetadata
  site.navigation.sections[0].name = 'Updated navigation'
  const second = createContentSource(documents, 'second')
  const request = new Request('https://example.com/fixture')
  const [oldPage, newPage, missing] = await Promise.all([
    first(request),
    second(request),
    second(new Request('https://example.com/missing')),
  ])
  assert.equal(oldPage.document.content.title, 'Synthetic title')
  assert.equal(oldPage.site.navigation.sections[0].name, 'Fixture')
  assert.equal(oldPage.contentHash, 'first')
  assert.equal(newPage.document.content.title, 'Updated title')
  assert.equal(newPage.site.navigation.sections[0].name, 'Updated navigation')
  assert.equal(newPage.contentHash, 'second')
  assert.equal(missing.status, 404)
  assert.equal(missing.key, '404')
  assert.equal(missing.contentHash, 'second')
})
