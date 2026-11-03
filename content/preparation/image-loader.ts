import { createHash } from 'node:crypto'
import { basename, extname } from 'node:path'
import type { CmxAssetLoader } from '@cmx-tools/contracts'
import { Vibrant } from 'node-vibrant/node'
import vibrantPackage from 'node-vibrant/package.json' with { type: 'json' }
import sharp from 'sharp'
import { storeMedia, type MediaStorage } from './media-storage.ts'

type Source = {
  alt: string
  focalX: number
  focalY: number
  contactPhoto?: boolean
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
  version: `6:contact-photo:vibrant-${vibrantPackage.version}:sharp-${sharp.versions.sharp}:vips-${sharp.versions.vips}`,
  extensions: ['.jpg', '.jpeg', '.png', '.webp', '.avif'],
  async load({ bytes, relativePath, options }) {
    const filename = basename(relativePath)
    const input = Buffer.from(bytes)
    const metadata = await sharp(input).metadata()
    const rotated = [5, 6, 7, 8].includes(metadata.orientation ?? 1)
    const width = rotated ? metadata.height! : metadata.width!
    const height = rotated ? metadata.width! : metadata.height!
    if (!width || !height) throw new Error(`Missing image dimensions: ${relativePath}`)
    // Jimp decodes the whole JPEG before Vibrant samples it. Large 4:4:4
    // originals exceed its 512MB decoder limit; bound only the palette input.
    // Keep legacy palettes for smaller images and all rendition bytes unchanged.
    const large = metadata.width! * metadata.height! > 16_777_216
    const paletteInput = large
      ? await sharp(input)
          .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
          .png()
          .toBuffer()
      : ['jpeg', 'png'].includes(metadata.format ?? '')
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
    const vcardPhoto = options.sources[filename]?.contactPhoto
      ? (
          await sharp(input)
            .rotate()
            .resize(384, 384, { fit: 'cover' })
            .jpeg({ quality: 82 })
            .toBuffer()
        ).toString('base64')
      : undefined
    return {
      ...(options.sources[filename] ?? {}),
      filename,
      src: variants.at(-1)!.src,
      srcSet: variants.map(({ src, width }) => `${src} ${width}w`).join(', '),
      width,
      height,
      color,
      palette,
      ...(vcardPhoto ? { vcardPhoto } : {}),
    }
  },
} satisfies CmxAssetLoader<{
  storage: MediaStorage
  sources: Record<string, Source>
}>
