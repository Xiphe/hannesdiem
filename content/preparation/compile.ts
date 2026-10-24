import { compileCmxBundle } from '@cmx-tools/bundle'
import { globSync } from 'node:fs'
import { resolve, sep } from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
import { discoverPages, notFoundEntry } from '../../contracts/page-routing.ts'
import config from '../cmx.config.ts'

const cwd = process.cwd()
const pages = resolve(cwd, 'content/pages')
const discovered = discoverPages(
  globSync('**/*.tsx', { cwd: pages }).map((file) => file.split(sep).join('/')),
)
const entries = Object.fromEntries(
  discovered.map(({ file, document }) => [document, resolve(pages, file)]),
)
if (Object.keys(entries).length === 0) throw new Error('No CMX pages found')
entries[notFoundEntry] = resolve(pages, '_404.tsx')
await mkdir('.generated', { recursive: true })
await writeFile('.generated/pages.json', JSON.stringify(discovered, null, 2) + '\n')

await compileCmxBundle({
  ...config,
  cwd,
  entries,
  outDir: '.cmx/bundle',
  configPath: 'content/cmx.config.ts',
})
