import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'

// Production builds are prepared by Actions; this hook owns local development.
if (process.env.WRANGLER_COMMAND === 'dev') {
  const started = performance.now()
  const run = (script: string) => execFileSync('npm', ['run', script], { stdio: 'inherit' })

  run('cmx:build')
  if (
    [
      '.generated/media.json',
      '.generated/media-files.json',
      '.generated/og.json',
      '.generated/media',
    ].some((path) => !existsSync(path))
  ) {
    run('media:build')
  }
  execFileSync(process.execPath, ['scripts/build.ts'], { stdio: 'inherit' })
  console.log(`Local build ready in ${((performance.now() - started) / 1000).toFixed(1)}s`)
}
