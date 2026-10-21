import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { build } from 'esbuild'
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'
import { publishCmxDocuments, createCmxPublicationState } from '@cmx-tools/publish'
import { documents as fixture } from './host-fixture.ts'
import { siteEntry, publicationPath } from '../app/publication.ts'
import { signPublicationRequest } from '../app/publication-signatures.ts'

test('signed publications persist, update the complete site and reject replay or partial activation', async (t) => {
  const keys = await crypto.subtle.generateKey('Ed25519', true, ['sign', 'verify'])
  const publicKey = await crypto.subtle.exportKey('jwk', keys.publicKey)
  const directory = await mkdtemp(join(tmpdir(), 'hannesdiem-publication-'))
  const { outputFiles } = await build({
    stdin: {
      resolveDir: process.cwd(),
      contents: `
        import worker, { ContentState, NewsletterState } from './app/worker.ts';
        import { publishContent } from './app/publish-content.ts';
        export { ContentState, NewsletterState };
        let purges = 0, success = true;
        export default { async fetch(request, env, ctx) {
          const url = new URL(request.url);
          if (url.pathname === '/test-purge') {
            if (url.searchParams.has('success')) success = url.searchParams.get('success') === 'true';
            return Response.json({purges});
          }
          if (url.pathname === '/_cmx/publication') return publishContent(request, env.CONTENT_STATE.getByName('published'), async () => {purges++; return {success}});
          return worker.fetch(request, env, ctx);
        }};
      `,
    },
    plugins: [
      {
        name: 'hosted-content',
        setup(builder) {
          builder.onLoad({ filter: /\.generated\/local-content\.ts$/ }, () => ({
            contents: 'export const localPublication = null;',
            loader: 'ts',
          }))
        },
      },
    ],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'browser',
    external: ['cloudflare:workers'],
    jsx: 'automatic',
    jsxImportSource: 'remix/component',
  })
  const options = {
    ...convertV4MiniflareOptions({
      modules: true,
      script: outputFiles[0].text,
      compatibilityDate: '2026-10-18',
      durableObjects: {
        CONTENT_STATE: { className: 'ContentState', useSQLite: true },
        NEWSLETTER_STATE: { className: 'NewsletterState', useSQLite: true },
      },
      bindings: { CMX_PUBLISH_PUBLIC_KEYS: JSON.stringify({ publisher: publicKey }) },
    }),
    resourcePersistencePath: directory,
  }
  let runtime = new Miniflare(options)
  t.after(async () => {
    await runtime.dispose()
    await rm(directory, { recursive: true, force: true })
  })
  const endpoint = `https://example.com${publicationPath}`
  const dispatch = async (
    request: Pick<Request, 'url' | 'method' | 'headers' | 'body' | 'arrayBuffer'>,
  ): Promise<Response> => {
    const response = await runtime.dispatchFetch(request.url, {
      method: request.method,
      headers: Object.fromEntries(request.headers),
      body: request.body ? await request.arrayBuffer() : undefined,
      redirect: 'manual',
    })
    return new Response(
      [204, 304].includes(response.status) ? null : await response.arrayBuffer(),
      { status: response.status, headers: Object.fromEntries(response.headers) },
    )
  }
  const signed = (request: Request, now?: number) =>
    signPublicationRequest(request, keys.privateKey, 'publisher', now)
  const transport: typeof fetch = async (input, init) =>
    dispatch(await signed(new Request(input, init)))
  const publish = (documents: typeof fixture) =>
    publishCmxDocuments({ endpoint, documents, fetch: transport })
  const get = (path: string) => dispatch(new Request(`https://example.com${path}`))
  const readPage = async (path = '/test-publication') => {
    const response = await get(path)
    assert.equal(response.status, 200)
    return { html: await response.text(), hash: response.headers.get('X-Content-Revision') }
  }

  await t.test(
    'the publishing endpoint authenticates reads and writes and rejects replay',
    async () => {
      assert.equal((await get('/fixture')).status, 503)
      assert.equal(((await (await get('/_cmx/status')).json()) as { ready: boolean }).ready, false)
      assert.equal((await dispatch(new Request(endpoint))).status, 401)
      assert.equal(
        (await dispatch(new Request(endpoint, { method: 'PUT', body: '{}' }))).status,
        401,
      )
      const request = await signed(new Request(endpoint))
      const replay = request.clone()
      assert.equal((await dispatch(request)).status, 200)
      assert.equal((await dispatch(replay)).status, 401)
      const expired = await signed(new Request(endpoint), Math.floor(Date.now() / 1000) - 120)
      assert.equal((await dispatch(expired)).status, 401)
      const future = await signed(new Request(endpoint), Math.floor(Date.now() / 1000) + 120)
      assert.equal((await dispatch(future)).status, 401)
      const other = await crypto.subtle.generateKey('Ed25519', true, ['sign', 'verify'])
      assert.equal(
        (
          await dispatch(
            await signPublicationRequest(new Request(endpoint), other.privateKey, 'publisher'),
          )
        ).status,
        401,
      )
      const body = await signed(new Request(endpoint, { method: 'PUT', body: '{}' }))
      const tampered = new Request(body.url, {
        method: 'PUT',
        headers: body.headers,
        body: '{"changed":true}',
      })
      assert.equal((await dispatch(tampered)).status, 401)
      const destination = await signed(new Request(endpoint))
      assert.equal((await dispatch(new Request(endpoint + '?changed=1', destination))).status, 401)
      const method = await signed(new Request(endpoint))
      assert.equal(
        (await dispatch(new Request(endpoint, { method: 'PUT', headers: method.headers }))).status,
        401,
      )
    },
  )

  const documents = structuredClone(fixture)
  documents.fixture.content.default = 'Hosted content is published independently.'
  const site = documents[siteEntry].content.site as import('../app/publication.ts').SiteMetadata
  const page = structuredClone(documents['404'])
  page.content.title = 'Independent publication'
  page.content.default = {
    type: 'element',
    tag: 'article',
    children: [
      'First publication',
      {
        type: 'component',
        from: '@hannesdiem/content-components',
        import: 'Image',
        props: { image: 'publication.webp' },
      },
    ],
  }
  // Use a page that declares the component dependency, as real CMX compilation does.
  page.interface.imports = structuredClone(documents.fixture.interface.imports)
  documents['test-publication'] = page
  site.routes.push({
    path: '/test-publication',
    document: 'test-publication',
    title: 'Independent publication',
    kind: 'release',
    releaseDate: '2026-10-21',
  })
  site.media['publication.webp'] = {
    src: 'https://media.example.com/immutable-image.webp',
    width: 100,
    height: 80,
  }
  site.shareImages['/test-publication'] = {
    src: 'https://media.example.com/immutable-card.jpg',
    width: 1052,
    height: 550,
  }
  site.navigation.sections[0].items.push({
    name: 'Independent publication',
    href: '/test-publication',
  })
  site.redirects.push({ path: '/fresh-alias', to: '/test-publication', status: 307 })

  await t.test(
    'publishing updates pages, media, SEO, navigation and sitemap together',
    async () => {
      const { contentHash } = await publish(documents)
      assert.match(
        await (await get('/fixture')).text(),
        /Hosted content is published independently\./,
      )
      assert.equal(((await (await get('/_cmx/status')).json()) as { ready: boolean }).ready, true)
      const { html, hash } = await readPage()
      assert.equal(hash, contentHash)
      assert.match(html, /First publication/)
      assert.match(html, /src="https:\/\/media.example.com\/immutable-image.webp"/)
      assert.match(html, /content="https:\/\/media.example.com\/immutable-card.jpg"/)
      assert.match(html, /href="\/test-publication"/)
      const sitemap = await get('/sitemap.xml')
      assert.equal(sitemap.headers.get('Cache-Tag'), 'content')
      assert.match(await sitemap.text(), /https:\/\/hannesdiem.de\/test-publication/)
      const alias = await get('/fresh-alias')
      assert.equal(alias.status, 307)
      assert.equal(alias.headers.get('Location'), '/test-publication')
      assert.equal(alias.headers.get('Cache-Tag'), 'content')
      assert.equal(((await (await get('/test-purge')).json()) as { purges: number }).purges, 1)
    },
  )

  await t.test('conditional publication reads survive edge removal of If-None-Match', async () => {
    const { contentHash } = await createCmxPublicationState(documents)
    const request = await signed(
      new Request(endpoint, {
        headers: { 'If-None-Match': `"${contentHash}"` },
      }),
    )
    const headers = new Headers(request.headers)
    headers.delete('If-None-Match') // Cloudflare removes this before the Worker on a cold path.
    assert.equal((await dispatch(new Request(request.url, { headers }))).status, 304)
    const tampered = await signed(
      new Request(endpoint, {
        headers: { 'If-None-Match': `"${contentHash}"` },
      }),
    )
    const tamperedHeaders = new Headers(tampered.headers)
    tamperedHeaders.set('CMX-If-None-Match', '"tampered"')
    assert.equal(
      (await dispatch(new Request(tampered.url, { headers: tamperedHeaders }))).status,
      401,
    )
  })

  await t.test(
    'an invalid complete collection leaves the accepted publication active',
    async () => {
      const invalid = structuredClone(documents)
      delete invalid['404']
      await assert.rejects(publish(invalid), (error: { status?: number }) => error.status === 422)
      assert.match((await readPage()).html, /First publication/)
      const missingComponent = structuredClone(documents)
      missingComponent['test-publication'].content.default = {
        type: 'component',
        from: '@hannesdiem/content-components',
        import: 'NotDeployed',
      }
      await assert.rejects(
        publish(missingComponent),
        (error: { status?: number }) => error.status === 422,
      )
      assert.match((await readPage()).html, /First publication/)
    },
  )

  await t.test('stale publications cannot overwrite a newer collection', async () => {
    const stale = await createCmxPublicationState(documents)
    documents['test-publication'].content.default = 'Second publication'
    await publish(documents)
    const response = await transport(endpoint, {
      method: 'PUT',
      body: JSON.stringify({
        baseContentHash: stale.contentHash,
        targetContentHash: stale.contentHash,
        upsert: {},
        remove: [],
      }),
    })
    assert.equal(response.status, 409)
    assert.match((await readPage()).html, /Second publication/)
  })

  await t.test(
    'the Worker owns cache refresh and an unchanged-content retry finishes it',
    async () => {
      await get('/test-purge?success=false')
      documents['test-publication'].content.default = 'Third publication'
      await assert.rejects(publish(documents), (error: { status?: number }) => error.status === 503)
      assert.match((await readPage()).html, /Third publication/)
      await get('/test-purge?success=true')
      await publish(documents)
      const count = ((await (await get('/test-purge')).json()) as { purges: number }).purges
      await publish(documents)
      assert.equal(((await (await get('/test-purge')).json()) as { purges: number }).purges, count)
    },
  )

  await t.test('content and replay records survive a Worker restart', async () => {
    const request = await signed(new Request(endpoint))
    const replay = request.clone()
    assert.equal((await dispatch(request)).status, 200)
    await runtime.dispose()
    runtime = new Miniflare(options)
    assert.match((await readPage()).html, /Third publication/)
    assert.equal((await dispatch(replay)).status, 401)
    const raced = await signed(new Request(endpoint))
    const [firstUse, secondUse] = await Promise.all([
      dispatch(raced.clone()),
      dispatch(raced.clone()),
    ])
    assert.deepEqual([firstUse.status, secondUse.status].sort(), [200, 401])
  })

  await t.test('removing a page unpublishes it from routing and the sitemap', async () => {
    delete documents['test-publication']
    site.routes = site.routes.filter((route) => route.path !== '/test-publication')
    site.navigation.sections[0].items = site.navigation.sections[0].items.filter(
      (link) => link.href !== '/test-publication',
    )
    delete site.shareImages['/test-publication']
    await publish(documents)
    assert.equal((await get('/test-publication')).status, 404)
    assert.doesNotMatch(await (await get('/sitemap.xml')).text(), /\/test-publication/)
  })

  await t.test(
    'the released CMX CLI loads the signed config and publishes directly to the host',
    async () => {
      const endpoint = new URL(publicationPath, await runtime.ready).href
      const publicationFile = join(directory, 'publication.json')
      await writeFile(publicationFile, JSON.stringify(fixture))
      const { stdout } = await promisify(execFile)(
        process.execPath,
        [
          'node_modules/@cmx-tools/publish/dist/cli/cli.js',
          publicationFile,
          endpoint,
          '--config',
          'cmx.config.ts',
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
      const published = JSON.parse(stdout) as { contentHash: string }
      const expected = await createCmxPublicationState(fixture)
      assert.equal(published.contentHash, expected.contentHash)
      assert.equal((await get('/fixture')).headers.get('X-Content-Revision'), expected.contentHash)
      const preflight = await promisify(execFile)(
        process.execPath,
        ['--import', 'remix/node-tsx', 'scripts/check-content-host.ts'],
        {
          env: { ...process.env, SITE_URL: (await runtime.ready).origin },
          timeout: 20_000,
        },
      )
      assert.match(preflight.stdout, /Published content is compatible/)
    },
  )
})
