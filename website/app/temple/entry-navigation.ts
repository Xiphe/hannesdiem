import { forgetTempleEntry, hasEnteredTemple, rememberTempleEntry } from './entry-state.ts'

/** Keep this browser preference outside the shared, publicly cached CMX document. */
export function mountTempleEntryPreference(signal: AbortSignal, changed: () => void) {
  const isManifesto = () => /^\/temple-of-sound\/?$/.test(location.pathname)
  const returnToManifesto = () => {
    if (!isManifesto()) return
    forgetTempleEntry()
    changed()
  }
  window.addEventListener(
    'pageshow',
    (event) => {
      // Cached documents resume without mounting their components again.
      if (event.persisted) returnToManifesto()
    },
    { signal },
  )
  window.addEventListener('popstate', returnToManifesto, { signal })
  const followEntryControl = (event: MouseEvent) => {
    if (
      event.defaultPrevented ||
      (event.type === 'auxclick' ? event.button !== 1 : event.button !== 0)
    )
      return
    const link = (event.target as Element).closest<HTMLAnchorElement>(
      'a[data-temple-enter],a[data-temple-manifesto]',
    )
    if (!link) return
    if (link.hasAttribute('data-temple-enter')) rememberTempleEntry()
    else forgetTempleEntry()
    changed()
  }
  document.addEventListener('click', followEntryControl, { signal })
  document.addEventListener('auxclick', followEntryControl, { signal })

  if (!isManifesto()) return
  const navigation = performance.getEntriesByType('navigation')[0] as
    PerformanceNavigationTiming | undefined
  if (navigation?.type === 'back_forward') {
    returnToManifesto()
    return
  }
  // Explicit poem, section and legacy recording destinations always win.
  const url = new URL(location.href)
  if (!url.hash && !url.searchParams.has('verse') && hasEnteredTemple())
    location.replace(`/temple-of-sound/watch${url.search}`)
}
