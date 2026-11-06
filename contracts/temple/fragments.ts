// Pure seeded shape geometry shared by the website and publication images.
export const fragmentStroke = 1.8
export type Piece = {
  d: string
  size: number
}
export function randomFrom(seed: string) {
  let state = 2166136261
  for (const char of seed) state = Math.imul(state ^ char.charCodeAt(0), 16777619)
  return () => {
    let n = (state += 0x6d2b79f5)
    n = Math.imul(n ^ (n >>> 15), n | 1)
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61)
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296
  }
}
const rounded = (n: number) => Math.round(n * 1000) / 1000

export function generateFragments(seed: string, count: number): Piece[] {
  const random = randomFrom(seed)
  const between = (a: number, b: number) => rounded(a + random() * (b - a))
  return Array.from({ length: Math.max(1, Math.min(20, Math.round(count))) }, () => {
    const thickness = between(4, 14)
    const cut = between(-5, 4)
    let d: string
    // Oblique facets and concave cuts, rather than rectangular tabs. The inward
    // edge remains a placement reference, but the rest of the shape is not a grid.
    switch (Math.floor(random() * 4)) {
      case 0:
        d = `M-14 0L14 ${between(-3, -0.5)}L${between(-3, 10)} ${-thickness}L${between(-13, -8)} ${-thickness * between(0.15, 0.55)}Z`
        break
      case 1:
        d = `M-14 ${between(-3, -1)}L11 0L14 ${-thickness * 0.65}L${between(4, 8)} ${-thickness}Q${between(-6, 2)} ${-thickness * 0.1} -12 ${-thickness * between(0.65, 1)}Z`
        break
      case 2:
        d = `M-14 ${between(-3, -1)}L8 0L14 ${-thickness * 0.4}L${between(3, 7)} ${-thickness}L${cut} ${-thickness * 0.25}L${between(-12, -7)} ${-thickness * between(0.7, 1)}Z`
        break
      default:
        d = `M-14 0L9 ${between(-3, -0.5)}Q14 ${-thickness * 0.25} 12 ${-thickness * 0.65}L${cut} ${-thickness}L${between(-12, -8)} ${-thickness * 0.45}Z`
    }
    return { d, size: between(44, 80) }
  })
}
