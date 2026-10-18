import { createHash } from 'node:crypto'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import sharp from 'sharp'

function mediaBase(value: string): string {
  if (/[\s\u0000-\u001f\u007f\\?#]/.test(value)) throw new Error('MEDIA_BASE_URL must have no whitespace, query, hash, or backslash')
  const absolute = value.startsWith('https://')
  if (!absolute && !/^\/(?!\/)/.test(value)) throw new Error('MEDIA_BASE_URL must be HTTPS or root-relative')
  const url = new URL(value, 'https://local.invalid')
  if (url.username || url.password) throw new Error('MEDIA_BASE_URL must have no credentials')
  const rawPath = absolute ? value.replace(/^https:\/\/[^/]*/, '') : value
  for (const segment of rawPath.split('/')) {
    const decoded = decodeURIComponent(segment)
    if (decoded === '.' || decoded === '..' || /[\s\u0000-\u001f\u007f\\/?#]/.test(decoded)) {
      throw new Error('MEDIA_BASE_URL contains an unsafe path segment')
    }
  }
  return (absolute ? url.href : url.pathname).replace(/\/+$/, '')
}

const base = mediaBase(process.env.MEDIA_BASE_URL ?? '/media')
await rm('.generated/media', { recursive: true, force: true })
await mkdir('.generated/media', { recursive: true })
const files = []
const variants = []
for (const width of [480, 960, 1440]) {
  const image = await sharp('content/media/landscape.svg').resize({ width }).webp({ quality: 80 }).toBuffer()
  const sha256 = createHash('sha256').update(image).digest('hex')
  const key = `spike/landscape-${width}-${sha256.slice(0, 16)}.webp`
  const path = `.generated/media/${key}`
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, image)
  files.push({ key, path, contentType: 'image/webp', bytes: image.length, sha256 })
  variants.push({ src: `${base}/${key}`, width })
}
await writeFile('.generated/media.json', JSON.stringify({ landscape: {
  src: variants.at(-1)!.src,
  srcSet: variants.map(({ src, width }) => `${src} ${width}w`).join(', '),
  width: 1440,
  height: 900,
} }, null, 2) + '\n')
await writeFile('.generated/media-files.json', JSON.stringify(files, null, 2) + '\n')
console.log(`Content media: ${files.length} WebP variants, ${files.reduce((bytes, file) => bytes + file.bytes, 0)} bytes`)
