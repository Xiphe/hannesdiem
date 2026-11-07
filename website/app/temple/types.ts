import type {
  PoemPair,
  PoemLine,
  PoemLocation,
  PoemFact,
  MediaImage,
  PoemOpeningProps,
} from '@hannesdiem/content-components'
export type LocationProps = Omit<PoemLocation, 'image'> & {
  id: string
  image: { src: string; srcSet?: string; width: number; height: number }
  mapAsset: string
}
export type FactProps = Omit<PoemFact, 'images'> & {
  images: readonly [MediaImage, ...MediaImage[]]
}
export interface OpeningProps {
  id: string
  view?: PoemOpeningProps['view']
  section?: PoemOpeningProps['section']
  welcome?: PoemOpeningProps['welcome']
  mark: string
  originalMark?: string
  navigation?: PoemOpeningProps['navigation']
  facts?: readonly FactProps[]
  location?: LocationProps
  pair?: PoemPair
  pairs?: readonly PoemPair[]
  bridge?: readonly (readonly PoemLine[])[]
  bridgeBody?: readonly (
    string | { text: string; wideBreaksAfter?: readonly string[]; linger?: string }
  )[]
  finalVerse?: PoemOpeningProps['finalVerse']
  title: string
  dates: { start: string; end: string }
  image: { src: string; width: number; height: number }
  lightSource: { x: number; y: number }
}
