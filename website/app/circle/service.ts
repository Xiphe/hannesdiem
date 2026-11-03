import { circleCapacity, type PublicPlace } from './contract.ts'
import type { CircleProvider } from './provider.ts'

interface Place {
  id: string
  email: string
  alias: string
  notificationAlias: string
  spot: number
  phase: 'claiming' | 'active' | 'releasing'
  reactivate: boolean
  notified: boolean
  notificationStopped?: boolean
  created: number
  checked: number
}
interface CircleData {
  places: Place[]
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
    return (await this.storage.get<CircleData>('circle')) ?? { places: [] }
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
      places: data.places.filter((p) => p.phase !== 'claiming').map(publicPlace),
      unavailable: data.places.filter((p) => p.phase === 'claiming').map((p) => p.spot),
      ...(owner
        ? {
            own: owner.phase !== 'claiming' ? publicPlace(owner) : undefined,
            processing: owner.phase !== 'active',
          }
        : {}),
    }
  }
  async claim(email: string, alias: string, spot: number, reactivate = false) {
    email = email.toLowerCase()
    if (
      !Number.isInteger(spot) ||
      spot < 1 ||
      spot > circleCapacity ||
      !alias.trim() ||
      alias.length > 120 ||
      /[\u0000-\u001f\u007f]/u.test(alias)
    )
      throw new TypeError('Invalid claim')
    const data = await this.read()
    let place = data.places.find((p) => p.email === email)
    if (place?.phase === 'releasing') throw new CircleConflict('Release in progress')
    if (place?.phase === 'active') {
      const contact = await this.provider.read(email)
      if (!contact.exists || contact.unsubscribed || !contact.subscribed) {
        const endedId = place.id
        data.places = data.places.filter((p) => p.id !== endedId)
        await this.save(data)
        throw new CircleConflict('Subscription ended')
      }
    }
    if (!place) {
      if (data.places.some((p) => p.spot === spot)) throw new CircleConflict('Spot taken')
      place = {
        id: crypto.randomUUID(),
        email,
        alias: alias.trim(),
        notificationAlias: alias.trim(),
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
    await this.provider.notify(place.id, place.email, place.notificationAlias, place.spot)
    place.notified = true
    await this.save(data)
  }
  async rename(email: string, alias: string) {
    if (!alias.trim() || alias.length > 120 || /[\u0000-\u001f\u007f]/u.test(alias))
      throw new TypeError('Invalid alias')
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
    place.phase = 'releasing'
    await this.save(data)
    await this.finishRelease(data, place)
    return this.view(email)
  }
  private async finishRelease(data: CircleData, place: Place) {
    await this.provider.unsubscribe(place.email)
    data.places = data.places.filter((p) => p.id !== place.id)
    await this.save(data)
  }
  /** Read current upstream state, so old/replayed webhooks cannot undo a newer opt-in. */
  async reconcile(email: string) {
    const data = await this.read()
    const place = data.places.find((p) => p.email === email.toLowerCase())
    if (!place || place.phase !== 'active') return
    const contact = await this.provider.read(place.email)
    if (!contact.exists || contact.unsubscribed || !contact.subscribed) {
      data.places = data.places.filter((p) => p.id !== place.id)
    } else place.checked = this.now()
    await this.save(data)
  }
  async remove(spot: number) {
    const data = await this.read()
    const place = data.places.find((p) => p.spot === spot)
    if (place) await this.release(place.email)
  }
  /** One place per alarm keeps API work bounded; the oldest checked place goes first. */
  async maintain() {
    const data = await this.read()
    const place = [...data.places].sort((a, b) => a.checked - b.checked)[0]
    if (!place) return
    // Rotate even failed work, so one bad contact cannot starve the other places.
    place.checked = this.now()
    await this.save(data)
    try {
      if (place.phase === 'claiming') await this.finishClaim(data, place)
      if (place.phase === 'releasing') await this.finishRelease(data, place)
      else {
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
