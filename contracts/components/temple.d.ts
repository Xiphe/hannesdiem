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
  /** Separate intention and practical views of the same authored Temple. */
  view?: 'poem' | 'inside'
  section?: 'visit' | 'watch' | 'create' | 'share'
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
  layout: 'watch' | 'create' | 'share'
  images: readonly [ImageSource, ...ImageSource[]]
  /** Public circle structure; membership remains private runtime state. */
  circle?: {
    places: number
    label?: string
    occupied?: readonly number[]
    reservation?: 'temple-circle'
  }
  heading: string
  paragraphs: readonly string[]
  /** An omitted href keeps an unfinished action disabled. */
  action?: { prompt: string; label: string; href?: string; newsletter?: 'temple' }
  /** Native CMX content immediately following this fact. */
  after?: RemixNode
}
export interface TempleVideoProps extends StreamVideoProps {
  id: string
  /** ISO posting timestamp with timezone; display is localized by the website. */
  postedAt?: string
  /** Optional cover; defaults to the Stream thumbnail. */
  cover?: ImageSource
  /** Rich-text description, authored as ordinary CMX children. */
  children?: RemixNode
}
export interface TempleRecordingsProps {
  videos: readonly (TempleVideoProps & { postedAt: string })[]
}
interface TemplePostBase {
  id: string
  title: string
  postedAt: string
  cover?: ImageSource
  /** Rich description displayed in the paused viewer's bottom layer. */
  children?: RemixNode
}
export type TemplePost =
  | (TemplePostBase & StreamVideoProps & { kind: 'video' })
  | (TemplePostBase & {
      kind: 'audio'
      src: string
      /** Normalized, precomputed peaks; otherwise decoded when the audio is opened. */
      waveform?: readonly number[]
    })
  | (TemplePostBase & { kind: 'text'; body: RemixNode })
export interface TemplePostsProps {
  posts: readonly TemplePost[]
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
export declare const TempleRecordings: Component<TempleRecordingsProps>
export declare const TemplePosts: Component<TemplePostsProps>
