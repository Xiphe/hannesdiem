import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const run = (script: string) =>
  execFileSync(process.execPath, [fileURLToPath(new URL(script, import.meta.url))], {
    stdio: 'inherit',
  })

for (const path of ['.cmx/bundle', '.cmx/documents']) rmSync(path, { recursive: true, force: true })

// A CMX cache hit skips storage. Rebuild if its companion output was removed.
const files = existsSync('.generated/media-files.json')
  ? (JSON.parse(readFileSync('.generated/media-files.json', 'utf8')) as { path: string }[])
  : undefined
if (!files || files.some((file) => !existsSync(file.path))) {
  rmSync('.cmx/assets', { recursive: true, force: true })
}
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
run('media.ts')
run('share-images.ts')

run('publication.ts')
