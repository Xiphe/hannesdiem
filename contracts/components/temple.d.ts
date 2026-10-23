import type { Handle, RemixNode } from 'remix/component'

type Component<Props> = (handle: Handle<Props>) => () => RemixNode

export interface PoemCanvasProps {
  children?: RemixNode
}
export interface PoemOpeningProps {
  id: string
  title: string
  dates: { start: string; end: string }
  image: string
  lightSource: { x: number; y: number }
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
