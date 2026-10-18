import { createHash } from 'node:crypto'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, extname } from 'node:path'
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

type Source = { alt: string; width: number; height: number; focalX: number; focalY: number; sourceId?: string }
type Swatch = { name: string; color: string; hsl: [number, number, number]; population: number }
type Palette = { sha256: string; color: string; palette: Swatch[] }
async function palettesAt(path: string): Promise<Record<string, Palette>> {
  try { return JSON.parse(await readFile(path, 'utf8')) } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {}
    throw error
  }
}

const base = mediaBase(process.env.MEDIA_BASE_URL ?? '/media')
const sources: Record<string, Source> = JSON.parse(await readFile('content/media.json', 'utf8'))
const savedPalettes = await palettesAt('content/palettes.json')
const processedPalettes = await palettesAt('.generated/palettes.json')
await rm('.generated/media', { recursive: true, force: true })
await mkdir('.generated/media', { recursive: true })
const files: { key: string; path: string; contentType: string; bytes: number; sha256: string }[] = []
const manifest: Record<string, unknown> = {}
for (const [filename, source] of Object.entries(sources)) {
  if (filename.includes('/') || filename.includes('\\') || filename.startsWith('.')) throw new Error(`Unsafe media filename: ${filename}`)
  const input = await readFile(`content/media/${filename}`)
  const sourceSha256 = createHash('sha256').update(input).digest('hex')
  const metadata = await sharp(input).metadata()
  const rotated = [5, 6, 7, 8].includes(metadata.orientation ?? 1)
  const width = rotated ? metadata.height! : metadata.width!
  const height = rotated ? metadata.width! : metadata.height!
  if (!width || !height) throw new Error(`Missing image dimensions: ${filename}`)
  const widths = [...new Set([320, 480, 960, 1440, 1920, Math.min(width, 2560)].filter(candidate => candidate <= width))].sort((a, b) => a - b)
  const stem = filename.slice(0, -extname(filename).length).replace(/[^a-zA-Z0-9_-]+/g, '-')
  const variants: { src: string; width: number }[] = []
  for (const variantWidth of widths) {
    const image = await sharp(input).rotate().resize({ width: variantWidth, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer()
    const sha256 = createHash('sha256').update(image).digest('hex')
    const key = `images/${stem}-${variantWidth}-${sha256.slice(0, 16)}.webp`
    const path = `.generated/media/${key}`
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, image)
    files.push({ key, path, contentType: 'image/webp', bytes: image.length, sha256 })
    variants.push({ src: `${base}/${key}`, width: variantWidth })
  }
  const palette = [processedPalettes[filename], savedPalettes[filename]].find(value => value?.sha256 === sourceSha256)
  manifest[filename] = {
    ...source,
    src: variants.at(-1)!.src,
    srcSet: variants.map(({ src, width }) => `${src} ${width}w`).join(', '),
    width, height, sourceSha256,
    ...(palette?.sha256 === sourceSha256 ? { color: palette.color, palette: palette.palette } : {}),
  }
}
await writeFile('.generated/media.json', JSON.stringify(manifest, null, 2) + '\n')
await writeFile('.generated/media-files.json', JSON.stringify(files, null, 2) + '\n')
console.log(`Content media: ${Object.keys(manifest).length} images, ${files.length} WebP variants, ${files.reduce((bytes, file) => bytes + file.bytes, 0)} bytes`)
