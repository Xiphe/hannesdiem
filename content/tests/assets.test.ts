import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { test, type TestContext } from 'node:test'
import sharp from 'sharp'
import { imageLoader } from '../preparation/image-loader.ts'

async function fixture(t: TestContext) {
  const directory = await mkdtemp(join(tmpdir(), 'hannesdiem-image-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const bytes = await sharp({
    create: { width: 80, height: 40, channels: 3, background: '#ff8800' },
  })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer()
  const options: Parameters<typeof imageLoader.load>[0]['options'] = {
    directory,
    base: '/media',
    sources: {},
    palettes: {},
    processedPalettes: {},
  }
  const load = (input = bytes) =>
    imageLoader.load({ bytes: input, relativePath: 'image.jpg', options })
  return { bytes, options, load }
}

test('images are auto-rotated into immutable WebP files without enlargement', async (t) => {
  const { bytes, options, load } = await fixture(t)
  const image = await load()
  assert.equal(image.width, 40)
  assert.equal(image.height, 80)
  assert.equal(image.sourceSha256, createHash('sha256').update(bytes).digest('hex'))
  const output = await readFile(join(options.directory, 'images', basename(image.src)))
  const metadata = await sharp(output).metadata()
  assert.equal(metadata.format, 'webp')
  assert.equal(metadata.width, 40)
  assert.equal(metadata.height, 80)
  assert.ok(image.src.includes(createHash('sha256').update(output).digest('hex').slice(0, 16)))
  assert.equal(image.srcSet, `${image.src} 40w`)
})

test('responsive variants use the configured widths and stop at 2560px', async (t) => {
  const { options, load } = await fixture(t)
  options.base = 'https://media.example.com/nested'
  const bytes = await sharp({
    create: { width: 2700, height: 12, channels: 3, background: '#0000ff' },
  })
    .jpeg()
    .toBuffer()
  const image = await load(bytes)
  const widths = []
  for (const variant of image.srcSet.split(', ')) {
    const [src, descriptor] = variant.split(' ')
    assert.ok(src.startsWith(options.base + '/images/'))
    const metadata = await sharp(join(options.directory, 'images', basename(src))).metadata()
    assert.equal(descriptor, `${metadata.width}w`)
    widths.push(metadata.width)
  }
  assert.deepEqual(widths, [320, 480, 960, 1440, 1920, 2560])
})

test('editorial metadata is preserved and palettes must match the original bytes', async (t) => {
  const { bytes, options, load } = await fixture(t)
  const sha256 = createHash('sha256').update(bytes).digest('hex')
  options.sources['image.jpg'] = {
    alt: 'Supplied alternative text',
    width: 80,
    height: 40,
    focalX: 20,
    focalY: 70,
  }
  options.palettes['image.jpg'] = { sha256, color: '#ff8800', palette: [] }
  options.processedPalettes['image.jpg'] = { sha256: 'stale', color: '#000000', palette: [] }
  const image = await load()
  assert.equal(image.alt, 'Supplied alternative text')
  assert.equal(image.focalX, 20)
  assert.equal(image.focalY, 70)
  assert.equal(image.color, '#ff8800')
  options.processedPalettes['image.jpg'] = { sha256, color: '#ff9900', palette: [] }
  assert.equal((await load()).color, '#ff9900')
  options.palettes = {}
  options.processedPalettes['image.jpg'].sha256 = 'stale'
  assert.equal((await load()).color, undefined)
})
