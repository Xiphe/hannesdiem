import type { PoemPair } from '@hannesdiem/content-components'
export interface OpeningProps {
  pair?: PoemPair
  title: string
  dates: { start: string; end: string }
  image: { src: string; width: number; height: number }
  lightSource: { x: number; y: number }
}
