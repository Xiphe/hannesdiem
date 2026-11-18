import { execFileSync } from 'node:child_process'
import { cp, mkdir } from 'node:fs/promises'

execFileSync('npm', ['run', 'build:app'], { stdio: 'inherit' })
await mkdir('dist/fixture-media', { recursive: true })
await cp('website/tests/media/electrocute.mp4', 'dist/fixture-media/electrocute.mp4')
process.env.WEBSITE_TEST = 'true'
await import('./preview.ts')
