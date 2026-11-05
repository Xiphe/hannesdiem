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
      text: `<span foreground="#403d36" weight="500" letter_spacing="8192">${date.toUpperCase().replaceAll('&', '&amp;')}</span>`,
      font: 'Bricolage Grotesque 34',
      fontfile: fileURLToPath(
        new URL('../../contracts/assets/temple/bricolage.ttf', import.meta.url),
      ),
      rgba: true,
    },
  })
    .png()
    .toBuffer({ resolveWithObject: true })
  const artwork = await sharp(frame)
    .resize(1200, 630, { fit: 'cover' })
    .flatten({ background: '#000' })
    .extract({ left: 0, top: 32, width: 1200, height: 598 })
    .png()
    .toBuffer()
  const bytes = await sharp({
    create: { width: 1200, height: 630, channels: 3, background: '#000' },
  })
    .composite([
      { input: artwork, left: 0, top: 0 },
      { input: label.data, left: Math.round((1200 - label.info.width) / 2), top: 550 },
    ])
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer()
  return { bytes, width: 1200, height: 630, date }
}
