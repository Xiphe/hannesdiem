import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { test, type TestContext } from 'node:test'
import { createCmxAssetPipeline } from '@cmx-tools/assets'
import sharp from 'sharp'
import { imageLoader } from '../preparation/image-loader.ts'

async function fixture(t: TestContext) {
  const cwd = await mkdtemp(resolve('.generated/asset-test-'))
  t.after(() => rm(cwd, { recursive: true, force: true }))
  const bytes = await sharp({
    create: { width: 80, height: 40, channels: 3, background: '#ff8800' },
  })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer()
  await writeFile(join(cwd, 'image.jpg'), bytes)
  const options: Parameters<typeof imageLoader.load>[0]['options'] = {
    directory: join(cwd, 'output'),
    base: '/media',
    sources: {},
    palettes: {},
    processedPalettes: {},
  }
  let calls = 0
  const loader = {
    ...imageLoader,
    options,
    load(input: Parameters<typeof imageLoader.load>[0]) {
      calls++
      return imageLoader.load(input)
    },
  }
  const pipeline = () => createCmxAssetPipeline({ cwd, assets: { loaders: { image: loader } } })
  const load = async () =>
    (await pipeline().load('image.jpg')) as Awaited<ReturnType<typeof imageLoader.load>>
  return { cwd, bytes, options, loader, pipeline, load, calls: () => calls }
}

test('asset imports produce rotated, immutable WebP data and reuse the on-disk cache', async (t) => {
  const f = await fixture(t)
  const first = await f.load()
  assert.equal(first.width, 40)
  assert.equal(first.height, 80)
  assert.equal(first.sourceSha256, createHash('sha256').update(f.bytes).digest('hex'))
  const key = first.src.slice('/media/'.length)
  const bytes = await readFile(join(f.options.directory, key))
  const metadata = await sharp(bytes).metadata()
  assert.equal(metadata.format, 'webp')
  assert.equal(metadata.width, 40)
  assert.equal(metadata.height, 80)
  assert.ok(key.includes(createHash('sha256').update(bytes).digest('hex').slice(0, 16)))
  assert.deepEqual(await f.load(), first)
  assert.equal(f.calls(), 1)
})

test('source bytes, destination, metadata and loader version invalidate the asset cache', async (t) => {
  const f = await fixture(t)
  const first = await f.load()
  f.options.sources['image.jpg'] = {
    alt: 'Supplied alternative text',
    width: 80,
    height: 40,
    focalX: 20,
    focalY: 70,
  }
  f.options.palettes['image.jpg'] = { sha256: first.sourceSha256, color: '#ff8800', palette: [] }
  f.options.processedPalettes['image.jpg'] = { sha256: 'stale', color: '#000000', palette: [] }
  const annotated = await f.load()
  assert.equal(annotated.src, first.src)
  assert.equal(annotated.alt, 'Supplied alternative text')
  assert.equal(annotated.focalX, 20)
  assert.equal(annotated.color, '#ff8800')
  f.options.base = 'https://media.example.com/nested'
  const remote = await f.load()
  assert.match(remote.src, /^https:\/\/media.example.com\/nested\/images\//)
  f.options.directory = join(f.cwd, 'other-output')
  await f.load()
  f.loader.version += ':next'
  await f.load()
  const changed = await sharp({
    create: { width: 25, height: 20, channels: 3, background: '#0000ff' },
  })
    .jpeg()
    .toBuffer()
  await writeFile(join(f.cwd, 'image.jpg'), changed)
  const updated = await f.load()
  assert.notEqual(updated.src, remote.src)
  assert.equal(updated.width, 25)
  assert.equal(updated.color, undefined)
  assert.equal(f.calls(), 6)
})

test('generated image declarations typecheck without widening asset properties to any', async (t) => {
  const f = await fixture(t)
  const configPath = join(f.cwd, 'cmx.config.ts')
  await writeFile(
    configPath,
    `
    import { imageLoader } from ${JSON.stringify(resolve('content/preparation/image-loader.ts'))}
    export default { assets: { loaders: { image: { ...imageLoader, options: ${JSON.stringify(f.options)} } } } }
  `,
  )
  await writeFile(
    join(f.cwd, 'page.tsx'),
    `import image from './image.jpg'
     const width: number = image.width
     const src: string = image.src
     const alt: string | undefined = image.alt
     // @ts-expect-error Image URLs are strings, not numbers.
     const invalid: number = image.src
     export default { width, src, alt, invalid }`,
  )
  const generated = await f.pipeline().prepare({ entries: ['page.tsx'], configPath })
  assert.deepEqual(generated, [join(f.cwd, 'image.d.jpg.ts')])
  await writeFile(
    join(f.cwd, 'tsconfig.json'),
    JSON.stringify({
      extends: resolve('tsconfig.json'),
      include: ['page.tsx', 'cmx.config.ts'],
    }),
  )
  execFileSync('npx', ['--no-install', 'tsc', '--noEmit', '-p', join(f.cwd, 'tsconfig.json')], {
    stdio: 'pipe',
  })
})

test('loader failures reject asset loading and do not poison retries', async (t) => {
  const f = await fixture(t)
  const original = f.loader.load
  let fail = true
  f.loader.load = (input) => {
    if (fail) return Promise.reject(new Error('Storage unavailable'))
    return original(input)
  }
  const pipeline = f.pipeline()
  await assert.rejects(pipeline.load('image.jpg'), /Storage unavailable/)
  fail = false
  assert.ok(await pipeline.load('image.jpg'))
  await writeFile(join(f.cwd, 'image.jpg'), 'invalid image bytes')
  await assert.rejects(f.load(), /unsupported image format/)
})
