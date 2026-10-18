import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test, type TestContext } from 'node:test'
import { uploadMedia } from '../scripts/upload-media.ts'

const account = '0123456789abcdef0123456789abcdef'

async function fixture(t: TestContext) {
  const directory = await mkdtemp(join(tmpdir(), 'hannesdiem-media-upload-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const files = await Promise.all(
    ['first image', 'second image'].map(async (content, index) => {
      const sha256 = createHash('sha256').update(content).digest('hex')
      const key = `images/example-${index}-${sha256.slice(0, 16)}.webp`
      const path = join(directory, `${index}.webp`)
      await writeFile(path, content)
      return { key, path, contentType: 'image/webp', sha256 }
    }),
  )
  return files
}

test('unchanged media uses one paginated listing and no uploads', async (t) => {
  const files = await fixture(t)
  const calls: string[][] = []
  const result = await uploadMedia(files, account, async (command, args) => {
    assert.equal(command, 'aws')
    calls.push(args)
    return { stdout: JSON.stringify(files.map((file) => file.key)) }
  })
  assert.deepEqual(result, { uploaded: 0, skipped: 2 })
  assert.equal(calls.length, 1)
  assert.deepEqual(calls[0]?.slice(0, 4), [
    's3api',
    'list-objects-v2',
    '--bucket',
    'hannesdiem-media',
  ])
  assert.equal(calls[0]?.includes('--no-paginate'), false)
})

test('only missing immutable objects upload; obsolete remote objects remain untouched', async (t) => {
  const files = await fixture(t)
  const calls: string[][] = []
  const result = await uploadMedia(files, account, async (_command, args) => {
    calls.push(args)
    return {
      stdout: args[0] === 's3api' ? JSON.stringify([files[0]!.key, 'images/obsolete.webp']) : '',
    }
  })
  assert.deepEqual(result, { uploaded: 1, skipped: 1 })
  assert.equal(calls.length, 2)
  assert.deepEqual(calls[1]?.slice(0, 4), [
    's3',
    'cp',
    files[1]!.path,
    `s3://hannesdiem-media/${files[1]!.key}`,
  ])
  assert.ok(calls[1]?.includes('public, max-age=31536000, immutable'))
})

test('empty buckets upload all files and listing or upload failures propagate', async (t) => {
  const files = await fixture(t)
  let uploads = 0
  const result = await uploadMedia(files, account, async (_command, args) => {
    if (args[0] === 's3') uploads++
    return { stdout: 'null' }
  })
  assert.deepEqual(result, { uploaded: 2, skipped: 0 })
  assert.equal(uploads, 2)

  const failure = new Error('AccessDenied')
  await assert.rejects(
    uploadMedia(files, account, async () => {
      throw failure
    }),
    (error) => error === failure,
  )
  await assert.rejects(
    uploadMedia(files, account, async (_command, args) => {
      if (args[0] === 's3') throw failure
      return { stdout: '[]' }
    }),
    (error) => error === failure,
  )
})

test('existing remote objects do not bypass local digest verification', async (t) => {
  const [file] = await fixture(t)
  await writeFile(file!.path, 'changed after build')
  await assert.rejects(
    uploadMedia([file!], account, async () => ({ stdout: JSON.stringify([file!.key]) })),
    /Media changed since build/,
  )
})

test('mutable keys cannot be treated as existing immutable objects', async (t) => {
  const [file] = await fixture(t)
  const mutable = { ...file!, key: 'images/example.webp' }
  await assert.rejects(
    uploadMedia([mutable], account, async () => ({ stdout: JSON.stringify([mutable.key]) })),
    /Media key must include its content digest/,
  )
})
