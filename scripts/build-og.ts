import { createHash } from 'node:crypto'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import sharp, { type OverlayOptions } from 'sharp'

interface Route {
  path: string
  kind: string
  image?: string
  title: string
  ogImageTitle?: string
  ogSubtitle?: string
  ogTextColor?: 'light' | 'dark'
  shareImage?: boolean
}
interface Media { src: string; srcSet: string; width: number; height: number; alt?: string; color?: string }
interface MediaFile { key: string; path: string; contentType: string; bytes: number; sha256: string }
interface ShareImage { src: string; width: number; height: number; alt: string }
const width = 1052, height = 550
const routes: Route[] = JSON.parse(await readFile('content/routes.json', 'utf8'))
const media: Record<string, Media> = JSON.parse(await readFile('.generated/media.json', 'utf8'))
const files: MediaFile[] = JSON.parse(await readFile('.generated/media-files.json', 'utf8'))
const retainedFiles = files.filter(file => !file.key.startsWith('og/'))
const first = Object.values(media)[0]!
const firstVariant = first.srcSet.split(', ')[0]!.replace(/ \d+w$/, '')
const firstKey = retainedFiles[0]!.key
if (!firstVariant.endsWith('/' + firstKey)) throw new Error('Cannot determine media base for share images')
const base = firstVariant.slice(0, -firstKey.length - 1)
const output: Record<string, ShareImage> = {}
await rm('.generated/media/og', { recursive: true, force: true })
await mkdir('.generated/media/og', { recursive: true })

function escapeMarkup(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}
async function textImage(text: string | undefined, font: string, file: string, size: number, color: string) {
  if (!text?.trim()) return undefined
  return sharp({ text: {
    text: `<span foreground="${color}" line_height="0.9">${escapeMarkup(text)}</span>`,
    font: `${font} ${size}`, fontfile: resolve('content/media/fonts', file),
    width: width - 64, align: 'center', wrap: 'word-char', rgba: true,
  } }).png().toBuffer({ resolveWithObject: true })
}
async function shadow(input: Buffer, color: number, opacity: number, blur: number): Promise<Buffer> {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  for (let index = 0; index < data.length; index += 4) {
    data[index] = data[index + 1] = data[index + 2] = color
    data[index + 3] = Math.round(data[index + 3]! * opacity)
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).blur(blur).png().toBuffer()
}
for (const route of routes) {
  if (route.kind === 'release' && route.image) {
    const cover = media[route.image]!
    const variants = cover.srcSet.split(', ').map(item => {
      const match = /^(.*) (\d+)w$/.exec(item)
      if (!match) throw new Error(`Invalid cover variant: ${item}`)
      return { src: match[1]!, width: Number(match[2]) }
    })
    const variant = variants.find(item => item.width >= Math.min(640, cover.width)) ?? variants.at(-1)!
    output[route.path] = { src: variant.src, width: variant.width, height: Math.round(variant.width * cover.height / cover.width), alt: cover.alt ?? route.title }
    continue
  }
  if (route.kind !== 'song' && !(route.kind === 'page' && route.shareImage)) continue
  const song = route.kind === 'song'
  const foreground = song ? '#101828' : route.ogTextColor === 'dark' ? '#000000' : '#ffffff'
  const title = await textImage(route.ogImageTitle ?? route.title, song ? 'Fuggles' : 'Noto Sans ExtraBold', song ? 'Fuggles-Regular.ttf' : 'NotoSans-ExtraBold.ttf', 120, foreground)
  const subtitle = song ? undefined : await textImage(route.ogSubtitle, 'Noto Sans Light', 'NotoSans-Light.ttf', 35, foreground)
  let background: Buffer
  if (!song && route.image) {
    if (!media[route.image]) throw new Error(`Unknown share image: ${route.image}`)
    background = await sharp(`content/media/${route.image}`).rotate().resize(width, height, { fit: 'cover', position: 'centre' }).png().toBuffer()
  } else {
    background = await sharp({ create: { width, height, channels: 4, background: song ? '#fff7ed' : '#ffffff' } }).png().toBuffer()
  }
  const layers: OverlayOptions[] = []
  const spacer = song ? 0 : 48
  const totalHeight = (title?.info.height ?? 0) + (subtitle?.info.height ?? 0) + spacer
  let top = Math.round((height - totalHeight) / 2)
  for (const image of [title, subtitle]) {
    if (!image) continue
    if (image.info.height > height || top < 0) throw new Error(`Share image text exceeds canvas: ${route.path}`)
    layers.push({ input: image.data, top, left: Math.round((width - image.info.width) / 2) })
    top += image.info.height
  }
  if (layers.length) {
    const letters = await sharp({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(layers).png().toBuffer()
    background = await sharp(background).composite([
      ...(!song && route.image ? [{ input: await shadow(letters, foreground === '#ffffff' ? 0 : 255, foreground === '#ffffff' ? 1 : 0.5, foreground === '#ffffff' ? 50 : 25) }] : []),
      { input: letters },
    ]).png().toBuffer()
  }
  const image = await sharp(background).jpeg({ quality: 90, mozjpeg: true }).toBuffer()
  const sha256 = createHash('sha256').update(image).digest('hex')
  const stem = route.path.slice(1).replaceAll('/', '--')
  const key = `og/${stem}-${sha256.slice(0, 16)}.jpg`
  const path = `.generated/media/${key}`
  await writeFile(path, image)
  retainedFiles.push({ key, path, contentType: 'image/jpeg', bytes: image.length, sha256 })
  output[route.path] = { src: `${base}/${key}`, width, height, alt: route.ogImageTitle?.trim() || route.title }
}
await writeFile('.generated/og.json', JSON.stringify(output, null, 2) + '\n')
const metadata = Buffer.from(JSON.stringify({ version: 1, images: media, shareImages: output }))
const metadataHash = createHash('sha256').update(metadata).digest('hex')
const metadataKey = `metadata/manifest-${metadataHash.slice(0, 16)}.json`
await mkdir('.generated/media/metadata', { recursive: true })
await writeFile(`.generated/media/${metadataKey}`, metadata)
const uploadFiles = retainedFiles.filter(file => !file.key.startsWith('metadata/'))
uploadFiles.push({ key: metadataKey, path: `.generated/media/${metadataKey}`, contentType: 'application/json', bytes: metadata.length, sha256: metadataHash })
await writeFile('.generated/media-files.json', JSON.stringify(uploadFiles, null, 2) + '\n')
console.log(`Share images: ${Object.keys(output).length} routes, ${retainedFiles.filter(file => file.key.startsWith('og/')).length} generated cards`)
