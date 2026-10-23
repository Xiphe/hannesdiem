import { execFileSync } from 'node:child_process'
import { rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const run = (script: string) =>
  execFileSync(process.execPath, [fileURLToPath(new URL(script, import.meta.url))], {
    stdio: 'inherit',
  })

for (const path of ['.cmx/bundle', '.cmx/documents']) rmSync(path, { recursive: true, force: true })

if (process.argv.includes('--extract-palettes')) run('palettes.ts')
run('compile.ts')
execFileSync(
  'npx',
  [
    '--no-install',
    'cmx-document',
    'render',
    '.cmx/bundle',
    '--complete-only',
    '--out-dir',
    '.cmx/documents',
  ],
  { stdio: 'inherit' },
)
run('routes.ts')
run('share-images.ts')

run('publication.ts')
