import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

export async function renderTempleOpenerShareImage(
  frame: Uint8Array,
  dates: { start: string; end: string },
) {
  const month = (value: string, year: boolean) =>
    new Intl.DateTimeFormat('en', {
      month: 'long',
      ...(year ? { year: 'numeric' as const } : {}),
      timeZone: 'UTC',
    }).format(new Date(value))
  const date = `${month(dates.start, false)} & ${month(dates.end, true)}`
  const label = await sharp({
    text: {
      text: `<span foreground="#d2d0c8" letter_spacing="3482">${date.toUpperCase().replaceAll('&', '&amp;')}</span>`,
      font: 'Bricolage Grotesque 34',
      fontfile: fileURLToPath(
        new URL('../../contracts/assets/temple/bricolage.ttf', import.meta.url),
      ),
      rgba: true,
    },
  })
    .png()
    .toBuffer({ resolveWithObject: true })
  const bytes = await sharp(frame)
    .resize(1200, 630, { fit: 'cover' })
    .flatten({ background: '#000' })
    .composite([{ input: label.data, left: Math.round((1200 - label.info.width) / 2), top: 25 }])
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer()
  return { bytes, width: 1200, height: 630, date }
}
