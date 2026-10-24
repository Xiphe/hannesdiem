import assert from 'node:assert/strict'
import { test } from 'node:test'
import { discoverPages } from '../../contracts/page-routing.ts'
import { compileCmxBundle } from '@cmx-tools/bundle'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import config from '../../contracts/cmx.ts'

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
      export const metadata = { kind: 'page', description };
      export default <article>{fragment}</article>;
    `,
  }
  for (const [file, source] of Object.entries(files)) await writeFile(join(directory, file), source)
  const pages = discoverPages(Object.keys(files))
  await compileCmxBundle({
    ...config,
    cwd: process.cwd(),
    entries: Object.fromEntries(
      pages.map(({ document, file }) => [document, join(directory, file)]),
    ),
    outDir: join(directory, 'bundle'),
  })
  await promisify(execFile)(process.execPath, [
    'node_modules/@cmx-tools/document/dist/cli/cli.js',
    'render',
    join(directory, 'bundle'),
    '--complete-only',
    '--out-dir',
    join(directory, 'documents'),
  ])
  const document = JSON.parse(await readFile(join(directory, 'documents/index.json'), 'utf8'))
  assert.deepEqual(document.content.metadata, { kind: 'page', description: 'Shared metadata' })
  assert.match(JSON.stringify(document.content.default), /Shared body/)
})
