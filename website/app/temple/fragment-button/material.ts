import { randomFrom, type Piece } from './fragment-generator.ts'

// Shared soft joins retain the straight cuts used to assemble the live border.
export const fragmentStroke = 1.8
export const patternSize = { width: 1920, height: 1600 }

export function placeGroundPieces(pieces: readonly Piece[], seed: string) {
  const random = randomFrom(seed + '/ground')
  const columns = 2
  const rows = 3
  const cellWidth = patternSize.width / columns
  const cellHeight = patternSize.height / rows
  const placements = []
  if (pieces.length)
    for (let row = 0; row < rows; row++)
      for (let column = 0; column < columns; column++) {
        const index = (row * columns + column) % pieces.length
        const piece = pieces[index]
        const size = piece.size * 24
        const x = (column + 0.5) * cellWidth + (random() - 0.5) * cellWidth * 0.54
        const y = (row + 0.5) * cellHeight + (random() - 0.5) * cellHeight * 0.54
        const angle = random() * 360
        const tone = Math.round(7 + random() * 8)
        placements.push({ index, size, x, y, angle, tone, layer: (row * columns + column) % 3 })
      }
  return placements
}

export type GroundMaterial = { pieces: readonly Piece[]; seed: string }
const groundMaterials = new WeakMap<HTMLElement, GroundMaterial>()
export const groundMaterialEvent = 'fragment-ground-material'
export function provideGroundMaterial(host: HTMLElement, material: GroundMaterial) {
  groundMaterials.set(host, material)
  host.dispatchEvent(new Event(groundMaterialEvent))
}
export function groundMaterial(host: HTMLElement) {
  return groundMaterials.get(host)
}
