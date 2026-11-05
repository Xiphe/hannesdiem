import { navigate } from 'remix/component'
import { watchPath } from './model.ts'

/** Animate the native link destinations through Remix's existing document frame. */
export function mountFeedTransitions() {
  if (
    !document.startViewTransition ||
    !('navigation' in window) ||
    typeof NavigateEvent === 'undefined' ||
    !('sourceElement' in NavigateEvent.prototype)
  )
    return
  let current: ViewTransition | undefined
  document.addEventListener('click', (event) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return
    const link = (event.target as Element).closest<HTMLAnchorElement>('a[href]')
    if (!link || link.download || (link.target && link.target !== '_self')) return
    const url = new URL(link.href)
    if (url.origin !== location.origin) return
    const feed = link.closest<HTMLElement>('.temple-feed')
    const entering = link.matches('.temple-post-preview')
    const leaving = !!feed && link.matches('[data-back]') && url.pathname === watchPath
    if (!entering && !leaving) return
    if (entering && !url.pathname.startsWith(`${watchPath}/`)) return
    const id = entering ? link.id : feed!.dataset.currentPost!
    const before = entering ? link : feed!
    event.preventDefault()
    current?.skipTransition()
    before.style.viewTransitionName = 'temple-content'
    let after: HTMLElement | undefined
    const transition = document.startViewTransition(async () => {
      await navigate(url.href)
      if (current !== transition) return
      after = await destination(entering, id)
      if (!after) {
        transition.skipTransition()
        return
      }
      if (!entering) after.scrollIntoView({ block: 'start', inline: 'center', behavior: 'instant' })
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
    void transition.updateCallbackDone.catch(() => {
      if (location.href !== url.href) location.assign(url.href)
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

/** Font fitting and the native fragment arrival must precede the return snapshot. */
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
      } else if (
        location.pathname === watchPath &&
        !document.documentElement.hasAttribute('data-temple-loading')
      ) {
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
