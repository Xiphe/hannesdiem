import type { MediaImage } from '../../contracts/content.ts'

export type { MediaImage } from '../../contracts/content.ts'

export function getMedia(images: Record<string, MediaImage>, image: string): MediaImage {
  const result = images[image]
  if (!result) throw new Error(`Unknown content image: ${image}`)
  return result
}
