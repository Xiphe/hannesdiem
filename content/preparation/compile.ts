import { compileCmxBundle } from '@cmx-tools/bundle'
import { globSync } from 'node:fs'
import { resolve, sep } from 'node:path'
import config from '../cmx.config.ts'

const cwd = process.cwd()
const pages = resolve(cwd, 'content/pages')
const entries = Object.fromEntries(
  globSync('**/*.tsx', { cwd: pages })
    .sort()
    .map((file) => [file.slice(0, -4).split(sep).join('/'), resolve(pages, file)]),
)
if (Object.keys(entries).length === 0) throw new Error('No CMX pages found')
entries._routes = resolve(cwd, 'content/routes.ts')

await compileCmxBundle({
  ...config,
  cwd,
  entries,
  outDir: '.cmx/bundle',
  configPath: 'content/cmx.config.ts',
})
