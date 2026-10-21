import type { PaletteColor } from './theme.ts'

export interface MediaImage {
  src: string
  srcSet?: string
  width: number
  height: number
  alt?: string
  focalX?: number
  focalY?: number
  color?: string
  palette?: PaletteColor[]
}
export function getMedia(images: Record<string, MediaImage>, image: string): MediaImage {
  const result = images[image]
  if (!result) throw new Error(`Unknown content image: ${image}`)
  return result
}
