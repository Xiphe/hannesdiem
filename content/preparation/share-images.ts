import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import sharp, { type OverlayOptions } from 'sharp'
import type { ContentRoute } from '../types.ts'
import config from '../cmx.config.ts'
import { storeMedia } from './media-storage.ts'

interface ShareImage {
  src: string
  width: number
  height: number
  alt: string
}
const width = 1052,
  height = 550
const routes: ContentRoute[] = JSON.parse(await readFile('.generated/routes.json', 'utf8'))
const storage = config.assets.loaders.image.options.storage
const output: Record<string, ShareImage> = {}

function escapeMarkup(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}
async function textImage(
  text: string | undefined,
  font: string,
  file: string,
  size: number,
  color: string,
) {
  if (!text?.trim()) return undefined
  return sharp({
    text: {
      text: `<span foreground="${color}" line_height="0.9">${escapeMarkup(text)}</span>`,
      font: `${font} ${size}`,
      fontfile: resolve('content/media/fonts', file),
      width: width - 64,
      align: 'center',
      wrap: 'word-char',
      rgba: true,
    },
  })
    .png()
    .toBuffer({ resolveWithObject: true })
}
async function shadow(
  input: Buffer,
  color: number,
  opacity: number,
  blur: number,
): Promise<Buffer> {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  for (let index = 0; index < data.length; index += 4) {
    data[index] = data[index + 1] = data[index + 2] = color
    data[index + 3] = Math.round(data[index + 3]! * opacity)
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .blur(blur)
    .png()
    .toBuffer()
}
for (const route of routes) {
  if (route.kind === 'release' && route.image) {
    const cover = route.image
    if (typeof cover === 'string') throw new Error('Import cover images directly')
    if (!cover.srcSet) throw new Error(`Missing cover variants: ${route.path}`)
    const variants = cover.srcSet.split(', ').map((item) => {
      const match = /^(.*) (\d+)w$/.exec(item)
      if (!match) throw new Error(`Invalid cover variant: ${item}`)
      return { src: match[1]!, width: Number(match[2]) }
    })
    const variant =
      variants.find((item) => item.width >= Math.min(640, cover.width)) ?? variants.at(-1)!
    output[route.path] = {
      src: variant.src,
      width: variant.width,
      height: Math.round((variant.width * cover.height) / cover.width),
      alt: cover.alt ?? route.title,
    }
    continue
  }
  if (route.kind !== 'song' && !(route.kind === 'page' && route.shareImage)) continue
  const song = route.kind === 'song'
  const foreground = song ? '#101828' : route.ogTextColor === 'dark' ? '#000000' : '#ffffff'
  const title = await textImage(
    route.ogImageTitle ?? route.title,
    song ? 'Fuggles' : 'Noto Sans ExtraBold',
    song ? 'Fuggles-Regular.ttf' : 'NotoSans-ExtraBold.ttf',
    120,
    foreground,
  )
  const subtitle = song
    ? undefined
    : await textImage(route.ogSubtitle, 'Noto Sans Light', 'NotoSans-Light.ttf', 35, foreground)
  let background: Buffer
  if (!song && route.image) {
    const routeImage = route.image
    if (typeof routeImage === 'string' || !('filename' in routeImage))
      throw new Error(`Import share images directly: ${route.path}`)
    const image = routeImage
    background = await sharp(`content/media/${image.filename}`)
      .rotate()
      .resize(width, height, { fit: 'cover', position: 'centre' })
      .png()
      .toBuffer()
  } else {
    background = await sharp({
      create: { width, height, channels: 4, background: song ? '#fff7ed' : '#ffffff' },
    })
      .png()
      .toBuffer()
  }
  const layers: OverlayOptions[] = []
  const spacer = song ? 0 : 48
  const totalHeight = (title?.info.height ?? 0) + (subtitle?.info.height ?? 0) + spacer
  let top = Math.round((height - totalHeight) / 2)
  for (const image of [title, subtitle]) {
    if (!image) continue
    if (image.info.height > height || top < 0)
      throw new Error(`Share image text exceeds canvas: ${route.path}`)
    layers.push({ input: image.data, top, left: Math.round((width - image.info.width) / 2) })
    top += image.info.height
  }
  if (layers.length) {
    const letters = await sharp({
      create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite(layers)
      .png()
      .toBuffer()
    background = await sharp(background)
      .composite([
        ...(!song && route.image
          ? [
              {
                input: await shadow(
                  letters,
                  foreground === '#ffffff' ? 0 : 255,
                  foreground === '#ffffff' ? 1 : 0.5,
                  foreground === '#ffffff' ? 50 : 25,
                ),
              },
            ]
          : []),
        { input: letters },
      ])
      .png()
      .toBuffer()
  }
  const image = await sharp(background).jpeg({ quality: 90, mozjpeg: true }).toBuffer()
  const sha256 = createHash('sha256').update(image).digest('hex')
  const stem = route.path.slice(1).replaceAll('/', '--')
  const key = `og/${stem}-${sha256.slice(0, 16)}.jpg`
  const src = await storeMedia(storage, key, image, 'image/jpeg')
  output[route.path] = {
    src,
    width,
    height,
    alt: route.ogImageTitle?.trim() || route.title,
  }
}
await writeFile('.generated/og.json', JSON.stringify(output, null, 2) + '\n')
console.log(`Share images: ${Object.keys(output).length} routes`)
