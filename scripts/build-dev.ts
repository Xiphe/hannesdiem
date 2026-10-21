import { execFileSync } from 'node:child_process'
import { existsSync, writeFileSync } from 'node:fs'

// Production builds are prepared by Actions; this hook owns local development.
if (process.env.WRANGLER_COMMAND === 'dev') {
  const started = performance.now()
  const run = (script: string) => execFileSync('npm', ['run', script], { stdio: 'inherit' })

  if (process.env.WEBSITE_TEST === 'true') {
    run('build:app')
    writeFileSync(
      '.generated/local-content.ts',
      "export { documents as localPublication } from '../tests/host-fixture.ts'\n",
    )
    process.exit(0)
  }
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
  execFileSync(process.execPath, ['scripts/build-publication.ts'], { stdio: 'inherit' })
  execFileSync(process.execPath, ['scripts/build.ts', '--local-content'], { stdio: 'inherit' })
  console.log(`Local build ready in ${((performance.now() - started) / 1000).toFixed(1)}s`)
}
