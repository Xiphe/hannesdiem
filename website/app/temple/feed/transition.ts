import { navigate } from 'remix/component'
import { feedPath, isFeedPath } from './model.ts'
import { feedOrigin, leaveFeed, rememberFeedEntry, supportsFeedNavigation } from './navigation.ts'

/** Keep one entry/return journey, with a shared image only while the same post matches. */
export function mountFeedTransitions() {
  let current: ViewTransition | undefined
  document.addEventListener('click', (event) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return
    const link = (event.target as Element).closest<HTMLAnchorElement>('a[href]')
    if (!link || link.download || (link.target && link.target !== '_self')) return
    const url = new URL(link.href)
    if (url.origin !== location.origin) return
    const feed = link.closest<HTMLElement>('.temple-feed')
    const entering = !feed && isFeedPath(url.pathname)
    const switching = !!feed && isFeedPath(url.pathname)
    const leaving = !!feed && link.matches('[data-back]')
    if (!entering && !switching && !leaving) return
    if (entering || switching) rememberFeedEntry(link)
    if (entering && url.pathname === feedPath) {
      // The index is a server-selected destination; follow its redirect natively.
      link.setAttribute('data-rmx-document', '')
      return
    }
    event.preventDefault()
    current?.skipTransition()
    if (switching) {
      void navigate(url.href, { history: 'replace' })
      return
    }
    const origin = leaving ? feedOrigin() : null
    const id = entering ? link.id : origin?.preview
    const before = entering ? link : feed!
    const perform = async () => {
      if (!leaving) {
        await navigate(url.href)
        return
      }
      const arrived = await leaveFeed(origin)
      if (!arrived || !origin) return
      if (origin.preview) {
        const card = await destination(false, origin.preview)
        card?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'instant' })
      }
      scrollTo({ left: origin.x, top: origin.y, behavior: 'instant' })
    }
    const animated =
      typeof document.startViewTransition === 'function' &&
      supportsFeedNavigation() &&
      !matchMedia('(prefers-reduced-motion: reduce)').matches &&
      (entering ? link.matches('.temple-post-preview') : !!id && id === feed!.dataset.currentPost)
    if (!animated) {
      void perform().catch((error: unknown) => {
        // A newer Back/Forward action owns the destination after an interruption.
        if (error instanceof DOMException && error.name === 'AbortError') return
        location.assign(url.href)
      })
      return
    }
    before.style.viewTransitionName = 'temple-content'
    let after: HTMLElement | undefined
    const transition = document.startViewTransition(async () => {
      await perform()
      if (current !== transition) return
      after = await destination(entering, id!)
      if (!after) {
        transition.skipTransition()
        return
      }
      const image = after.querySelector<HTMLImageElement>(
        entering ? '[data-active] .feed-frame, [data-active] .feed-cover' : 'img',
      )
      if (image) {
        let timeout: ReturnType<typeof setTimeout> | undefined
        await Promise.race([
          image.decode().catch(() => {}),
          new Promise<void>((resolve) => {
            timeout = setTimeout(resolve, 600)
          }),
        ])
        clearTimeout(timeout)
      }
      if (current !== transition) return
      after.style.viewTransitionName = 'temple-content'
    })
    current = transition
    void transition.ready.catch(() => {})
    void transition.updateCallbackDone.catch((error: unknown) => {
      if (error instanceof DOMException && error.name === 'AbortError') return
      if (current === transition && location.href !== url.href) location.assign(url.href)
    })
    void transition.finished
      .catch(() => {})
      .finally(() => {
        if (current !== transition) return
        before.style.removeProperty('view-transition-name')
        after?.style.removeProperty('view-transition-name')
        current = undefined
      })
  })
}

/** Font fitting and native fragment arrival precede the return snapshot/restoration. */
function destination(entering: boolean, id: string) {
  return new Promise<HTMLElement | undefined>((resolve) => {
    const finish = (element?: HTMLElement) => {
      clearTimeout(timeout)
      observer.disconnect()
      resolve(element)
    }
    const check = () => {
      if (entering) {
        const feed = document.querySelector<HTMLElement>('.temple-feed')
        if (feed?.dataset.currentPost === id) finish(feed)
      } else if (!document.documentElement.hasAttribute('data-temple-loading')) {
        const card = document.getElementById(id)
        if (card?.matches('.temple-post-preview')) finish(card)
      }
    }
    const timeout = setTimeout(() => finish(), 1_800)
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, { attributes: true, childList: true, subtree: true })
    check()
  })
}
