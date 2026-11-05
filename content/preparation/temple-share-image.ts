import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { measurePoemShareTitle, type ShareLine } from './temple-share-type.ts'

export const templeCard = {
  width: 1200,
  height: 630,
  left: 64,
  right: 76,
  bottom: 55,
  captionTop: 200,
  gap: 16,
  nameSize: 40,
  maxTitleSize: 180,
  minTitleSize: 48,
  bottomOpacity: 0.8,
} as const

const fonts = fileURLToPath(new URL('../../contracts/assets/temple/', import.meta.url))
const ink = '#d2d0c8'
const warm = '#f2c8a5'
const cool = '#b5d6ee'
const nameColor = '#F7A264'
const titleWidth = templeCard.width - templeCard.left - templeCard.right

const escape = (text: string) =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

async function textMask(text: string, size: number, name = false) {
  return sharp({
    text: {
      text: `<span foreground="#ffffff" line_height="0.925" insert_hyphens="false"${name ? '' : ` letter_spacing="${Math.round(-size * 0.025 * 1024)}"`}>${escape(text)}</span>`,
      font: name ? `Cinzel Decorative Bold ${size}` : `Bricolage Grotesque ${size}`,
      fontfile: `${fonts}${name ? 'cinzeldecorative-bold.ttf' : 'bricolage.ttf'}`,
      width: titleWidth,
      rgba: true,
      wrap: 'word-char',
    },
  })
    .png()
    .toBuffer({ resolveWithObject: true })
}

async function measureTitle(text: string, size: number) {
  const mask = await textMask(text, size)
  const lineHeight = size * 1.12
  const lines = Math.max(1, Math.ceil((mask.info.height + size * 0.16) / lineHeight))
  return {
    ...mask,
    lines,
    sizes: Array.from({ length: lines }, () => size),
    height: Math.max(mask.info.height, Math.ceil(lines * lineHeight)),
  }
}

function luminance(rgb: readonly number[]) {
  const linear = rgb.map((value) => {
    const c = value / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722
}

function rgb(hex: string) {
  return [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16))
}

function requiredOpacity(background: number[], foreground: number, contrast: number) {
  const ceiling = (foreground + 0.05) / contrast - 0.05
  if (luminance(background) <= ceiling) return 0
  let lower = 0
  let upper: number = templeCard.bottomOpacity
  for (let i = 0; i < 12; i++) {
    const middle = (lower + upper) / 2
    if (luminance(background.map((channel) => channel * (1 - middle))) > ceiling) lower = middle
    else upper = middle
  }
  return upper
}

export interface TempleCardLayout {
  titleText: string
  titleTruncated: boolean
  titleSize: number
  titleLines: number
  titleLineSizes: number[]
  captionTop: number
  titleTop: number
  titleHeight: number
  gradient: { startY: number; topOpacity: number; bottomOpacity: number }
}

/** Fit the full title first; trim only the card text when it exceeds the readable lower bound. */
export async function renderTempleShareImage(input: {
  title: string
  lines?: readonly ShareLine[]
  background?: Uint8Array
  backgroundColor?: string
  /** The whole-Temple card needs its name once, as the main title. */
  showWordmark?: boolean
  /** Scale the visible gap between the name and title glyphs. */
  wordmarkGapScale?: number
}) {
  if (!input.title.trim()) throw new Error('Temple share cards require a nonempty title')
  const { width, height, left, bottom, captionTop, gap, nameSize, bottomOpacity } = templeCard
  const name = await textMask('Temple of Sound', nameSize, true)
  const showWordmark = input.showWordmark !== false
  const poem = input.lines !== undefined
  const nameHeight = showWordmark ? Math.max(Math.ceil(nameSize * 1.15), name.info.height) : 0
  const nameGap = showWordmark ? gap : 0
  const available = poem
    ? height - bottom - 160
    : height - bottom - captionTop - nameHeight - nameGap
  let fitted: Awaited<ReturnType<typeof measureTitle>> | undefined
  let size = templeCard.maxTitleSize as number
  let titleText = input.lines?.map((line) => line.text).join('\n') ?? input.title
  let titleTruncated = false
  // Fill the available caption area, respecting the readable lower bound.
  let low = templeCard.minTitleSize as number
  let high = size
  while (low <= high) {
    const candidate = Math.floor((low + high) / 2)
    const mask = input.lines
      ? await measurePoemShareTitle(input.lines, candidate, titleWidth)
      : await measureTitle(input.title, candidate)
    if (mask.height <= available) {
      fitted = mask
      size = candidate
      low = candidate + 1
    } else high = candidate - 1
  }
  if (!fitted) {
    size = templeCard.minTitleSize
    titleTruncated = true
    // Measure with the dots included, and never split a Unicode grapheme.
    const graphemes = Array.from(
      new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(input.title),
      ({ segment }) => segment,
    )
    low = 0
    high = graphemes.length - 1
    let kept = 0
    while (low <= high) {
      const candidate = Math.floor((low + high) / 2)
      const prefix = graphemes.slice(0, candidate).join('').trimEnd()
      const mask = await measureTitle(`${prefix}...`, size)
      if (mask.height <= available) {
        kept = candidate
        low = candidate + 1
      } else high = candidate - 1
    }
    const prefix = graphemes.slice(0, kept).join('')
    // Prefer a complete final word; unbroken titles can end at a character.
    const atWordBoundary = /\s$/u.test(prefix) || /^\s/u.test(graphemes[kept] ?? '')
    const completeWords = atWordBoundary ? prefix : prefix.replace(/\s+\S*$/u, '')
    titleText = `${completeWords.trimEnd() || prefix.trimEnd()}...`
    fitted = await measureTitle(titleText, size)
  }
  const titleHeight = fitted.height
  const titleTop = poem
    ? Math.round(160 + (available - titleHeight) / 2)
    : height - bottom - titleHeight
  const visibleGap = (titleHeight - fitted.info.height + nameGap) * (input.wordmarkGapScale ?? 1)
  const nameTop = poem
    ? 48
    : Math.round(titleTop + titleHeight - fitted.info.height - visibleGap - nameHeight)
  const nameLeft = poem ? Math.round((width - name.info.width) / 2) : left
  const titleLeft = poem ? Math.round((width - titleWidth) / 2) : left
  const background = await (
    input.background
      ? sharp(input.background).rotate().resize(width, height, { fit: 'cover' })
      : sharp({
          create: { width, height, channels: 3, background: input.backgroundColor ?? '#000000' },
        })
  )
    .flatten({ background: '#000000' })
    .removeAlpha()
    .raw()
    .toBuffer()

  // A straight ramp ending at 80%. Solve its start from the actual background
  // under both text roles. A start above the image gives a nonzero top shade;
  // dark photos can keep an unshaded upper area, even with a tall caption.
  let startY = Math.max(0, nameTop - 96)
  const titleLuminance = Math.min(...[ink, warm, cool].map((value) => luminance(rgb(value))))
  for (const box of [
    {
      top: nameTop,
      height: nameHeight,
      width: name.info.width,
      left: nameLeft,
      light: luminance(rgb(nameColor)),
      contrast: 3,
    },
    {
      top: titleTop,
      height: titleHeight,
      width: fitted.info.width,
      left: titleLeft,
      light: titleLuminance,
      contrast: 4.5,
    },
  ]) {
    for (let y = Math.floor(box.top); y < box.top + box.height; y += 8) {
      for (let x = box.left; x < box.left + box.width; x += 8) {
        const offset = (Math.min(height - 1, y) * width + x) * 3
        const alpha = requiredOpacity(
          [...background.subarray(offset, offset + 3)],
          box.light,
          box.contrast,
        )
        if (!alpha) continue
        const fraction = Math.min(0.999, alpha / bottomOpacity)
        startY = Math.min(startY, (y - fraction * height) / (1 - fraction))
      }
    }
  }
  startY = Math.floor(startY)
  const svg = (body: string) =>
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${body}</svg>`,
    )
  const shade = svg(
    `<defs><linearGradient id="shade" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="${startY}" y2="${height}"><stop stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="${bottomOpacity}"/></linearGradient></defs><path d="M0 0h${width}v${height}H0z" fill="url(#shade)"/>`,
  )
  const nameMask = await sharp({ create: { width, height, channels: 4, background: '#0000' } })
    .composite(
      showWordmark
        ? [{ input: name.data, left: nameLeft, top: nameTop + nameHeight - name.info.height }]
        : [],
    )
    .png()
    .toBuffer()
  const titleMask = await sharp({ create: { width, height, channels: 4, background: '#0000' } })
    .composite([
      { input: fitted.data, left: titleLeft, top: titleTop + titleHeight - fitted.info.height },
    ])
    .png()
    .toBuffer()
  // Match the accepted opaque warm/cool text field, now in the final glyph mask.
  const cloud = svg(
    `<defs><radialGradient id="warm"><stop stop-color="${warm}"/><stop offset="1" stop-color="${warm}" stop-opacity="0"/></radialGradient><radialGradient id="cool"><stop stop-color="${cool}"/><stop offset="1" stop-color="${cool}" stop-opacity="0"/></radialGradient></defs><path d="M0 0h${width}v${height}H0z" fill="${ink}"/><ellipse cx="${titleLeft + fitted.info.width * 0.85}" cy="${titleTop + titleHeight * 0.8}" rx="${fitted.info.width * 0.8}" ry="${titleHeight * 0.95}" fill="url(#cool)"/><ellipse cx="${titleLeft + fitted.info.width * 0.1}" cy="${titleTop + titleHeight * 0.15}" rx="${fitted.info.width * 0.85}" ry="${titleHeight}" fill="url(#warm)"/>`,
  )
  const coloredTitle = await sharp(cloud)
    .composite([{ input: titleMask, blend: 'dest-in' }])
    .png()
    .toBuffer()
  const coloredName = await sharp({ create: { width, height, channels: 4, background: nameColor } })
    .composite([{ input: nameMask, blend: 'dest-in' }])
    .png()
    .toBuffer()
  const bytes = await sharp(background, { raw: { width, height, channels: 3 } })
    .composite([{ input: shade }, { input: coloredTitle }, { input: coloredName }])
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer()
  const layout: TempleCardLayout = {
    titleText,
    titleTruncated,
    titleSize: Math.max(...fitted.sizes),
    titleLines: fitted.lines,
    titleLineSizes: fitted.sizes,
    captionTop: nameTop,
    titleTop,
    titleHeight,
    gradient: {
      startY,
      topOpacity: startY < 0 ? (bottomOpacity * -startY) / (height - startY) : 0,
      bottomOpacity,
    },
  }
  return { bytes, layout, width, height }
}
