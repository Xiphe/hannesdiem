import type { ElectroCuteSession } from '@hannesdiem/content-components'
import { digest } from '../newsletter/storage.ts'
import { validRange } from './model.ts'
import {
  isPublic,
  type CheckResult,
  type HighlightInput,
  type HighlightIntent,
  type RuntimeHighlight,
} from './contract.ts'

interface RecordHighlight {
  id: string
  session: string
  owner: string
  title: string
  /** Read only during migration from the former per-highlight name snapshot. */
  person?: string
  start: number
  end: number
  revision: number
  status: CheckResult
  withdrawn: boolean
  hidden: boolean
  checkAt: number
  updated: number
}
interface ProfileAlias {
  revision?: number
  alias: string
  updated: number
}
export interface HighlightTransaction {
  get<T>(key: string): Promise<T | undefined>
  put<T>(key: string, value: T): Promise<void>
  setAlarm(time: number | Date): Promise<void>
}
export interface HighlightStorage extends HighlightTransaction {
  list<T>(options: { prefix: string }): Promise<Map<string, T>>
  transaction<T>(callback: (tx: HighlightTransaction) => Promise<T>): Promise<T>
  setAlarm(time: number | Date): Promise<void>
}
export type TextCheck = (title: string, alias: string) => Promise<CheckResult>
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
    private check: TextCheck,
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
    const records = await this.storage.list<RecordHighlight>({ prefix: `h:${session.id}:` })
    const highlights: RuntimeHighlight[] = []
    for (const record of records.values()) {
      const own = Boolean(email && record.owner === email)
      if (!isPublic(record) && !own && !artist) continue
      if (!validRange(record.start, record.end, session.duration)) continue
      // Never expose identity emails, storage keys or provider responses.
      highlights.push({
        id: record.id,
        title: record.title,
        person: await this.person(record),
        start: record.start,
        end: record.end,
        revision: record.revision,
        status: record.status,
        withdrawn: record.withdrawn,
        hidden: record.hidden,
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
      const previous = await this.storage.get<ProfileAlias>(profileKey)
      let result: CheckResult = 'pending'
      try {
        result = this.artist(email) ? 'approved' : await this.check('', alias)
      } catch {
        /* Keep the old name on an unavailable check. */
      }
      if (result !== 'approved') throw new HighlightError(result === 'rejected' ? 422 : 503)
      await this.storage.transaction(async (tx) => {
        const current = await tx.get<ProfileAlias>(profileKey)
        if (
          current?.revision !== previous?.revision ||
          current?.updated !== previous?.updated ||
          current?.alias !== previous?.alias
        )
          throw new HighlightError(409)
        await tx.put(profileKey, {
          alias,
          updated: this.now(),
          revision: (previous?.revision ?? 0) + 1,
        })
      })
      return this.view(session, email)
    }
    if (!uuid.test(input.id)) throw new HighlightError(400)
    const artist = this.artist(email)
    const recordKey = key(session.id, input.id)
    const record = await this.storage.transaction(async (tx) => {
      const old = await tx.get<RecordHighlight>(recordKey)
      if (old && old.owner !== email && !artist) throw new HighlightError(403)
      if (old && old.revision !== input.revision) throw new HighlightError(409)
      if (!old && intent !== 'save') throw new HighlightError(404)
      // A client-generated ID makes a retry safe: an existing ID needs its revision.
      if (!old && input.revision !== undefined) throw new HighlightError(409)
      let next: RecordHighlight
      if (intent === 'save') {
        if (
          !text(input.title, 120) ||
          typeof input.start !== 'number' ||
          typeof input.end !== 'number' ||
          !validRange(input.start, input.end, session.duration)
        )
          throw new HighlightError(400)
        const title = input.title.trim()
        const changed = old?.title !== title
        next = {
          id: input.id,
          session: session.id,
          owner: old?.owner ?? email,
          title,
          start: input.start,
          end: input.end,
          revision: (old?.revision ?? 0) + 1,
          status: artist ? 'approved' : changed ? 'pending' : old!.status,
          withdrawn: old?.withdrawn ?? false,
          hidden: old?.hidden ?? false,
          checkAt: this.now(),
          updated: this.now(),
        }
      } else {
        next = { ...old!, revision: old!.revision + 1 }
        if (intent === 'hide') {
          if (!artist) throw new HighlightError(403)
          next.hidden = true
        } else if (intent === 'withdraw') {
          if (next.owner !== email) throw new HighlightError(403)
          next.withdrawn = true
        } else if (intent === 'restore') {
          // Owners cannot undo the artist's hide; the two flags are independent.
          if (artist) next.hidden = false
          if (next.owner === email) next.withdrawn = false
        } else if (intent === 'retry') {
          next.status = artist ? 'approved' : 'pending'
          next.checkAt = this.now()
        } else throw new HighlightError(400)
      }
      await tx.put(recordKey, next)
      // Persist recovery atomically with the pending contribution.
      if (next.status === 'pending') await tx.setAlarm(this.now() + 60_000)
      return next
    })
    // Schedule before inference: a crash or disconnected client cannot lose retries.
    if (record.status === 'pending') {
      if (!record.hidden && !record.withdrawn) await this.review(record)
    }
    return this.view(session, email)
  }
  private async person(record: RecordHighlight) {
    const profileKey = `p:${await digest(record.owner)}`
    // Upgrade old accepted snapshots once. A profile change always wins over
    // an old highlight, including highlights from another session.
    return this.storage.transaction(async (tx) => {
      let profile = await tx.get<ProfileAlias>(profileKey)
      if (record.person && record.status === 'approved') {
        if (!profile) {
          profile = { alias: record.person, updated: record.updated }
          await tx.put(profileKey, profile)
        }
        const recordKey = key(record.session, record.id)
        const current = await tx.get<RecordHighlight>(recordKey)
        if (current?.revision === record.revision) {
          const { person: _legacyName, ...linked } = current
          await tx.put(recordKey, linked)
        }
      }
      return profile?.alias ?? 'Listener'
    })
  }
  private async review(record: RecordHighlight) {
    let status: CheckResult = 'pending'
    try {
      status = await this.check(record.title, record.person ?? (await this.person(record)))
    } catch {
      /* retry durably */
    }
    const reviewed = await this.storage.transaction(async (tx) => {
      const current = await tx.get<RecordHighlight>(key(record.session, record.id))
      // Edits, withdrawals and artist intervention win over an in-flight result.
      if (!current || current.revision !== record.revision || current.status !== 'pending') return
      const next = { ...current, status, checkAt: this.now() + 15 * 60_000 }
      await tx.put(key(record.session, record.id), next)
      return next
    })
    if (reviewed?.status === 'approved') await this.person(reviewed)
  }
  async maintain() {
    const records = await this.storage.list<RecordHighlight>({ prefix: 'h:' })
    const pending = [...records.values()]
      .filter((record) => record.status === 'pending' && !record.hidden && !record.withdrawn)
      .sort((a, b) => a.checkAt - b.checkAt)
    const next = pending[0]
    if (!next) return
    // Persist another wakeup before any external call.
    await this.storage.setAlarm(this.now() + 15 * 60_000)
    if (next.checkAt <= this.now()) await this.review(next)
    if (pending.length > 1) await this.storage.setAlarm(this.now() + 60_000)
  }
}
