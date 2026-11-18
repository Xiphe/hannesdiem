import type { Handle, RemixNode } from 'remix/component'

export interface ElectroCuteHighlight {
  id: string
  title: string
  person: string
  start: number
  end: number
}

export interface ElectroCuteSession {
  id: string
  title: string
  recordedAt: string
  src: string
  duration: number
  poster?: string
  highlights?: readonly ElectroCuteHighlight[]
}

export interface ElectroCuteArchiveProps {
  sessions: readonly ElectroCuteSession[]
  selectedId?: string
  /** Enables device-local draft editing instead of public contributions in test previews. */
  preview?: boolean
  children?: RemixNode
}

export declare const ElectroCuteArchive: (
  handle: Handle<ElectroCuteArchiveProps>,
) => () => RemixNode
