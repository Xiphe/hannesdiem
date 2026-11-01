import type { PoemPair, PoemLine } from '@hannesdiem/content-components'
export interface OpeningProps {
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
