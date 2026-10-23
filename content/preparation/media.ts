import { createHash } from 'node:crypto'
import { globSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import type config from '../cmx.config.ts'

type Image = Awaited<ReturnType<typeof config.assets.loaders.image.load>>
const manifest: Record<string, Image> = {}
function collect(value: unknown): void {
  if (!value || typeof value !== 'object') return
  const candidate = value as Partial<Image>
  if (candidate.filename && candidate.sourceSha256 && candidate.src && candidate.srcSet) {
    manifest[candidate.filename] = candidate as Image
    return
  }
  for (const child of Object.values(value)) collect(child)
}
for (const file of globSync('.cmx/documents/**/*.json')) {
  collect(JSON.parse(await readFile(file, 'utf8')))
}
const files = new Map<
  string,
  { key: string; path: string; contentType: string; bytes: number; sha256: string }
>()
for (const image of Object.values(manifest)) {
  for (const variant of image.srcSet.split(', ')) {
    const src = variant.replace(/ \d+w$/, '')
    const key = src.slice(src.lastIndexOf('/images/') + 1)
    if (!key.startsWith('images/') || key.includes('..'))
      throw new Error(`Invalid image URL: ${src}`)
    const path = `.generated/media/${key}`
    const bytes = await readFile(path)
    const sha256 = createHash('sha256').update(bytes).digest('hex')
    files.set(key, { key, path, contentType: 'image/webp', bytes: bytes.length, sha256 })
  }
}
await writeFile('.generated/media.json', JSON.stringify(manifest, null, 2) + '\n')
await writeFile('.generated/media-files.json', JSON.stringify([...files.values()], null, 2) + '\n')
console.log(`Content assets: ${Object.keys(manifest).length} images, ${files.size} WebP variants`)
