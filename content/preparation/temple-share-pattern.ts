import { fragmentStroke, generateFragments, randomFrom } from '../../contracts/temple/fragments.ts'

/** A stationary crop of the page's seeded fragment material, stable for each share identity. */
export function templeSharePattern(seed: string, width = 1200, height = 630) {
  const pieces = generateFragments(seed, 11)
  const random = randomFrom(`${seed}/share-ground`)
  const shapes = Array.from({ length: 9 }, (_, index) => {
    const piece = pieces[index]
    const x = Math.round(width * (0.05 + random() * 0.9))
    const y = Math.round(height * (0.05 + random() * 0.9))
    const angle = Math.round(random() * 360)
    const scale = Math.round((piece.size / 28) * 14)
    const tone = Math.round(7 + random() * 8)
    const colour = (shift: number) => `rgb(${tone + shift},${tone + 1 + shift},${tone + shift})`
    return `<defs><linearGradient id="piece-${index}" x2="100%" y2="100%"><stop stop-color="${colour(2)}"/><stop offset="1" stop-color="${colour(-2)}"/></linearGradient></defs><path transform="translate(${x} ${y}) rotate(${angle}) scale(${scale})" d="${piece.d}" fill="url(#piece-${index})" stroke="url(#piece-${index})" stroke-width="${fragmentStroke}" stroke-linejoin="round" stroke-linecap="round"/>`
  })
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><path fill="#000" d="M0 0h${width}v${height}H0z"/>${shapes.join('')}</svg>`,
  )
}
