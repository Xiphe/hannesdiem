import { circleCapacity, validCircleAlias, type PublicPlace } from './contract.ts'
import type { CircleProvider } from './provider.ts'

interface Place {
  id: string
  email: string
  alias: string
  notificationAlias: string
  notificationSpot?: number
  spot: number
  phase: 'claiming' | 'active' | 'releasing' | 'released'
  release?: { created: number; notified: boolean; notificationStopped?: boolean }
  reactivate: boolean
  notified: boolean
  notificationStopped?: boolean
  created: number
  checked: number
}
interface WaitingInterest {
  id: string
  email: string
  alias: string
  notified: boolean
  notificationStopped?: boolean
  created: number
  checked: number
}
interface CircleData {
  places: Place[]
  waiting: WaitingInterest[]
}
interface CircleTransaction {
  put<T>(key: string, value: T): Promise<void>
  setAlarm(time: number | Date): Promise<void>
}
export interface CircleStorage {
  get<T>(key: string): Promise<T | undefined>
  transaction<T>(callback: (tx: CircleTransaction) => Promise<T>): Promise<T>
}
export class CircleConflict extends Error {}

/** Execute within the circle Durable Object's serialization boundary. */
export class CircleService {
  constructor(
    private storage: CircleStorage,
    private provider: CircleProvider,
    private now = Date.now,
  ) {}
  private async read(): Promise<CircleData> {
    const data = await this.storage.get<CircleData>('circle')
    return { places: data?.places ?? [], waiting: data?.waiting ?? [] }
  }
  private async save(data: CircleData) {
    await this.storage.transaction(async (tx) => {
      await tx.put('circle', data)
      // Persist recovery alongside every transition, before external side effects.
      await tx.setAlarm(this.now() + 60_000)
    })
  }
  async view(email?: string) {
    const data = await this.read()
    const owner = data.places.find((p) => p.email === email?.toLowerCase())
    const publicPlace = (p: Place): PublicPlace => ({ spot: p.spot, alias: p.alias })
    return {
      waiting: data.waiting.some((p) => p.email === email?.toLowerCase()),
      places: data.places.filter((p) => p.phase === 'active').map(publicPlace),
      unavailable: data.places.filter((p) => p.phase !== 'active').map((p) => p.spot),
      ...(owner
        ? {
            own: owner.phase === 'active' ? publicPlace(owner) : undefined,
            processing: owner.phase === 'claiming',
          }
        : {}),
    }
  }
  async claim(email: string, alias: string, spot: number, reactivate = false) {
    email = email.toLowerCase()
    if (!Number.isInteger(spot) || spot < 1 || spot > circleCapacity || !validCircleAlias(alias))
      throw new TypeError('Invalid claim')
    const data = await this.read()
    let place = data.places.find((p) => p.email === email)
    if (place?.phase === 'releasing' || place?.phase === 'released')
      throw new CircleConflict('Release awaiting review')
    if (place?.phase === 'active') {
      const contact = await this.provider.read(email)
      if (!contact.exists || contact.unsubscribed || !contact.subscribed) {
        await this.requestRelease(data, place, true)
        throw new CircleConflict('Subscription ended')
      }
    }
    if (!place) {
      const free = this.freeSpot(data, spot)
      if (free === undefined) {
        let interest = data.waiting.find((p) => p.email === email)
        if (!interest) {
          interest = {
            id: crypto.randomUUID(),
            email,
            alias: alias.trim(),
            notified: false,
            created: this.now(),
            checked: this.now(),
          }
          data.waiting.push(interest)
          await this.save(data)
        }
        try {
          await this.notifyWaiting(data, interest)
        } catch {
          /* durable outbox retries */
        }
        return this.view(email)
      }
      spot = free
      data.waiting = data.waiting.filter((p) => p.email !== email)
      place = {
        id: crypto.randomUUID(),
        email,
        alias: alias.trim(),
        notificationAlias: alias.trim(),
        notificationSpot: spot,
        spot,
        phase: 'claiming',
        reactivate,
        notified: false,
        created: this.now(),
        checked: this.now(),
      }
      data.places.push(place)
      await this.save(data)
    }
    if (place.phase === 'claiming') await this.finishClaim(data, place)
    // A durable outbox owns notification retries. Delivery failure does not undo a claim.
    try {
      await this.notify(data, place)
    } catch {
      /* alarm retries the persisted outbox */
    }
    return this.view(email)
  }
  private async finishClaim(data: CircleData, place: Place) {
    await this.provider.subscribe(place.email, place.reactivate)
    place.phase = 'active'
    place.reactivate = false
    place.checked = this.now()
    await this.save(data)
  }
  private async notify(data: CircleData, place: Place) {
    if (place.notified || place.notificationStopped || place.phase !== 'active') return
    // Resend's idempotency window is 24h; do not blindly resend after that window.
    if (this.now() - place.created > 23 * 60 * 60_000) {
      console.error(
        JSON.stringify({ message: 'Circle notification needs manual recovery', claim: place.id }),
      )
      place.notificationStopped = true
      await this.save(data)
      return
    }
    await this.provider.notify(
      place.id,
      place.email,
      place.notificationAlias,
      place.notificationSpot ?? place.spot,
    )
    place.notified = true
    await this.save(data)
  }
  private freeSpot(data: CircleData, preferred: number): number | undefined {
    return [preferred, ...Array.from({ length: circleCapacity }, (_, index) => index + 1)].find(
      (spot) => !data.places.some((p) => p.spot === spot),
    )
  }
  /** Moving changes only the seat, inside the same serialized reservation authority. */
  async move(email: string, spot: number) {
    if (!Number.isInteger(spot) || spot < 1 || spot > circleCapacity)
      throw new TypeError('Invalid spot')
    const data = await this.read()
    const place = data.places.find((p) => p.email === email.toLowerCase())
    if (!place || place.phase !== 'active') throw new CircleConflict('No active place')
    if (place.spot !== spot) {
      const free = this.freeSpot(data, spot)
      if (free !== undefined) {
        place.notificationSpot ??= place.spot
        place.spot = free
        await this.save(data)
      }
    }
    return this.view(email)
  }
  private async notifyWaiting(data: CircleData, interest: WaitingInterest) {
    if (interest.notified || interest.notificationStopped) return
    if (this.now() - interest.created > 23 * 60 * 60_000) {
      console.error(
        JSON.stringify({
          message: 'Circle notification needs manual recovery',
          claim: interest.id,
        }),
      )
      interest.notificationStopped = true
      await this.save(data)
      return
    }
    await this.provider.notify(interest.id, interest.email, interest.alias)
    interest.notified = true
    await this.save(data)
  }
  async rename(email: string, alias: string) {
    if (!validCircleAlias(alias)) throw new TypeError('Invalid alias')
    const data = await this.read()
    const place = data.places.find((p) => p.email === email.toLowerCase())
    if (!place || place.phase !== 'active') throw new CircleConflict('No active place')
    place.alias = alias.trim()
    await this.save(data)
    return this.view(email)
  }
  async release(email: string) {
    const data = await this.read()
    const place = data.places.find((p) => p.email === email.toLowerCase())
    if (!place) return this.view(email)
    await this.requestRelease(data, place)
    return this.view(email)
  }
  private async requestRelease(data: CircleData, place: Place, optedOut = false) {
    if (place.phase !== 'releasing' && place.phase !== 'released') {
      place.phase = optedOut ? 'released' : 'releasing'
      place.release = { created: this.now(), notified: false }
      place.checked = this.now()
      // Hide the alias and persist both the capacity hold and email intent first.
      await this.save(data)
    }
    try {
      await this.finishRelease(data, place)
    } catch {
      /* the alarm retries opt-out; receiving the intent does not depend on Resend */
    }
    try {
      await this.notifyRelease(data, place)
    } catch {
      /* the alarm retries the independent release outbox */
    }
  }
  private async finishRelease(data: CircleData, place: Place) {
    if (place.phase !== 'releasing') return
    // Upgrade any in-flight release persisted by the earlier runtime.
    if (!place.release) {
      place.release = { created: this.now(), notified: false }
      await this.save(data)
    }
    await this.provider.unsubscribe(place.email)
    place.phase = 'released'
    await this.save(data)
  }
  private async notifyRelease(data: CircleData, place: Place) {
    const intent = place.release
    if (!intent || intent.notified || intent.notificationStopped) return
    if (this.now() - intent.created > 23 * 60 * 60_000) {
      console.error(
        JSON.stringify({
          message: 'Circle release notification needs manual recovery',
          claim: place.id,
        }),
      )
      intent.notificationStopped = true
      await this.save(data)
      return
    }
    await this.provider.notifyRelease(place.id, place.email, place.alias, place.spot)
    intent.notified = true
    await this.save(data)
  }
  /** Read current upstream state, so old/replayed webhooks cannot undo a newer opt-in. */
  async reconcile(email: string) {
    const data = await this.read()
    const place = data.places.find((p) => p.email === email.toLowerCase())
    if (!place || place.phase !== 'active') return
    const contact = await this.provider.read(place.email)
    if (!contact.exists || contact.unsubscribed || !contact.subscribed) {
      await this.requestRelease(data, place, true)
      return
    }
    place.checked = this.now()
    await this.save(data)
  }
  async remove(spot: number) {
    const data = await this.read()
    const place = data.places.find((p) => p.spot === spot)
    if (!place) return
    await this.provider.unsubscribe(place.email)
    // Keep any undelivered intent until its outbox has completed.
    await this.notifyRelease(data, place)
    if (place.release?.notificationStopped)
      throw new CircleConflict('Release notification needs recovery')
    data.places = data.places.filter((p) => p.id !== place.id)
    await this.save(data)
  }
  /** One place per alarm keeps API work bounded; the oldest checked place goes first. */
  async maintain() {
    const data = await this.read()
    const place = [...data.places].sort((a, b) => a.checked - b.checked)[0]
    const interest = data.waiting
      .filter((p) => !p.notified && !p.notificationStopped)
      .sort((a, b) => a.checked - b.checked)[0]
    if (interest && (!place || interest.checked <= place.checked)) {
      interest.checked = this.now()
      await this.save(data)
      try {
        await this.notifyWaiting(data, interest)
      } finally {
        await this.storage.transaction((tx) => tx.setAlarm(this.now() + 60_000))
      }
      return
    }
    if (!place) return
    // Rotate even failed work, so one bad contact cannot starve the other places.
    place.checked = this.now()
    await this.save(data)
    try {
      if (place.phase === 'claiming') await this.finishClaim(data, place)
      if (place.phase === 'releasing' || place.phase === 'released') {
        try {
          await this.finishRelease(data, place)
        } finally {
          await this.notifyRelease(data, place)
        }
      } else {
        await this.reconcile(place.email)
        const latest = await this.read()
        const current = latest.places.find((p) => p.id === place.id)
        if (current) await this.notify(latest, current)
      }
    } finally {
      // Keep a retry scheduled even when upstream is unavailable.
      await this.storage.transaction((tx) => tx.setAlarm(this.now() + 60_000))
    }
  }
}
