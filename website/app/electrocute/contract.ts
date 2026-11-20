import type { ElectroCuteHighlight } from '@hannesdiem/content-components'
import type { SessionState } from '../identity/contract.ts'

export const highlightsPath = (session: string) => `/electrocute-api/${encodeURIComponent(session)}`
export interface RuntimeHighlight extends ElectroCuteHighlight {
  revision: number
  own: boolean
  canEdit: boolean
}
export interface HighlightState extends SessionState {
  highlights: RuntimeHighlight[]
  artist: boolean
  alias?: string
  suggestedAlias?: string
}
export interface HighlightInput {
  id: string
  revision?: number
  title?: string
  /** Only accepted by the separate profile intent; never stored on a highlight. */
  alias?: string
  start?: number
  end?: number
}
export type HighlightIntent = 'save' | 'delete' | 'profile'

export const highlightMessages = {
  failure: 'Highlights are temporarily unavailable. Please try again.',
  conflict: 'This highlight changed. Review your changes before saving again.',
}
