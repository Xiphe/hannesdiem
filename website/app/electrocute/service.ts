import type { ElectroCuteSession } from '@hannesdiem/content-components'
import { digest } from '../newsletter/storage.ts'
import { validRange } from './model.ts'
import type { HighlightInput, HighlightIntent, RuntimeHighlight } from './contract.ts'

interface RecordHighlight {
  id: string
  session: string
  owner: string
  title: string
  start: number
  end: number
  revision: number
  updated: number
}
/** Read compatibility only; new writes have no moderation or per-highlight names. */
interface LegacyHighlight extends RecordHighlight {
  person?: string
  status?: 'approved' | 'rejected' | 'pending'
  withdrawn?: boolean
  hidden?: boolean
}
interface ProfileAlias {
  revision?: number
  alias: string
  updated: number
}
export interface HighlightTransaction {
  get<T>(key: string): Promise<T | undefined>
  put<T>(key: string, value: T): Promise<void>
  delete(key: string): Promise<unknown>
}
export interface HighlightStorage extends HighlightTransaction {
  list<T>(options: { prefix: string }): Promise<Map<string, T>>
  transaction<T>(callback: (tx: HighlightTransaction) => Promise<T>): Promise<T>
}
export class HighlightError extends Error {
  constructor(public status: number) {
    super('Highlight request rejected')
  }
}
const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/
const key = (session: string, id: string) => `h:${session}:${id}`
const text = (value: unknown, max: number): value is string =>
  typeof value === 'string' &&
  value.trim().length > 0 &&
  value.trim().length <= max &&
  !/[\u0000-\u001f\u007f]/u.test(value)

/** Mutable contributions stay separate from the artist's CMX Publication. */
export class HighlightService {
  constructor(
    private storage: HighlightStorage,
    private artistEmail: string,
    private now = Date.now,
  ) {}
  artist(email?: string) {
    return Boolean(
      email && this.artistEmail && email.toLowerCase() === this.artistEmail.toLowerCase(),
    )
  }
  async view(session: Pick<ElectroCuteSession, 'id' | 'duration'>, email?: string) {
    email = email?.toLowerCase()
    const artist = this.artist(email)
    const records = await this.storage.list<LegacyHighlight>({ prefix: `h:${session.id}:` })
    const highlights: RuntimeHighlight[] = []
    for (const record of records.values()) {
      // Do not republish contributions removed before permanent deletion existed.
      if (record.hidden || record.withdrawn) continue
      if (!validRange(record.start, record.end, session.duration)) continue
      const own = Boolean(email && record.owner === email)
      highlights.push({
        id: record.id,
        title: record.title,
        person: await this.person(record),
        start: record.start,
        end: record.end,
        revision: record.revision,
        own,
        canEdit: own || artist,
      })
    }
    highlights.sort((a, b) => a.start - b.start || a.id.localeCompare(b.id))
    const profile = email
      ? await this.storage.get<ProfileAlias>(`p:${await digest(email)}`)
      : undefined
    return { highlights, artist, alias: profile?.alias }
  }
  async mutate(
    session: Pick<ElectroCuteSession, 'id' | 'duration'>,
    email: string,
    intent: HighlightIntent,
    input: HighlightInput,
  ) {
    email = email.toLowerCase()
    if (intent === 'profile') {
      if (!text(input.alias, 20)) throw new HighlightError(400)
      const alias = input.alias.trim()
      const profileKey = `p:${await digest(email)}`
      await this.storage.transaction(async (tx) => {
        const current = await tx.get<ProfileAlias>(profileKey)
        await tx.put(profileKey, {
          alias,
          updated: this.now(),
          revision: (current?.revision ?? 0) + 1,
        })
      })
      return this.view(session, email)
    }
    if (!['save', 'delete'].includes(intent) || !uuid.test(input.id)) throw new HighlightError(400)
    const artist = this.artist(email)
    const recordKey = key(session.id, input.id)
    await this.storage.transaction(async (tx) => {
      const old = await tx.get<RecordHighlight>(recordKey)
      if (old && old.owner !== email && !artist) throw new HighlightError(403)
      if (old && old.revision !== input.revision) throw new HighlightError(409)
      if (!old && intent === 'delete') throw new HighlightError(404)
      // A stale editor cannot recreate a permanently deleted contribution.
      if (!old && input.revision !== undefined) throw new HighlightError(409)
      if (intent === 'delete') {
        await tx.delete(recordKey)
        return
      }
      if (
        !text(input.title, 120) ||
        typeof input.start !== 'number' ||
        typeof input.end !== 'number' ||
        !validRange(input.start, input.end, session.duration)
      )
        throw new HighlightError(400)
      await tx.put(recordKey, {
        id: input.id,
        session: session.id,
        owner: old?.owner ?? email,
        title: input.title.trim(),
        start: input.start,
        end: input.end,
        revision: (old?.revision ?? 0) + 1,
        updated: this.now(),
      } satisfies RecordHighlight)
    })
    return this.view(session, email)
  }
  private async person(record: LegacyHighlight) {
    const profileKey = `p:${await digest(record.owner)}`
    return this.storage.transaction(async (tx) => {
      let profile = await tx.get<ProfileAlias>(profileKey)
      if (record.person && (!record.status || record.status === 'approved')) {
        if (!profile) {
          profile = { alias: record.person, updated: record.updated }
          await tx.put(profileKey, profile)
        }
        const recordKey = key(record.session, record.id)
        const current = await tx.get<LegacyHighlight>(recordKey)
        if (current?.revision === record.revision) {
          const { person: _legacyName, ...linked } = current
          await tx.put(recordKey, linked)
        }
      }
      return profile?.alias ?? 'Listener'
    })
  }
}
