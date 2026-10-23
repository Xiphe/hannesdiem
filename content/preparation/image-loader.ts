import { createHash } from 'node:crypto'
import { basename, extname } from 'node:path'
import type { CmxAssetLoader } from '@cmx-tools/contracts'
import { Vibrant } from 'node-vibrant/node'
import vibrantPackage from 'node-vibrant/package.json' with { type: 'json' }
import sharp from 'sharp'
import { storeMedia, type MediaStorage } from './media-storage.ts'

type Source = {
  alt: string
  width: number
  height: number
  focalX: number
  focalY: number
  sourceId?: string
}
export function mediaBase(value: string): string {
  if (/[\s\u0000-\u001f\u007f\\?#]/.test(value))
    throw new Error('MEDIA_BASE_URL must have no whitespace, query, hash, or backslash')
  const absolute = value.startsWith('https://')
  if (!absolute && !/^\/(?!\/)/.test(value))
    throw new Error('MEDIA_BASE_URL must be HTTPS or root-relative')
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

export const imageLoader = {
  version: `3:vibrant-${vibrantPackage.version}:sharp-${sharp.versions.sharp}:vips-${sharp.versions.vips}`,
  extensions: ['.jpg', '.jpeg', '.png', '.webp', '.avif'],
  async load({ bytes, relativePath, options }) {
    const filename = basename(relativePath)
    const input = Buffer.from(bytes)
    const sourceSha256 = createHash('sha256').update(input).digest('hex')
    const metadata = await sharp(input).metadata()
    const rotated = [5, 6, 7, 8].includes(metadata.orientation ?? 1)
    const width = rotated ? metadata.height! : metadata.width!
    const height = rotated ? metadata.width! : metadata.height!
    if (!width || !height) throw new Error(`Missing image dimensions: ${relativePath}`)
    // The legacy extractor decodes JPEG/PNG; Sharp supplies PNG for other formats.
    const paletteInput = ['jpeg', 'png'].includes(metadata.format ?? '')
      ? input
      : await sharp(input).png().toBuffer()
    const swatches = await Vibrant.from(paletteInput).getPalette()
    const { data } = await sharp(input)
      .resize(1, 1, { fit: 'cover' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    const color = `#${[...data.subarray(0, 3)].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
    const palette = Object.entries(swatches).flatMap(([name, swatch]) =>
      swatch ? [{ name, color: swatch.hex, hsl: swatch.hsl, population: swatch.population }] : [],
    )
    const widths = [
      ...new Set(
        [320, 480, 960, 1440, 1920, Math.min(width, 2560)].filter(
          (candidate) => candidate <= width,
        ),
      ),
    ].sort((a, b) => a - b)
    const stem = filename.slice(0, -extname(filename).length).replace(/[^a-zA-Z0-9_-]+/g, '-')
    const variants: { src: string; width: number }[] = []
    for (const variantWidth of widths) {
      const image = await sharp(input)
        .rotate()
        .resize({ width: variantWidth, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer()
      const sha256 = createHash('sha256').update(image).digest('hex')
      const key = `images/${stem}-${variantWidth}-${sha256.slice(0, 16)}.webp`
      const src = await storeMedia(options.storage, key, image, 'image/webp')
      variants.push({ src, width: variantWidth })
    }
    const source: Partial<Source> = options.sources[filename] ?? {}
    return {
      ...source,
      filename,
      src: variants.at(-1)!.src,
      srcSet: variants.map(({ src, width }) => `${src} ${width}w`).join(', '),
      width,
      height,
      sourceSha256,
      color,
      palette,
    }
  },
} satisfies CmxAssetLoader<{
  storage: MediaStorage
  sources: Record<string, Source>
}>
