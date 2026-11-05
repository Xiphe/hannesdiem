import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { CmxNode } from '@cmx-tools/contracts'
import { createContentSource } from '../app/document-host/index.ts'
import { createApp } from '../app/router.tsx'
import { documents } from './host-fixture.ts'

test('post share cards reach server-rendered metadata and overview links without replacing playback posters', async () => {
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
  assert.match(overview, /src="https:\/\/images.example.com\/share.jpg"/)
  assert.match(overview, /aria-label="Synthetic complete title"/)
  assert.doesNotMatch(overview, /class="temple-post-preview-title"/)
})
