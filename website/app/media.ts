import type { ImageSource, MediaImage } from '@hannesdiem/content-components'

export type { MediaImage } from '../../contracts/content.ts'

export function getMedia(images: Record<string, MediaImage>, image: ImageSource): MediaImage {
  if (typeof image !== 'string') return image
  const result = images[image]
  if (!result) throw new Error(`Unknown content image: ${image}`)
  return result
}
