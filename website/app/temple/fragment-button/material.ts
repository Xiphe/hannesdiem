import type { Piece } from './fragment-generator.ts'

// Shared soft joins retain the straight cuts used to assemble the live border.
export { fragmentStroke } from '../../../../contracts/temple/fragments.ts'
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
