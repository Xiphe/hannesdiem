import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import type { PoemLine } from '@hannesdiem/content-components'

export type ShareLine = Pick<PoemLine, 'text' | 'face'>
const fonts = fileURLToPath(new URL('../../contracts/assets/temple/', import.meta.url))
const escape = (text: string) =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

async function lineMask(line: ShareLine, size: number, tracking = 0) {
  const cinzel = line.face === 'cinzel'
  const germania = line.face === 'germania'
  return sharp({
    text: {
      text: `<span foreground="#fff" weight="${cinzel ? 700 : germania ? 400 : line.face === 'spaced' ? 500 : 350}" letter_spacing="${Math.round(tracking * 1024)}">${escape(line.text)}</span>`,
      font: `${cinzel ? 'Cinzel Decorative' : germania ? 'Germania One' : 'Unbounded'} ${size}`,
      fontfile: `${fonts}${cinzel ? 'cinzeldecorative-bold.ttf' : germania ? 'germaniaone.ttf' : 'unbounded.ttf'}`,
      rgba: true,
    },
  })
    .png()
    .toBuffer({ resolveWithObject: true })
}

/** Match the poem's separately fitted, explicitly authored lines and native typefaces. */
export async function measurePoemShareTitle(
  lines: readonly ShareLine[],
  maximum: number,
  width: number,
) {
  if (!lines.length || lines.some((line) => !line.text.trim()))
    throw new Error('Poem share lines require text')
  const masks = []
  for (const line of lines) {
    let size = line.face === 'spaced' ? Math.min(maximum, width * 0.05) : maximum
    let mask = await lineMask(line, size)
    if (mask.info.width > width) {
      size = Math.max(1, Math.floor((size * width) / mask.info.width))
      mask = await lineMask(line, size)
    }
    while (mask.info.width > width && size > 1) mask = await lineMask(line, --size)
    if (line.face === 'spaced') {
      const letters = [...line.text].length
      mask = await lineMask(
        line,
        size,
        Math.max(0, (width - mask.info.width - 2) / Math.max(1, letters - 1)),
      )
    }
    masks.push({ ...mask, size })
  }
  const gap = Math.max(12, Math.round(maximum * 0.12))
  const height =
    masks.reduce((height, mask) => height + mask.info.height, 0) + gap * (masks.length - 1)
  let top = 0
  const layers = masks.map((mask) => {
    const layer = { input: mask.data, left: Math.round((width - mask.info.width) / 2), top }
    top += mask.info.height + gap
    return layer
  })
  const result = await sharp({ create: { width, height, channels: 4, background: '#0000' } })
    .composite(layers)
    .png()
    .toBuffer({ resolveWithObject: true })
  return { ...result, height, lines: lines.length, sizes: masks.map((mask) => mask.size) }
}
