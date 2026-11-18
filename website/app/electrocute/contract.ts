import type { ElectroCuteHighlight } from '@hannesdiem/content-components'
import type { SessionState } from '../identity/contract.ts'

export const highlightsPath = (session: string) => `/electrocute-api/${encodeURIComponent(session)}`
export type CheckResult = 'approved' | 'rejected' | 'pending'
export interface RuntimeHighlight extends ElectroCuteHighlight {
  revision: number
  status: CheckResult
  withdrawn: boolean
  hidden: boolean
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
  alias?: string
  start?: number
  end?: number
}
export type HighlightIntent = 'save' | 'withdraw' | 'hide' | 'restore' | 'retry'
export const isPublic = (item: Pick<RuntimeHighlight, 'status' | 'withdrawn' | 'hidden'>) =>
  item.status === 'approved' && !item.withdrawn && !item.hidden

export const highlightMessages = {
  failure: 'Highlights are temporarily unavailable. Please try again.',
  rejected: 'Please revise the title or public name. The text check did not accept them.',
  pending: 'Saved privately. The text check is unavailable and will retry automatically.',
  conflict: 'This highlight changed. Review your changes before saving again.',
}
