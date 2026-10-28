import type { Handle, RemixNode } from 'remix/component'
import type { ImageSource } from './index.d.ts'

type Component<Props> = (handle: Handle<Props>) => () => RemixNode

export interface PoemCanvasProps {
  children?: RemixNode
}
export interface PoemOpeningProps {
  id: string
  title: string
  dates: { start: string; end: string }
  image: ImageSource
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

export interface InvitationGridProps {
  children?: RemixNode
}
export interface InvitationCardProps {
  id: string
  title: string
  action: { label: string; target: string }
  children?: RemixNode
}
export interface InvitationDetailsProps {
  id: string
  title: string
  children?: RemixNode
}
export declare const InvitationGrid: Component<InvitationGridProps>
export declare const InvitationCard: Component<InvitationCardProps>
export declare const InvitationDetails: Component<InvitationDetailsProps>
