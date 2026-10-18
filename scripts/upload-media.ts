import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { promisify } from 'node:util'
const execute = promisify(execFile)

type MediaFile = { key: string; path: string; contentType: string; sha256: string }
type Execute = (command: string, args: string[]) => Promise<{ stdout: string }>

export async function uploadMedia(
  files: MediaFile[],
  account: string,
  run: Execute = (command, args) => execute(command, args, { maxBuffer: 16 * 1024 * 1024 }),
) {
  if (!/^[a-f0-9]{32}$/i.test(account))
    throw new Error('Set R2_ACCOUNT_ID to the destination R2 account ID')
  if (!files.length) return { uploaded: 0, skipped: 0 }

  const destination = [
    '--endpoint-url',
    `https://${account}.r2.cloudflarestorage.com`,
    '--region',
    'auto',
  ]
  // AWS CLI follows pagination. One listing avoids a separate process/request per object.
  const listing = await run('aws', [
    's3api',
    'list-objects-v2',
    '--bucket',
    'hannesdiem-media',
    '--query',
    'Contents[].Key',
    '--output',
    'json',
    ...destination,
  ])
  const keys: unknown = JSON.parse(listing.stdout)
  if (keys !== null && (!Array.isArray(keys) || keys.some((key) => typeof key !== 'string')))
    throw new Error('Unexpected R2 object listing')
  const existing = new Set<string>(keys ?? [])
  let next = 0
  let uploaded = 0
  await Promise.all(
    Array.from({ length: Math.min(6, files.length) }, async () => {
      while (next < files.length) {
        const file = files[next++]!
        const bytes = await readFile(file.path)
        if (createHash('sha256').update(bytes).digest('hex') !== file.sha256)
          throw new Error(`Media changed since build: ${file.key}`)
        if (!file.key.includes(`-${file.sha256.slice(0, 16)}.`))
          throw new Error(`Media key must include its content digest: ${file.key}`)
        if (existing.has(file.key)) continue
        await run('aws', [
          's3',
          'cp',
          file.path,
          `s3://hannesdiem-media/${file.key}`,
          ...destination,
          '--content-type',
          file.contentType,
          '--cache-control',
          'public, max-age=31536000, immutable',
          '--only-show-errors',
        ])
        uploaded++
      }
    }),
  )
  return { uploaded, skipped: files.length - uploaded }
}

if (import.meta.main) {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY)
    throw new Error('Set bucket-scoped AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY for R2')
  const files: MediaFile[] = JSON.parse(await readFile('.generated/media-files.json', 'utf8'))
  const { uploaded, skipped } = await uploadMedia(files, process.env.R2_ACCOUNT_ID ?? '')
  console.log(
    `Uploaded ${uploaded} new immutable media objects to R2; skipped ${skipped} existing objects; old objects retained.`,
  )
}
