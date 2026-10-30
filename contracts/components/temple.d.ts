import type { Handle, RemixNode } from 'remix/component'
import type { ImageSource } from './index.d.ts'

type Component<Props> = (handle: Handle<Props>) => () => RemixNode

export interface PoemCanvasProps {
  children?: RemixNode
}
export interface PoemLine {
  text: string
  shape?: 'sweep'
  face?: 'copy' | 'cinzel' | 'germania' | 'spaced'
}
export interface PoemPair {
  paragraphs: readonly (readonly PoemLine[])[]
  refrain: readonly {
    text: string
    display: string
    face: 'cinzel' | 'bricolage' | 'unbounded'
    lines?: readonly string[]
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
