import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createContentSource } from './index.ts'
import type { SiteMetadata } from '../../../contracts/content.ts'
import { documents as fixture } from '../../tests/host-fixture.ts'
import { createApp } from '../router.tsx'

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

test('inline asset data renders and supplies route SEO without a media registry entry', async () => {
  const documents = structuredClone(fixture)
  const image = {
    src: 'https://media.example.com/images/inline.webp',
    srcSet: 'https://media.example.com/images/inline.webp 400w',
    width: 400,
    height: 300,
    alt: 'Supplied alternative text',
    focalX: 20,
    focalY: 70,
  }
  const site = documents._site.content.site as SiteMetadata
  site.routes[0].image = image
  documents.fixture.content.default = {
    type: 'component',
    from: '@hannesdiem/content-components',
    import: 'Image',
    props: { image },
  }
  const app = createApp(createContentSource(documents))
  const response = await app.fetch('https://example.com/fixture')
  assert.equal(response.status, 200)
  const html = await response.text()
  assert.match(html, /src="https:\/\/media.example.com\/images\/inline.webp"/)
  assert.match(html, /srcset="https:\/\/media.example.com\/images\/inline.webp 400w"/)
  assert.match(html, /alt="Supplied alternative text"/)
  assert.match(html, /object-position:\s*20% 70%/)
  assert.match(
    html,
    /property="og:image" content="https:\/\/media.example.com\/images\/inline.webp"/,
  )
})
