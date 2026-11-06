import { globSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const fast = process.argv[2] === '--fast'
const files = globSync('website/**/*.test.ts')
  .filter((file) => !fast || !file.endsWith('.slow.test.ts'))
  .sort()
if (!files.length) throw new Error('No website tests found')

const result = spawnSync(process.execPath, ['--import', 'remix/node-tsx', '--test', ...files], {
  stdio: 'inherit',
})
if (result.error) throw result.error
process.exit(result.status ?? 1)
