import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createContentSource } from './index.ts'
import { validatePublication, type SiteMetadata } from '../../../contracts/content.ts'
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
  assert.equal(missing.key, '_404')
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
  documents.fixture.content.metadata = { image }
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

test('published document names drive routes, sitemap, metadata and private-file exclusion', async () => {
  const documents = structuredClone(fixture)
  documents['collection/index'] = structuredClone(documents.fixture)
  documents['collection/index'].content.metadata = {
    title: 'Collection title',
    description: 'Collection description',
    ogImage: { src: 'https://media.example.com/card.jpg', width: 100, height: 50 },
  }
  documents['song/example'] = structuredClone(documents.fixture)
  documents['song/example'].content.metadata = { kind: 'song' }
  documents._helper = structuredClone(documents.fixture)
  documents['nested/_private/page'] = structuredClone(documents.fixture)
  const app = createApp(createContentSource(documents))
  const response = await app.fetch('https://example.com/collection')
  assert.equal(response.status, 200)
  const html = await response.text()
  assert.match(html, /Collection title/)
  assert.match(html, /Collection description/)
  assert.match(html, /https:\/\/media.example.com\/card.jpg/)
  const sitemap = await (await app.fetch('https://example.com/sitemap.xml')).text()
  assert.match(sitemap, /https:\/\/hannesdiem.de\/collection</)
  assert.match(sitemap, /https:\/\/hannesdiem.de\/song\/example</)
  assert.doesNotMatch(sitemap, /_helper|_private|_404|\/collection\/index/)
  for (const path of ['/_helper', '/nested/_private/page', '/_404', '/collection/index']) {
    assert.equal((await app.fetch('https://example.com' + path)).status, 404)
  }
})

test('publication validation rejects conflicting URLs and metadata that overrides routing', () => {
  const duplicate = structuredClone(fixture)
  duplicate['fixture/index'] = structuredClone(duplicate.fixture)
  assert.throws(() => validatePublication(duplicate), /duplicate content route/)
  for (const metadata of [{ path: '/override' }, { document: 'other' }, 'invalid']) {
    const documents = structuredClone(fixture)
    documents.fixture.content.metadata = metadata
    assert.throws(() => validatePublication(documents), /Invalid page metadata/)
  }
  const reserved = structuredClone(fixture)
  reserved.login = structuredClone(reserved.fixture)
  assert.throws(() => validatePublication(reserved), /Invalid or duplicate content route/)
  const invalidSite = structuredClone(fixture)
  ;(invalidSite._site.content.site as unknown as Record<string, unknown>).routes = []
  assert.throws(() => validatePublication(invalidSite), /Invalid site metadata/)
})

test('legacy publications remain readable while the new website rolls out', async () => {
  const documents = structuredClone(fixture)
  const publication = validatePublication(documents)
  documents['404'] = documents._404
  delete documents._404
  documents._site.content.site = {
    ...publication.site,
    version: 1,
    redirects: publication.redirects,
    routes: publication.routes.map((route) => ({
      ...route,
      path: route.path === '/fixture' ? '/old-url' : route.path,
    })),
    shareImages: {
      '/old-url': { src: 'https://media.example.com/legacy.jpg', width: 100, height: 50 },
    },
  }
  const app = createApp(createContentSource(documents))
  const response = await app.fetch('https://example.com/old-url')
  assert.equal(response.status, 200)
  assert.match(await response.text(), /https:\/\/media.example.com\/legacy.jpg/)
  assert.equal((await app.fetch('https://example.com/fixture')).status, 404)
})

test('collection navigation reads the same publication without a generated global list', async () => {
  const documents = structuredClone(fixture)
  const site = documents._site.content.site as SiteMetadata
  site.navigation.sections = [{ name: 'Work', collection: 'release', items: [] }]
  const addRelease = (key: string, title: string, date: string) => {
    documents[key] = structuredClone(documents.fixture)
    documents[key].content.metadata = { kind: 'release', title, releaseDate: date }
  }
  addRelease('earlier', 'Earlier release', '2020-01-01')
  const first = createApp(createContentSource(documents))
  addRelease('later', 'Later release', '2021-01-01')
  const second = createApp(createContentSource(documents))
  const firstHtml = await (await first.fetch('https://example.com/fixture')).text()
  const secondHtml = await (await second.fetch('https://example.com/fixture')).text()
  assert.match(firstHtml, /Earlier release/)
  assert.doesNotMatch(firstHtml, /Later release/)
  assert.ok(secondHtml.indexOf('Later release') < secondHtml.indexOf('Earlier release'))
  assert.deepEqual(site.navigation.sections[0].items, [])
})
