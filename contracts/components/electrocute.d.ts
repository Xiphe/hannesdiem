import type { Handle, RemixNode } from 'remix/component'

export interface ElectroCuteHighlight {
  id: string
  title: string
  person: string
  start: number
  end: number
}

export interface ElectroCuteSession {
  /** Stable key used for saved highlights and listening progress. */
  id: string
  /** Public Feed address. Legacy Publications use the session ID. */
  slug?: string
  romanNumeral?: string
  title: string
  subheadline?: string
  recordedAt: string
  src: string
  duration: number
  /** Source frame rate, required for frame-accurate keyboard trimming. */
  frameRate?: number
  poster?: string
  highlights?: readonly ElectroCuteHighlight[]
}

export interface ElectroCuteArchiveProps {
  sessions: readonly ElectroCuteSession[]
  selectedId?: string
  /** Open archive entries in the published Feed. */
  feed?: boolean
  /** Enables device-local draft editing instead of public contributions in test previews. */
  preview?: boolean
  children?: RemixNode
}

export declare const ElectroCuteArchive: (
  handle: Handle<ElectroCuteArchiveProps>,
) => () => RemixNode
