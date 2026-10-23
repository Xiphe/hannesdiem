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
    storage: { directory, base: '/media' },
    sources: {},
  }
  const load = (input = bytes) =>
    imageLoader.load({ bytes: input, relativePath: 'image.jpg', options })
  return { options, directory, load }
}

test('images are auto-rotated into immutable WebP files without enlargement', async (t) => {
  const { directory, load } = await fixture(t)
  const image = await load()
  assert.equal(image.width, 40)
  assert.equal(image.height, 80)
  const output = await readFile(join(directory, 'images', basename(image.src)))
  const metadata = await sharp(output).metadata()
  assert.equal(metadata.format, 'webp')
  assert.equal(metadata.width, 40)
  assert.equal(metadata.height, 80)
  assert.ok(image.src.includes(createHash('sha256').update(output).digest('hex').slice(0, 16)))
  assert.equal(image.srcSet, `${image.src} 40w`)
})

test('responsive variants use the configured widths and stop at 2560px', async (t) => {
  const { options, directory, load } = await fixture(t)
  options.storage.base = 'https://media.example.com/nested'
  const bytes = await sharp({
    create: { width: 2700, height: 12, channels: 3, background: '#0000ff' },
  })
    .jpeg()
    .toBuffer()
  const image = await load(bytes)
  const widths = []
  for (const variant of image.srcSet.split(', ')) {
    const [src, descriptor] = variant.split(' ')
    assert.ok(src.startsWith(options.storage.base + '/images/'))
    const metadata = await sharp(join(directory, 'images', basename(src))).metadata()
    assert.equal(descriptor, `${metadata.width}w`)
    widths.push(metadata.width)
  }
  assert.deepEqual(widths, [320, 480, 960, 1440, 1920, 2560])
})

test('editorial metadata is preserved and palettes are extracted from the input bytes locally', async (t) => {
  const { options, load } = await fixture(t)
  options.sources['image.jpg'] = {
    alt: 'Supplied alternative text',
    focalX: 20,
    focalY: 70,
  }
  const image = await load()
  assert.equal(image.alt, 'Supplied alternative text')
  assert.equal(image.focalX, 20)
  assert.equal(image.focalY, 70)
  assert.match(image.color, /^#[a-f0-9]{6}$/)
  assert.ok(image.palette.length > 0)
  const blue = await sharp({
    create: { width: 80, height: 40, channels: 3, background: '#0044ff' },
  })
    .png()
    .toBuffer()
  const updated = await load(blue)
  assert.equal(updated.color, '#0044ff')
  assert.notDeepEqual(updated.palette, image.palette)
  const vibrant = updated.palette.find((swatch) => swatch.name === 'Vibrant')!
  assert.ok(vibrant.hsl[0] > 0.55 && vibrant.hsl[0] < 0.75)
  assert.ok(vibrant.hsl[1] > 0.8)
  assert.ok(vibrant.population >= 0)
})

test('WebP and AVIF inputs also return extracted palettes', async (t) => {
  const { load } = await fixture(t)
  for (const format of ['webp', 'avif'] as const) {
    const bytes = await sharp({
      create: { width: 40, height: 30, channels: 3, background: '#0044ff' },
    })
      .toFormat(format)
      .toBuffer()
    const image = await load(bytes)
    assert.match(image.color, /^#[a-f0-9]{6}$/)
    assert.ok(image.palette.some((swatch) => swatch.name === 'Vibrant'))
  }
})
