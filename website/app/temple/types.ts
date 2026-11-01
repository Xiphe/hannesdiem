import type { PoemPair, PoemLine, PoemLocation } from '@hannesdiem/content-components'
export type LocationProps = Omit<PoemLocation, 'image'> & {
  id: string
  image: { src: string; srcSet?: string; width: number; height: number }
  mapAsset: string
}
export interface OpeningProps {
  location?: LocationProps
  pair?: PoemPair
  pairs?: readonly PoemPair[]
  bridge?: readonly (readonly PoemLine[])[]
  bridgeBody?: readonly (
    string | { text: string; wideBreaksAfter?: readonly string[]; linger?: string }
  )[]
  title: string
  dates: { start: string; end: string }
  image: { src: string; width: number; height: number }
  lightSource: { x: number; y: number }
}
