import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { CmxNode } from '@cmx-tools/contracts'
import { createContentSource } from '../app/document-host/index.ts'
import { createApp } from '../app/router.tsx'
import { documents } from './host-fixture.ts'
import { validatePublication } from '../../contracts/content.ts'

test('post share cards and unbranded overview cards keep separate images and preserve playback posters', async () => {
  const page = await createContentSource(documents)(new Request('https://example.com/fixture'))
  page.route = {
    path: '/temple-of-sound/watch',
    document: 'synthetic',
    title: 'Synthetic Temple',
    kind: 'temple',
  }
  page.document.content.default = {
    type: 'component',
    from: '@hannesdiem/content-components',
    import: 'TemplePosts',
    props: {
      posts: [
        {
          id: 'synthetic-post',
          title: 'Synthetic complete title',
          shareTitle: 'Synthetic share title',
          kind: 'video',
          postedAt: '2030-01-01T00:00:00Z',
          customerCode: 'fixture',
          videoId: 'synthetic',
          cover: { src: 'https://images.example.com/poster.jpg', width: 600, height: 900 },
          shareImage: {
            src: 'https://images.example.com/share.jpg',
            width: 1200,
            height: 630,
            alt: 'Synthetic share title',
          },
          previewImage: {
            src: 'https://images.example.com/preview.jpg',
            width: 1200,
            height: 630,
          },
        },
      ],
    },
  } satisfies CmxNode
  const app = createApp(async () => page)
  const feed = await (
    await app.fetch('https://example.com/temple-of-sound/watch/synthetic-post')
  ).text()
  assert.match(feed, /property="og:image" content="https:\/\/images.example.com\/share.jpg"/)
  assert.match(feed, /property="og:title" content="Synthetic share title"/)
  assert.match(
    feed,
    /rel="canonical" href="https:\/\/hannesdiem.de\/temple-of-sound\/watch\/synthetic-post"/,
  )
  assert.match(feed, /https:\/\/images.example.com\/poster.jpg/)
  const overview = await (await app.fetch('https://example.com/temple-of-sound/watch')).text()
  assert.match(overview, /src="https:\/\/images.example.com\/preview.jpg"/)
  assert.doesNotMatch(overview, /src="https:\/\/images.example.com\/share.jpg"/)
  assert.match(overview, /aria-label="Synthetic complete title"/)
  assert.doesNotMatch(overview, /class="temple-post-preview-title"/)
})

test('verse queries select server metadata and canonical identity while retaining the complete page', async () => {
  const fixtures = structuredClone(documents)
  fixtures['temple-of-sound'].content.title = 'Synthetic Temple'
  fixtures['temple-of-sound'].content.default = 'Complete synthetic poem body'
  fixtures['temple-of-sound'].content.metadata = {
    kind: 'temple',
    ogImage: { src: 'https://images.example.com/temple.jpg', width: 1200, height: 630 },
    verseShares: {
      'synthetic opening': {
        title: 'Synthetic opening',
        ogImage: { src: 'https://images.example.com/opening.jpg', width: 1200, height: 630 },
      },
      'synthetic ending': {
        title: 'Synthetic ending',
        ogImage: { src: 'https://images.example.com/ending.jpg', width: 1200, height: 630 },
      },
    },
  }
  const app = createApp(createContentSource(fixtures))
  for (const [query, title, image, canonical] of [
    [
      '?verse=Synthetic+Opening&notice=transient',
      'Synthetic opening',
      'opening',
      '?verse=synthetic%20opening',
    ],
    ['?verse=synthetic%20ending', 'Synthetic ending', 'ending', '?verse=synthetic%20ending'],
    ['?verse=unrecognized&notice=transient', 'Synthetic Temple', 'temple', ''],
  ]) {
    const response = await app.fetch(`https://example.com/temple-of-sound${query}`)
    assert.equal(response.status, 200)
    const html = await response.text()
    assert.ok(html.includes(`property="og:title" content="${title}"`))
    assert.ok(
      html.includes(`property="og:image" content="https://images.example.com/${image}.jpg"`),
    )
    assert.ok(
      html.includes(`rel="canonical" href="https://hannesdiem.de/temple-of-sound${canonical}"`),
    )
    assert.ok(
      html.includes(
        `property="og:url" content="https://hannesdiem.de/temple-of-sound${canonical}"`,
      ),
    )
    assert.match(html, /Complete synthetic poem body/)
  }
  assert.equal(
    (fixtures['temple-of-sound'].content.metadata as any).ogImage.src,
    'https://images.example.com/temple.jpg',
  )
})

test('invalid verse share metadata cannot enter a Publication', () => {
  for (const verseShares of [
    { 'Synthetic opening': { title: 'Synthetic title' } },
    { 'synthetic opening': { title: ' ' } },
    {
      'synthetic opening': {
        title: 'Synthetic title',
        ogImage: { src: 'javascript:fixture', width: 1200, height: 630 },
      },
    },
  ]) {
    const fixtures = structuredClone(documents)
    fixtures['temple-of-sound'].content.metadata = { kind: 'temple', verseShares }
    assert.throws(() => validatePublication(fixtures), /Invalid or duplicate content route/)
  }
})
