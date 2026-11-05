import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'
import { CMX_DOCUMENT_SCHEMA, CMX_DOCUMENT_VERSION, type CmxDocument } from '@cmx-tools/contracts'
import { renderTempleShareImage, templeCard } from '../preparation/temple-share-image.ts'
import { prepareTempleShareImages } from '../preparation/temple-share-images.ts'
import { templeSharePattern } from '../preparation/temple-share-pattern.ts'
import { renderTempleOpenerShareImage } from '../preparation/temple-opener-share.ts'

test('short and long titles keep all glyphs inside a fixed caption area, shrinking only the title', async () => {
  const short = await renderTempleShareImage({ title: 'Synthetic title' })
  const long = await renderTempleShareImage({ title: 'Synthetic title '.repeat(12) })
  assert.ok(short.layout.titleSize > 90)
  assert.ok(short.layout.titleSize <= templeCard.maxTitleSize)
  assert.equal(short.layout.titleText, 'Synthetic title')
  assert.equal(short.layout.titleTruncated, false)
  assert.ok(long.layout.titleSize < short.layout.titleSize)
  assert.ok(long.layout.titleSize >= templeCard.minTitleSize)
  for (const card of [short, long]) {
    assert.ok(card.layout.captionTop >= templeCard.captionTop)
    assert.equal(card.layout.titleTop + card.layout.titleHeight, 630 - templeCard.bottom)
    const image = await sharp(card.bytes).metadata()
    assert.equal(image.format, 'jpeg')
    assert.equal(image.width, 1200)
    assert.equal(image.height, 630)
  }
  await assert.rejects(renderTempleShareImage({ title: ' ' }), /nonempty title/)
  await renderTempleShareImage({ title: '<Fixture> & “Grüße” — punctuation, not markup' })
})

test('overflow titles trim to a fitting prefix with three dots at the minimum size', async () => {
  for (const title of ['Synthetic title '.repeat(100), 'e\u0301'.repeat(1000)]) {
    const card = await renderTempleShareImage({ title })
    const { layout } = card
    assert.equal(layout.titleTruncated, true)
    assert.equal(layout.titleSize, templeCard.minTitleSize)
    assert.ok(layout.captionTop >= templeCard.captionTop)
    assert.equal(layout.titleTop + layout.titleHeight, templeCard.height - templeCard.bottom)
    assert.ok(layout.titleText.endsWith('...'))
    const prefix = layout.titleText.slice(0, -3)
    assert.ok(prefix.length > 0 && prefix.length < title.length)
    assert.ok(title.startsWith(prefix))
    if (title.startsWith('Synthetic')) assert.match(prefix, /(?:Synthetic|title)$/)
    else assert.equal(prefix, 'e\u0301'.repeat(prefix.length / 2))
  }
})

test('background brightness can extend a straight fade across the whole image', async () => {
  const dark = await renderTempleShareImage({
    title: 'Synthetic title',
    backgroundColor: '#000000',
  })
  const light = await renderTempleShareImage({
    title: 'Synthetic title',
    backgroundColor: '#ffffff',
  })
  assert.equal(dark.layout.gradient.topOpacity, 0)
  assert.ok(dark.layout.gradient.startY > 0)
  assert.ok(light.layout.gradient.startY < 0)
  assert.ok(light.layout.gradient.topOpacity > 0)
  const { data, info } = await sharp(light.bytes)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const sample = (y: number) => data[(y * info.width + 1190) * 3]
  // A synthetic white background exposes the actual fade, clear of all glyphs.
  assert.ok(Math.abs(sample(315) - (sample(0) + sample(629)) / 2) <= 2)
})

test('fragment share patterns are stable per identity and vary between identities', async () => {
  const first = templeSharePattern('synthetic-first')
  assert.deepEqual(first, templeSharePattern('synthetic-first'))
  assert.notDeepEqual(first, templeSharePattern('synthetic-second'))
  const card = await renderTempleShareImage({
    title: 'Synthetic identity',
    background: first,
    showWordmark: false,
  })
  assert.equal(card.layout.titleText, 'Synthetic identity')
  assert.ok(card.layout.titleSize > 90)
  assert.equal(card.layout.captionTop, card.layout.titleTop)
  assert.equal((await sharp(card.bytes).metadata()).height, 630)
})

test('poem cards retain explicit lines and fit each native typeface independently', async () => {
  const lines = [
    { text: 'Synthetic opening line with more words than the emphasized line' },
    { text: 'Synthetic emphasis', face: 'cinzel' as const },
  ]
  const card = await renderTempleShareImage({
    title: lines.map((line) => line.text).join(' '),
    lines,
  })
  assert.equal(card.layout.titleText, lines.map((line) => line.text).join('\n'))
  assert.equal(card.layout.titleLines, 2)
  assert.equal(card.layout.titleTruncated, false)
  assert.ok(card.layout.titleLineSizes[1] > card.layout.titleLineSizes[0])
  assert.ok(card.layout.captionTop >= templeCard.captionTop)
  await renderTempleShareImage({
    title: 'Synthetic typography',
    lines: [
      { text: 'S Y N T H E T I C', face: 'spaced' },
      { text: 'Synthetic bold', face: 'germania' },
    ],
  })
})

test('opener cards compose a supplied frame with the authored calendar range', async () => {
  const frame = await sharp({
    create: { width: 1200, height: 630, channels: 3, background: '#302018' },
  })
    .png()
    .toBuffer()
  const card = await renderTempleOpenerShareImage(frame, { start: '2030-03-01', end: '2030-04-20' })
  assert.equal(card.date, 'March & April 2030')
  assert.equal((await sharp(card.bytes).metadata()).width, 1200)
  const next = await renderTempleOpenerShareImage(frame, { start: '2031-03-01', end: '2031-04-20' })
  assert.notDeepEqual(card.bytes, next.bytes)
})

function document(
  content: CmxDocument['content'],
  slots: (string | number)[][] = [[]],
): CmxDocument {
  return {
    $schema: CMX_DOCUMENT_SCHEMA,
    cmxVersion: CMX_DOCUMENT_VERSION,
    interface: { imports: {}, exports: { default: { slots } } },
    content,
  }
}

function fixtures() {
  const collection = {
    type: 'component' as const,
    from: '@hannesdiem/content-components',
    import: 'TemplePosts',
    props: {
      posts: [
        {
          id: 'sample-video',
          kind: 'video',
          title: 'Synthetic recording',
          customerCode: 'fixture',
          videoId: 'sample',
          postedAt: '2030-01-01T00:00:00Z',
          children: 'Synthetic description',
        },
        {
          id: 'sample-text',
          kind: 'text',
          title: 'Synthetic text '.repeat(100),
          shareTitle: 'Short synthetic card title',
          body: 'Synthetic body',
          postedAt: '2030-01-02T00:00:00Z',
        },
        {
          id: 'custom',
          kind: 'audio',
          title: 'Custom synthetic card',
          shareImage: { src: 'https://example.invalid/custom.jpg', width: 1200, height: 630 },
          postedAt: '2030-01-03T00:00:00Z',
        },
        {
          id: 'automatic-overflow',
          kind: 'text',
          title: 'Synthetic overflow '.repeat(100),
          postedAt: '2030-01-04T00:00:00Z',
        },
      ],
    },
    slots: [
      ['posts', 0, 'children'],
      ['posts', 1, 'body'],
    ],
  }
  return {
    _site: document(
      {
        site: {
          version: 2,
          media: {},
          navigation: { sections: [], legal: { name: 'Legal', items: [] }, social: [], listen: [] },
        },
      },
      [],
    ),
    root: document({
      default: {
        type: 'component',
        from: '@hannesdiem/content-components',
        import: 'PoemOpening',
        props: { facts: [{ after: collection }] },
        slots: [['facts', 0, 'after']],
      },
    }),
    watch: document({ default: collection }),
  }
}

test('publication uses CMX slots, deduplicates cards, retains rich content and honors overrides', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'temple-share-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const source = fixtures()
  const before = structuredClone(source)
  const beforePosts = (
    before.watch.content.default as { props: { posts: Record<string, unknown>[] } }
  ).props.posts
  const input = await sharp({
    create: { width: 70, height: 90, channels: 3, background: '#fefefe' },
  })
    .png()
    .toBuffer()
  let requests = 0
  const result = await prepareTempleShareImages(source, { base: '/media', directory }, async () => {
    requests++
    return new Response(input)
  })
  const node = result.watch.content.default as { props: { posts: Record<string, any>[] } }
  const posts = node.props.posts
  assert.deepEqual(source, before)
  assert.equal(requests, 1)
  assert.match(posts[0].shareImage.src, /^\/media\/og\/temple-[a-f0-9]{16}\.jpg$/)
  assert.match(posts[0].previewImage.src, /^\/media\/og\/temple-[a-f0-9]{16}\.jpg$/)
  assert.notEqual(posts[0].previewImage.src, posts[0].shareImage.src)
  assert.equal(posts[0].cover, undefined)
  assert.equal(posts[0].children, 'Synthetic description')
  assert.equal(posts[1].title, beforePosts[1].title)
  assert.equal(posts[1].shareImage.alt, 'Short synthetic card title')
  assert.deepEqual(posts[2].shareImage, beforePosts[2].shareImage)
  assert.ok(posts[2].previewImage)
  assert.equal(posts[3].title, beforePosts[3].title)
  assert.equal(posts[3].shareImage.alt, beforePosts[3].title)
  assert.equal(posts[3].shareTitle, undefined)
  const nested = result.root.content.default as { props: { facts: { after: typeof node }[] } }
  assert.deepEqual(nested.props.facts[0].after.props.posts[0].shareImage, posts[0].shareImage)
  assert.deepEqual(nested.props.facts[0].after.props.posts[0].previewImage, posts[0].previewImage)
  const bytes = await readFile(join(directory, posts[0].shareImage.src.slice('/media/'.length)))
  assert.equal((await sharp(bytes).metadata()).width, 1200)
})

test('an unavailable poster stops preparation instead of publishing a broken card', async () => {
  await assert.rejects(
    prepareTempleShareImages(
      fixtures(),
      { base: '/media', directory: '/unused' },
      async () => new Response(null, { status: 503 }),
    ),
    /Temple cover request failed \(503\)/,
  )
})

test('Temple page and verse cards attach to existing metadata without fetching photographs', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'temple-verse-share-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const source = {
    _site: fixtures()._site,
    'synthetic-temple': document(
      {
        title: 'Synthetic Temple',
        default: 'Complete synthetic poem',
        metadata: {
          kind: 'temple',
          image: { src: 'https://example.invalid/unrequested.jpg', width: 600, height: 900 },
          verseShares: {
            'synthetic opening': {
              title: 'Synthetic opening',
              lines: [{ text: 'Synthetic' }, { text: 'opening', face: 'cinzel' }],
            },
            'synthetic ending': { title: 'Synthetic ending' },
          },
        },
      },
      [],
    ),
    'synthetic-section': document(
      {
        title: 'Synthetic Temple',
        default: 'Complete synthetic practical page',
        metadata: { kind: 'temple', ogTitle: 'Synthetic section' },
      },
      [],
    ),
  }
  const before = structuredClone(source)
  const result = await prepareTempleShareImages(source, { base: '/media', directory }, async () => {
    throw new Error('Text-only cards must not fetch photographs')
  })
  assert.deepEqual(source, before)
  assert.equal(result['synthetic-temple'].content.default, 'Complete synthetic poem')
  const metadata = result['synthetic-temple'].content.metadata as any
  const section = result['synthetic-section'].content.metadata as any
  const cards = [
    metadata.ogImage,
    section.ogImage,
    ...Object.values(metadata.verseShares).map((verse: any) => verse.ogImage),
  ]
  assert.equal(new Set(cards.map((card) => card.src)).size, 4)
  assert.equal(metadata.verseShares['synthetic opening'].title, 'Synthetic opening')
  assert.equal(section.ogTitle, 'Synthetic section')
  for (const card of cards) {
    const bytes = await readFile(join(directory, card.src.slice('/media/'.length)))
    assert.equal((await sharp(bytes).metadata()).width, 1200)
  }
})

test('publication uses the supplied opener frame and derived date for the main card', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'temple-opener-share-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const frame = await sharp({
    create: { width: 1200, height: 630, channels: 3, background: '#102030' },
  })
    .png()
    .toBuffer()
  const source = {
    _site: fixtures()._site,
    'synthetic-opener': document(
      {
        title: 'Synthetic opener',
        default: 'Synthetic body',
        metadata: {
          kind: 'temple',
          openerShare: {
            frame: { src: 'https://example.invalid/opener.png', width: 1200, height: 630 },
            dates: { start: '2030-03-01', end: '2030-04-20' },
          },
        },
      },
      [],
    ),
  }
  const result = await prepareTempleShareImages(
    source,
    { base: '/media', directory },
    async () => new Response(frame),
  )
  const metadata = result['synthetic-opener'].content.metadata as any
  assert.equal(metadata.ogImage.alt, 'Synthetic opener — March & April 2030')
  assert.equal(metadata.ogImage.width, 1200)
  assert.equal(result['synthetic-opener'].content.default, 'Synthetic body')
})
