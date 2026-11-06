import { feedPath, isFeedPath } from './model.ts'

interface FeedOrigin {
  href: string
  x: number
  y: number
  preview?: string
}
interface FeedEntry {
  destination: string
  source: string
  at: number
  origin: FeedOrigin | null
}

const stateKey = 'hannesdiemFeedOrigin'
const pendingKey = 'hannesdiem.feed.entry'
let pending: FeedEntry | undefined
let currentOrigin: { key: string; origin: FeedOrigin | null } | undefined

/** Classic URL/state replacement clears Navigation API state; preserve its opaque payload. */
export function replaceFeedHistory(state: unknown, path?: string) {
  const navigationState = window.navigation?.currentEntry?.getState()
  history.replaceState(state, '', path)
  if (navigationState !== undefined)
    window.navigation?.updateCurrentEntry({ state: navigationState })
}

function localOrigin(value: unknown): FeedOrigin | null {
  if (!value || typeof value !== 'object') return null
  const point = value as FeedOrigin
  try {
    const url = new URL(point.href, location.origin)
    if (
      url.origin !== location.origin ||
      isFeedPath(url.pathname) ||
      !Number.isFinite(point.x) ||
      !Number.isFinite(point.y)
    )
      return null
    return {
      href: url.pathname + url.search + url.hash,
      x: point.x,
      y: point.y,
      ...(typeof point.preview === 'string' ? { preview: point.preview } : {}),
    }
  } catch {
    return null
  }
}

/** Capture a same-tab entry, never an external referrer or a copied share URL. */
export function rememberFeedEntry(link: HTMLAnchorElement) {
  const url = new URL(link.href)
  if (url.origin !== location.origin || !isFeedPath(url.pathname)) return
  const origin = isFeedPath(location.pathname)
    ? feedOrigin()
    : {
        href: location.pathname + location.search + location.hash,
        x: scrollX,
        y: scrollY,
        ...(link.matches('.temple-post-preview') ? { preview: link.id } : {}),
      }
  pending = {
    destination: url.pathname,
    source: location.href.split('#')[0],
    at: Date.now(),
    origin,
  }
  try {
    sessionStorage.setItem(pendingKey, JSON.stringify(pending))
  } catch {
    // Frame navigation still carries the in-memory entry when storage is unavailable.
  }
}

/** Keep one return point on this history entry across swipes, reload and traversal. */
export function feedOrigin(): FeedOrigin | null {
  if (history.state && Object.hasOwn(history.state, stateKey))
    return localOrigin(history.state[stateKey])
  const key = window.navigation?.currentEntry?.key
  if (key && currentOrigin?.key === key) return currentOrigin.origin
  let entry = pending
  const fromThisDocument = !!entry
  pending = undefined
  try {
    if (!entry) entry = JSON.parse(sessionStorage.getItem(pendingKey) ?? 'null')
    sessionStorage.removeItem(pendingKey)
  } catch {
    // Direct entry remains a usable Home link without storage.
  }
  let origin: FeedOrigin | null = null
  if (
    entry &&
    Date.now() - entry.at >= 0 &&
    Date.now() - entry.at < 60_000 &&
    (entry.destination === location.pathname || entry.destination === feedPath) &&
    (fromThisDocument || entry.source === document.referrer.split('#')[0])
  )
    origin = localOrigin(entry.origin)
  if (key) currentOrigin = { key, origin }
  const persist = () => {
    if (key && navigation.currentEntry?.key !== key) return
    if (!isFeedPath(location.pathname)) return
    replaceFeedHistory({ ...history.state, [stateKey]: origin })
  }
  // Replacing classic history during a frame transition aborts that navigation.
  const transition = window.navigation?.transition
  if (transition) void transition.finished.then(persist, () => {})
  else persist()
  return origin
}

export function supportsFeedNavigation() {
  return (
    'navigation' in window &&
    typeof NavigateEvent !== 'undefined' &&
    'sourceElement' in NavigateEvent.prototype
  )
}

export async function leaveFeed(origin: FeedOrigin | null) {
  if (origin && supportsFeedNavigation() && navigation.canGoBack) {
    const entry = navigation.currentEntry
    const previous = entry && navigation.entries()[entry.index - 1]
    if (previous?.url === new URL(origin.href, location.origin).href) {
      await navigation.back().finished
      return true
    }
  }
  location.replace(origin?.href ?? '/')
  return false
}
