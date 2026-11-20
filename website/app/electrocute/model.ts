import type { ElectroCuteHighlight, ElectroCuteSession } from '@hannesdiem/content-components'

export const archivePath = '/electrocute'
export const sessionPath = (id: string) => `${archivePath}/${encodeURIComponent(id)}`
export const highlightPath = (session: string, highlight: string, list = false) =>
  `${sessionPath(session)}?highlight=${encodeURIComponent(highlight)}${list ? '&highlights=1' : ''}`

export function clock(seconds: number) {
  const value = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0))
  const hours = Math.floor(value / 3600)
  const minutes = Math.floor((value % 3600) / 60)
  const rest = String(value % 60).padStart(2, '0')
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${rest}` : `${minutes}:${rest}`
}

export function parseClock(value: string): number | undefined {
  if (!/^\d+(?::[0-5]\d){1,2}$/.test(value.trim())) return
  return value
    .trim()
    .split(':')
    .reduce((total, part) => total * 60 + Number(part), 0)
}

export function validRange(start: number, end: number, duration: number) {
  return (
    [start, end, duration].every(Number.isFinite) && start >= 0 && start < end && end <= duration
  )
}

export function defaultRange(position: number, duration: number) {
  const start = Math.min(Math.max(0, position), Math.max(0, duration - 1))
  return { start, end: Math.min(start + 60, duration) }
}

export function sortedSessions(sessions: readonly ElectroCuteSession[], newest = false) {
  return [...sessions].sort(
    (a, b) =>
      (newest ? -1 : 1) * (a.recordedAt.localeCompare(b.recordedAt) || a.id.localeCompare(b.id)),
  )
}

export function validateSessions(sessions: readonly ElectroCuteSession[]) {
  const ids = new Set<string>()
  for (const session of sessions) {
    if (!/^[a-z0-9][a-z0-9-]*$/i.test(session.id) || ids.has(session.id))
      throw new Error('ElectroCute session IDs must be unique URL-safe identifiers')
    ids.add(session.id)
    const recordedAt = new Date(`${session.recordedAt}T12:00:00Z`)
    if (
      !session.title.trim() ||
      !/^\d{4}-\d{2}-\d{2}$/.test(session.recordedAt) ||
      !Number.isFinite(recordedAt.getTime()) ||
      recordedAt.toISOString().slice(0, 10) !== session.recordedAt
    )
      throw new Error('ElectroCute sessions need a title and recording date')
    if (!Number.isFinite(session.duration) || session.duration <= 0)
      throw new Error('ElectroCute sessions need a positive duration')
    if (
      session.frameRate !== undefined &&
      (!Number.isFinite(session.frameRate) || session.frameRate <= 0)
    )
      throw new Error('ElectroCute frame rates must be positive')
    const source = new URL(session.src, 'https://hannesdiem.de')
    if (source.protocol !== 'https:' || source.username || source.password)
      throw new Error('ElectroCute sources must use HTTPS or a local absolute path')
    if (decodeURIComponent(source.pathname).toLowerCase().includes('ignore this'))
      throw new Error('ElectroCute recordings marked ignore this cannot be published')
    const highlights = new Set<string>()
    for (const highlight of session.highlights ?? []) {
      if (
        highlights.has(highlight.id) ||
        !highlight.id ||
        !highlight.title.trim() ||
        !highlight.person.trim() ||
        !validRange(highlight.start, highlight.end, session.duration)
      )
        throw new Error('Invalid ElectroCute highlight')
      highlights.add(highlight.id)
    }
  }
}

export interface ListeningProgress {
  positions: Record<string, number>
  latest?: string
}

/** Reject stale IDs, malformed storage and out-of-range positions at the boundary. */
export function readProgress(
  raw: string | null,
  sessions: readonly ElectroCuteSession[],
): ListeningProgress {
  const result: ListeningProgress = { positions: {} }
  try {
    const value = JSON.parse(raw ?? '{}')
    for (const session of sessions) {
      const position = value?.positions?.[session.id]
      if (
        typeof position === 'number' &&
        Number.isFinite(position) &&
        position > 0 &&
        position < session.duration
      )
        result.positions[session.id] = position
    }
    if (typeof value?.latest === 'string' && Object.hasOwn(result.positions, value.latest))
      result.latest = value.latest
  } catch {
    /* Storage is optional. */
  }
  return result
}

export function readDrafts(raw: string | null, duration: number): ElectroCuteHighlight[] {
  try {
    const value: unknown = JSON.parse(raw ?? '[]')
    if (!Array.isArray(value)) return []
    const ids = new Set<string>()
    return value.filter((item): item is ElectroCuteHighlight => {
      if (
        !item ||
        typeof item.id !== 'string' ||
        ids.has(item.id) ||
        typeof item.title !== 'string' ||
        !item.title.trim() ||
        typeof item.person !== 'string' ||
        !item.person.trim() ||
        !validRange(item.start, item.end, duration)
      )
        return false
      ids.add(item.id)
      return true
    })
  } catch {
    return []
  }
}
