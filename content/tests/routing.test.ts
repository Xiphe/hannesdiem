import assert from 'node:assert/strict'
import { test } from 'node:test'
import { discoverPages } from '../../contracts/page-routing.ts'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import config from '../../contracts/cmx.ts'
import { buildPublication } from '../preparation/prepare.ts'

test('flat pages and directory indexes derive URLs from their filenames', () => {
  const pages = discoverPages([
    'song/example.tsx',
    'song/example/reprise.tsx',
    'index.tsx',
    'retreat/index.tsx',
    'release.tsx',
  ])
  assert.deepEqual(
    pages.map(({ path }) => path),
    ['/', '/release', '/retreat', '/song/example', '/song/example/reprise'],
  )
  assert.equal(pages.find(({ path }) => path === '/retreat')?.document, 'retreat/index')
})

test('underscore files and directories are excluded at every depth', () => {
  const pages = discoverPages([
    '_404.tsx',
    '_helper.tsx',
    '_private/page.tsx',
    'nested/_private/deeper/page.tsx',
    'nested/_helper.tsx',
    'nested/data.ts',
    'nested/style.css',
    'nested/real.tsx',
  ])
  assert.deepEqual(pages, [
    { file: 'nested/real.tsx', document: 'nested/real', path: '/nested/real' },
  ])
})

test('ambiguous file and index routes fail discovery', () => {
  assert.throws(
    () => discoverPages(['example.tsx', 'example/index.tsx']),
    /Duplicate page URL: \/example/,
  )
})

test('discovered CMX entries retain metadata and can import excluded supporting files', async (t) => {
  const directory = await mkdtemp(join(process.cwd(), '.routing-fixture-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  await mkdir(join(directory, '_parts'))
  const files = {
    '_parts/shared.tsx': `export const description = 'Shared metadata'; export const fragment = <strong>Shared body</strong>`,
    '_unused.tsx': `throw new Error('Supporting files must not become entries')`,
    'index.tsx': `
      import { description, fragment } from './_parts/shared.tsx';
      export const title = 'Synthetic home';
      export const metadata = async () => ({ kind: 'page', description, title: 'Computed title' });
      export default <article>{fragment}</article>;
    `,
    '_404.tsx': `export const title = 'Not found'; export default <h1>Missing</h1>`,
    '_site.ts': `export const site = { version: 2, media: {}, navigation: { sections: [], legal: { name: 'Legal', items: [] }, social: [], listen: [] } }`,
    '_redirects.ts': `export const redirects = []`,
  }
  for (const [file, source] of Object.entries(files)) await writeFile(join(directory, file), source)
  const pages = discoverPages(Object.keys(files))
  const options = {
    ...config,
    cwd: process.cwd(),
    entries: {
      ...Object.fromEntries(pages.map(({ document, file }) => [document, join(directory, file)])),
      _404: join(directory, '_404.tsx'),
      _site: join(directory, '_site.ts'),
      _redirects: join(directory, '_redirects.ts'),
    },
    outDir: join(directory, 'bundle'),
  }
  const documents = await buildPublication(options)
  const document = documents.index
  assert.deepEqual(document.content.metadata, {
    kind: 'page',
    description: 'Shared metadata',
    title: 'Computed title',
  })
  assert.match(JSON.stringify(document.content.default), /Shared body/)
  assert.deepEqual(Object.keys(documents._site.content), ['site'])
  assert.deepEqual(Object.keys(documents._redirects.content), ['redirects'])
  assert.deepEqual(Object.keys(documents._site.interface.exports), ['site'])

  await writeFile(
    join(directory, 'broken.ts'),
    `export const metadata = () => { throw new Error('Broken entry') }`,
  )
  await assert.rejects(
    buildPublication({
      ...options,
      outDir: join(directory, 'broken-bundle'),
      entries: { ...options.entries, broken: join(directory, 'broken.ts') },
    }),
    /Broken entry/,
  )
  await writeFile(join(directory, 'invalid.ts'), `export default 'Missing required page title'`)
  await assert.rejects(
    buildPublication({
      ...options,
      outDir: join(directory, 'invalid-bundle'),
      entries: { ...options.entries, invalid: join(directory, 'invalid.ts') },
    }),
    /Invalid or duplicate content route/,
  )
})
