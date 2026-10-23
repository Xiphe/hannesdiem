import { execFileSync } from 'node:child_process'

if (process.env.WRANGLER_COMMAND === 'dev') {
  const started = performance.now()
  const run = (...args: string[]) => execFileSync('npm', ['run', ...args], { stdio: 'inherit' })

  if (process.env.WEBSITE_TEST === 'true') {
    run('build:app')
  } else {
    run('build')
  }
  console.log(`Local build ready in ${((performance.now() - started) / 1000).toFixed(1)}s`)
}
