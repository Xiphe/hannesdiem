import type { Handle, RemixNode } from 'remix/component'
import type { ImageSource, ButtonProps, StreamVideoProps } from './index.d.ts'

type Component<Props> = (handle: Handle<Props>) => () => RemixNode

export interface PoemCanvasProps {
  children?: RemixNode
}
export interface PoemLine {
  text: string
  shape?: 'sweep'
  smallLines?: readonly string[]
  nowrap?: boolean
  /** Fraction of the reading column available for this line (default1). */
  width?: number
  face?: 'copy' | 'cinzel' | 'germania' | 'spaced'
}
export interface PoemPair {
  action?: Pick<ButtonProps, 'label' | 'href'> & { seed?: string }
  paragraphs: readonly (readonly PoemLine[])[]
  repetition?: readonly { statement: readonly PoemLine[]; reflection: PoemLine }[]
  refrain: readonly {
    text: string
    display: string
    face: 'cinzel' | 'bricolage' | 'unbounded' | 'germania'
    lines?: readonly string[]
    smallLines?: readonly string[]
  }[]
  coda: readonly PoemLine[]
  continuation?: readonly (readonly PoemLine[])[]
}
export interface PoemOpeningProps {
  id: string
  title: string
  dates: { start: string; end: string }
  image: ImageSource
  lightSource: { x: number; y: number }
  location?: PoemLocation
  facts?: readonly PoemFact[]
  navigation?: readonly {
    label: string
    href?: string
    /** The poem section represented by the piece immediately before this item. */
    verseBefore?: { label: string; href: string }
  }[]
  pair?: PoemPair
  pairs?: readonly PoemPair[]
  bridge?: readonly (readonly PoemLine[])[]
  /** Inline bridge copy supports **bold**, *italic*, and ***both***. */
  bridgeBody?: readonly (
    string | { text: string; wideBreaksAfter?: readonly string[]; linger?: string }
  )[]
  finalVerse?: {
    intro: readonly PoemLine[]
    phrases: readonly (readonly PoemLine[])[]
    rise?: readonly string[]
    drop?: string
    refrain?: PoemPair['refrain']
  }
  children?: RemixNode
}
/** An authored photographic fact, placed after a complete verse/refrain pair. */
export interface PoemFact {
  id: string
  afterPair: number
  layout: 'watch' | 'create'
  images: readonly [ImageSource, ImageSource]
  heading: string
  paragraphs: readonly string[]
  /** An omitted href keeps an unfinished action disabled. */
  action: { prompt: string; label: string; href?: string }
  /** Native CMX content immediately following this fact. */
  after?: RemixNode
}
export interface TempleVideoProps extends StreamVideoProps {
  id: string
  /** Rich-text description, authored as ordinary CMX children. */
  children?: RemixNode
}
export interface PoemLocation {
  image: ImageSource
  imageAlt: string
  heading: string
  venue: {
    name: string
    href: string
    travel: string
    latitude: number
    longitude: number
  }
  invitation: string
  action: { prompt: string; label: string; href: string }
}
export interface PoemSectionProps {
  id: string
  kind: 'verse' | 'bridge' | 'practicalities'
  children?: RemixNode
}
export declare const PoemCanvas: Component<PoemCanvasProps>
export declare const PoemOpening: Component<PoemOpeningProps>
export declare const PoemSection: Component<PoemSectionProps>
export declare const TempleVideo: Component<TempleVideoProps>
