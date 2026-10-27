// THROWAWAY: native document flow. No verse timeline, input interception or sentence pinning.
import { mountOpening } from '../scene.ts'
import { openingProps } from './context-props.ts'

const root = document.querySelector<HTMLElement>('.temple-opening')!
const stage = root.querySelector<HTMLElement>('.temple-stage')!
const layouts = [...document.querySelectorAll<HTMLElement>('.document-poem')]
const descriptions = {
  type: 'Große Textfelder und ein verdichteter Refrain.',
  woven: 'Textpassagen greifen über und zwischen Bildausschnitte.',
}
type Layout = keyof typeof descriptions
let layout = document.body.dataset.reading as Layout
const reduced = matchMedia('(prefers-reduced-motion: reduce)')
const clamp = (v: number) => Math.max(0, Math.min(1, v))
let frame = 0
const abort = new AbortController()
const on = (target: EventTarget, event: string, listener: EventListener) =>
  target.addEventListener(event, listener, { signal: abort.signal })
const visibleArticle = () => layouts.find((article) => !article.hidden)!

// Keep the accepted background at its viewport anchor after the wordmark exits.
// The opener retains its natural 130svh document box; poem paragraphs remain in flow.
function paint() {
  frame = 0
  root.classList.toggle(
    'reading-backdrop',
    -root.getBoundingClientRect().top >= stage.clientHeight * 0.3,
  )
  const article = visibleArticle()
  const first = article.querySelector<HTMLElement>('[data-unit="0"]')!
  const rect = first.getBoundingClientRect()
  const entry = clamp(
    (innerHeight * 0.9 - rect.top) / Math.min(rect.height * 0.6, innerHeight * 0.35),
  )
  article.querySelectorAll<HTMLElement>('[data-entry-word]').forEach((word, index) => {
    const t = reduced.matches ? 1 : clamp((entry - index * 0.055) / 0.72)
    word.style.transform = `translateY(${(1 - t) * 0.22}em) rotateX(${(1 - t) * -35}deg)`
    word.style.opacity = String(0.65 + 0.35 * t)
  })
  article.querySelectorAll<HTMLElement>('.woven-image').forEach((figure) => {
    const image = figure.querySelector<HTMLImageElement>('img')!
    const r = figure.getBoundingClientRect()
    const t = clamp((innerHeight - r.top) / (innerHeight + r.height))
    image.style.transform = reduced.matches
      ? 'none'
      : `translateY(${(t * 2 - 1) * 16}px) scale(1.08)`
  })
}
function request() {
  if (!frame) frame = requestAnimationFrame(paint)
}
function change(next: Layout) {
  if (next === layout) return
  const units = [...visibleArticle().querySelectorAll<HTMLElement>('[data-unit]')]
  // Anchor only after the verse has entered; switching in the opener preserves its scroll.
  const anchor =
    units.find((unit) => unit.getBoundingClientRect().bottom > innerHeight * 0.2) ?? units.at(-1)!
  const top = anchor.getBoundingClientRect().top
  const inPoem = units[0].getBoundingClientRect().top < innerHeight * 0.8
  layout = next
  document.body.dataset.reading = next
  layouts.forEach((article) => {
    article.hidden = article.dataset.layout !== next
  })
  document.querySelectorAll<HTMLAnchorElement>('[data-layout-link]').forEach((link) => {
    if (link.dataset.layoutLink === next) link.setAttribute('aria-current', 'page')
    else link.removeAttribute('aria-current')
  })
  document.querySelector('[data-description]')!.textContent = descriptions[next]
  const url = new URL(location.href)
  url.searchParams.set('layout', next)
  history.replaceState(null, '', url)
  if (inPoem) {
    const target = visibleArticle().querySelector<HTMLElement>(
      `[data-unit="${anchor.dataset.unit}"]`,
    )!
    scrollTo({ top: scrollY + target.getBoundingClientRect().top - top, behavior: 'instant' })
  }
  request()
}
function cycle() {
  change(layout === 'type' ? 'woven' : 'type')
}
function toggleUI() {
  document.body.dataset.ui = document.body.dataset.ui === 'hidden' ? 'visible' : 'hidden'
}
document.querySelectorAll<HTMLAnchorElement>('[data-layout-link]').forEach((link) =>
  on(link, 'click', ((event: MouseEvent) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    change(link.dataset.layoutLink as Layout)
  }) as EventListener),
)
on(document.querySelector('[data-previous]')!, 'click', cycle)
on(document.querySelector('[data-next]')!, 'click', cycle)
on(document.querySelector('[data-replay]')!, 'click', () => {
  scrollTo({ top: 0, behavior: 'instant' })
  request()
})
on(document.querySelector('[data-hide]')!, 'click', toggleUI)
on(document.querySelector('[data-restore]')!, 'click', toggleUI)
on(window, 'keydown', ((event: KeyboardEvent) => {
  if ((event.target as HTMLElement).closest('input, textarea, select, [contenteditable]')) return
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault()
    cycle()
  }
  if (event.key.toLowerCase() === 'h') toggleUI()
}) as EventListener)
on(window, 'scroll', request)
on(reduced, 'change', request)
on(window, 'resize', request)
on(window, 'pagehide', () => {
  abort.abort()
  cancelAnimationFrame(frame)
})
paint()
await mountOpening(root, openingProps, abort.signal)
request()
