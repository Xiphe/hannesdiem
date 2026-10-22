import { execFileSync } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const run = (script: string) =>
  execFileSync(process.execPath, [fileURLToPath(new URL(script, import.meta.url))], {
    stdio: 'inherit',
  })

for (const path of ['.cmx/bundle', '.cmx/documents']) rmSync(path, { recursive: true, force: true })

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
if (process.argv.includes('--extract-palettes')) run('palettes.ts')

if (
  !process.argv.includes('--reuse-media') ||
  [
    '.generated/media.json',
    '.generated/media-files.json',
    '.generated/og.json',
    '.generated/media',
  ].some((path) => !existsSync(path))
) {
  run('media.ts')
  run('share-images.ts')
}

run('publication.ts')
