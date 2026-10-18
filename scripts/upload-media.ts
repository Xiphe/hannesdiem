import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { promisify } from 'node:util'
const execute = promisify(execFile)
const account = process.env.R2_ACCOUNT_ID
if (!account || !/^[a-f0-9]{32}$/i.test(account))
  throw new Error('Set R2_ACCOUNT_ID to the destination R2 account ID')
if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY)
  throw new Error('Set bucket-scoped AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY for R2')
const files: { key: string; path: string; contentType: string; sha256: string }[] = JSON.parse(
  await readFile('.generated/media-files.json', 'utf8'),
)
let next = 0
await Promise.all(
  Array.from({ length: Math.min(6, files.length) }, async () => {
    while (next < files.length) {
      const file = files[next++]!
      const bytes = await readFile(file.path)
      if (createHash('sha256').update(bytes).digest('hex') !== file.sha256)
        throw new Error(`Media changed since build: ${file.key}`)
      await execute('aws', [
        's3',
        'cp',
        file.path,
        `s3://hannesdiem-media/${file.key}`,
        '--endpoint-url',
        `https://${account}.r2.cloudflarestorage.com`,
        '--region',
        'auto',
        '--content-type',
        file.contentType,
        '--cache-control',
        'public, max-age=31536000, immutable',
        '--only-show-errors',
      ])
    }
  }),
)
console.log(`Uploaded ${files.length} immutable media objects to R2; old objects retained.`)
