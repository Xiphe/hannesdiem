import { parseArgs } from 'node:util'
import { spawnSync } from 'node:child_process'
import { readGmailCredentials } from './gmail.ts'

const { values } = parseArgs({
  options: {
    url: { type: 'string', default: process.env.QA_BASE_URL || 'http://127.0.0.1:8787' },
    auth: { type: 'boolean', default: process.env.QA_AUTH === 'true' },
  },
})
const target = new URL(values.url!)
if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password)
  throw new Error('QA requires an HTTP(S) site URL without credentials')
if (target.pathname !== '/' || target.search || target.hash)
  throw new Error('QA requires the site origin, without a path, query, or fragment')
if (values.auth) readGmailCredentials()

console.log(`QA target: ${target.origin}; scope: ${values.auth ? 'login' : 'anonymous'}`)
const result = spawnSync(
  process.execPath,
  ['node_modules/@playwright/test/cli.js', 'test', '--config', 'website/qa/playwright.config.ts'],
  {
    stdio: 'inherit',
    env: { ...process.env, QA_BASE_URL: target.origin, QA_AUTH: String(values.auth) },
  },
)
if (result.error) throw result.error
process.exit(result.status ?? 1)
