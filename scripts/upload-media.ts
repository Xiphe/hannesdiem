import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

const account = process.env.R2_ACCOUNT_ID
if (!account || !/^[a-f0-9]{32}$/i.test(account)) throw new Error('Set R2_ACCOUNT_ID to the destination R2 account ID')
if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  throw new Error('Set bucket-scoped AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY for R2')
}
const files: { key: string; path: string; contentType: string; sha256: string }[] =
  JSON.parse(await readFile('.generated/media-files.json', 'utf8'))
for (const file of files) {
  const bytes = await readFile(file.path)
  if (createHash('sha256').update(bytes).digest('hex') !== file.sha256) throw new Error(`Media changed since build: ${file.key}`)
  execFileSync('aws', [
    's3', 'cp', file.path, `s3://hannesdiem-media/${file.key}`,
    '--endpoint-url', `https://${account}.r2.cloudflarestorage.com`, '--region', 'auto',
    '--content-type', file.contentType, '--cache-control', 'public, max-age=31536000, immutable',
    '--only-show-errors',
  ], { stdio: 'inherit' })
}
console.log(`Uploaded ${files.length} content media variants to R2; existing objects retained.`)
