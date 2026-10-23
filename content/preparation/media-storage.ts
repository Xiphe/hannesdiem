import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { AwsClient } from 'aws4fetch'

export type MediaStorage = { base: string } & (
  { directory: string } | { account: string; bucket: string }
)

export async function storeMedia(
  storage: MediaStorage,
  key: string,
  bytes: Uint8Array,
  contentType: string,
  request: typeof fetch = fetch,
): Promise<string> {
  const digest = createHash('sha256').update(bytes).digest('hex').slice(0, 16)
  if (!key.includes(`-${digest}.`) || key.split('/').some((part) => part === '..' || !part))
    throw new Error('Media keys must be relative and include their content digest')
  if ('directory' in storage) {
    const path = join(storage.directory, key)
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, bytes)
  } else {
    if (!/^[a-f0-9]{32}$/i.test(storage.account)) throw new Error('Set a valid R2_ACCOUNT_ID')
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
    if (!accessKeyId || !secretAccessKey) throw new Error('Set bucket-scoped R2 credentials')
    const client = new AwsClient({ accessKeyId, secretAccessKey, service: 's3', region: 'auto' })
    const signed = await client.sign(
      `https://${storage.account}.r2.cloudflarestorage.com/${storage.bucket}/${key}`,
      {
        method: 'PUT',
        redirect: 'error',
        signal: AbortSignal.timeout(30_000),
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
        body: new Uint8Array(bytes),
      },
    )
    const response = await request(signed)
    if (!response.ok) throw new Error(`R2 storage failed for ${key} (${response.status})`)
  }
  return `${storage.base}/${key}`
}
