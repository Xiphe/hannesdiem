import { execFileSync } from 'node:child_process'
import { cp, mkdir } from 'node:fs/promises'

const synthetic = process.argv.includes('--synthetic')
execFileSync('npm', ['run', synthetic ? 'build:app' : 'build'], { stdio: 'inherit' })
if (synthetic) {
  delete process.env.ELECTROCUTE_PREVIEW
  await mkdir('dist/fixture-media', { recursive: true })
  await cp('website/tests/media/electrocute.mp4', 'dist/fixture-media/electrocute.mp4')
  process.env.WEBSITE_TEST = 'true'
} else {
  delete process.env.WEBSITE_TEST
  process.env.ELECTROCUTE_PREVIEW = 'authored'
}
await import('./preview.ts')
