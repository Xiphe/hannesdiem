import { cmx } from '@cmx-tools/bundle'
import { globSync } from 'node:fs'
import { resolve, sep } from 'node:path'
import { rolldown } from 'rolldown'
import config from '../../cmx.config.ts'

const cwd = process.cwd()
const pages = resolve(cwd, 'content/pages')
const entries = Object.fromEntries(
  globSync('**/*.tsx', { cwd: pages })
    .sort()
    .map((file) => [file.slice(0, -4).split(sep).join('/'), resolve(pages, file)]),
)
if (Object.keys(entries).length === 0) throw new Error('No CMX pages found')

const bundle = await rolldown({
  cwd,
  input: entries,
  plugins: [cmx({ ...config, cwd })],
  // Page imports can create entry facades without sourcemaps.
  // https://github.com/cmx-tools/packages/issues/208
  preserveEntrySignatures: 'allow-extension',
})
try {
  await bundle.write({
    dir: resolve(cwd, '.cmx/bundle'),
    entryFileNames: '[name].js',
    chunkFileNames: '[name]-[hash].js',
  })
} finally {
  await bundle.close()
}
