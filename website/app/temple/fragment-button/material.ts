import type { Piece } from './fragment-generator.ts'

// Shared soft joins retain the generated fragments’ straight cuts.
export { fragmentStroke } from '../../../../contracts/temple/fragments.ts'
export type GroundMaterial = { pieces: readonly Piece[]; seed: string }
const groundMaterials = new WeakMap<HTMLElement, GroundMaterial>()
export function provideGroundMaterial(host: HTMLElement, material: GroundMaterial) {
  groundMaterials.set(host, material)
}
export function groundMaterial(host: HTMLElement) {
  return groundMaterials.get(host)
}
