/** Old fragments resolve against current native destinations, preserving notices. */
export function mountLegacyEntry(host: HTMLElement, signal: AbortSignal) {
  const follow = async () => {
    let id: string
    try {
      id = decodeURIComponent(location.hash.slice(1))
    } catch {
      return
    }
    if (!id || document.getElementById(id)) return
    const section = (
      { facts: 'visit', watch: 'watch', create: 'create', share: 'share' } as Record<string, string>
    )[id]
    if (section) {
      location.replace(`/temple-of-sound/${section}${location.search}`)
      return
    }
    // The Watch HTML is the published collection's native link surface. Reading
    // it avoids duplicating post IDs or exposing the CMX runtime to the browser.
    const hash = location.hash
    try {
      const response = await fetch('/temple-of-sound/watch', { signal })
      if (!response.ok) return
      const document = new DOMParser().parseFromString(await response.text(), 'text/html')
      const target = document.getElementById(id)
      if (
        !target?.matches('a.temple-post-preview[href]') ||
        signal.aborted ||
        location.hash !== hash
      )
        return
      const destination = new URL(target.getAttribute('href')!, location.origin)
      if (destination.origin !== location.origin || !destination.pathname.startsWith('/feed/'))
        return
      destination.search = location.search
      location.replace(destination.href)
    } catch {
      /* An unavailable destination leaves the readable poem in place. */
    }
  }
  window.addEventListener(
    'hashchange',
    () => {
      void follow()
    },
    { signal },
  )
  if (host.dataset.templeView === 'poem') void follow()
}
