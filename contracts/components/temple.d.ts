import type { Handle, RemixNode } from 'remix/component'
import type { ImageSource, ButtonProps } from './index.d.ts'

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
  pair?: PoemPair
  pairs?: readonly PoemPair[]
  bridge?: readonly (readonly PoemLine[])[]
  /** Inline bridge copy supports **bold**, *italic*, and ***both***. */
  bridgeBody?: readonly (
    string | { text: string; wideBreaksAfter?: readonly string[]; linger?: string }
  )[]
  children?: RemixNode
}
export interface PoemSectionProps {
  id: string
  kind: 'verse' | 'bridge' | 'practicalities'
  children?: RemixNode
}
export declare const PoemCanvas: Component<PoemCanvasProps>
export declare const PoemOpening: Component<PoemOpeningProps>
export declare const PoemSection: Component<PoemSectionProps>
