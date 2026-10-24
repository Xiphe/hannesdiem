import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { build } from 'esbuild'
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'
import { createCmxPublicationState } from '@cmx-tools/publish'
import { documents as fixture } from '../../website/tests/host-fixture.ts'
import { publicationPath } from '../../contracts/publication.ts'
import sharp from 'sharp'
import { imageLoader } from '../preparation/image-loader.ts'
import type { SiteMetadata } from '../../contracts/content.ts'

test('the released CMX CLI loads the signed config and publishes directly to the host', async (t) => {
  const keys = await crypto.subtle.generateKey('Ed25519', true, ['sign', 'verify'])
  const publicKey = await crypto.subtle.exportKey('jwk', keys.publicKey)
  const directory = await mkdtemp(join(tmpdir(), 'hannesdiem-publisher-'))
  const { outputFiles } = await build({
    stdin: {
      resolveDir: process.cwd(),
      contents: `
        import { createWorker, ContentState, NewsletterState } from './website/app/worker.ts';
        export { ContentState, NewsletterState };
        export default createWorker({ purge: async () => ({success: true}) });
      `,
    },
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'browser',
    external: ['cloudflare:workers'],
    jsx: 'automatic',
    jsxImportSource: 'remix/component',
  })
  const runtime = new Miniflare(
    convertV4MiniflareOptions({
      modules: true,
      script: outputFiles[0].text,
      compatibilityDate: '2026-10-18',
      durableObjects: {
        CONTENT_STATE: { className: 'ContentState', useSQLite: true },
        NEWSLETTER_STATE: { className: 'NewsletterState', useSQLite: true },
      },
      bindings: { CMX_PUBLISH_PUBLIC_KEYS: JSON.stringify({ publisher: publicKey }) },
    }),
  )
  t.after(async () => {
    await runtime.dispose()
    await rm(directory, { recursive: true, force: true })
  })
  const get = (path: string) => runtime.dispatchFetch(new URL(path, 'https://example.com').href)

  const endpoint = new URL(publicationPath, await runtime.ready).href
  const publicationFile = join(directory, 'publication.json')
  async function publish(documents: typeof fixture) {
    await writeFile(publicationFile, JSON.stringify(documents))
    const { stdout } = await promisify(execFile)(
      process.execPath,
      [
        'node_modules/@cmx-tools/publish/dist/cli/cli.js',
        publicationFile,
        endpoint,
        '--config',
        'content/publishing/config.ts',
      ],
      {
        env: {
          ...process.env,
          CMX_PUBLISH_URL: endpoint,
          CMX_PUBLISH_KEY_ID: 'publisher',
          CMX_PUBLISH_PRIVATE_KEY: JSON.stringify(
            await crypto.subtle.exportKey('jwk', keys.privateKey),
          ),
        },
        timeout: 20_000,
      },
    )
    return JSON.parse(stdout) as { contentHash: string }
  }
  const published = await publish(fixture)
  const expected = await createCmxPublicationState(fixture)
  assert.equal(published.contentHash, expected.contentHash)
  assert.equal((await get('/fixture')).headers.get('X-Content-Revision'), expected.contentHash)
  const invalid = structuredClone(fixture)
  delete invalid['404']
  await assert.rejects(
    publish(invalid),
    (error: { stderr?: string }) =>
      /app\/invalid-publication/.test(error.stderr ?? '') &&
      /Missing or invalid page: 404/.test(error.stderr ?? ''),
  )
  assert.equal((await get('/fixture')).headers.get('X-Content-Revision'), expected.contentHash)
  const preflight = await promisify(execFile)(
    process.execPath,
    ['--import', 'remix/node-tsx', 'website/build/check-content-host.ts'],
    {
      env: { ...process.env, SITE_URL: (await runtime.ready).origin },
      timeout: 20_000,
    },
  )
  assert.match(preflight.stdout, /Published content is compatible/)

  const bytes = await sharp({
    create: { width: 40, height: 30, channels: 3, background: '#5874a8' },
  })
    .jpeg()
    .toBuffer()
  const image = await imageLoader.load({
    bytes,
    relativePath: 'fixture.jpg',
    options: {
      storage: { directory: join(directory, 'media'), base: '/fixture-media' },
      sources: {},
    },
  })
  const prepared = structuredClone(fixture)
  const site = prepared._site.content.site as SiteMetadata
  site.routes[0].image = image
  prepared.fixture.content.default = {
    type: 'component',
    from: '@hannesdiem/content-components',
    import: 'Image',
    props: { image },
  }
  const revised = await publish(prepared)
  const route = site.routes.find((route) => route.image && typeof route.image !== 'string')!
  const page = await get(route.path)
  assert.equal(page.status, 200)
  assert.equal(page.headers.get('X-Content-Revision'), revised.contentHash)
  assert.ok(typeof route.image === 'object')
  assert.ok((await page.text()).includes(`src="${route.image.src}"`))
})
