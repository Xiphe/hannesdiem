// THROWAWAY: compare actual reading typography, no poem/letter/image animation.
import { mountOpening } from '../scene.ts'
import { openingProps } from './context-props.ts'
const root = document.querySelector<HTMLElement>('.temple-opening')!
const stage = root.querySelector<HTMLElement>('.temple-stage')!
const studies = [...document.querySelectorAll<HTMLElement>('.reading-study')]
const descriptions = {
  bricolage: 'Eine Familie: Bricolage 400 im Lesesatz, 600 als Akzent, 450 im Refrain.',
  newsreader: 'Bricolage als Akzent, Newsreader 400 im Lesesatz, kursiv im Refrain.',
  source: 'Source Sans 3 im Lesesatz, Unbounded 400 als Akzent und 350 im Refrain.',
}
type Study = keyof typeof descriptions
let study = document.body.dataset.reading as Study
let frame = 0,
  switchSerial = 0
const abort = new AbortController()
const on = (target: EventTarget, event: string, listener: EventListener) =>
  target.addEventListener(event, listener, { signal: abort.signal })
const visibleArticle = () => studies.find((article) => !article.hidden)!
function paint() {
  frame = 0
  const progress = scrollY / stage.clientHeight
  root.classList.toggle('reading-backdrop', progress >= 0.3)
  const entered = progress >= 0.14
  // Only the one-time opener handoff changes visibility. Reading text stays static.
  studies.forEach((article) => {
    article.style.visibility = entered ? 'visible' : 'hidden'
  })
  document.body.style.setProperty('--reading-veil', entered ? '1' : '0')
}
function request() {
  if (!frame) frame = requestAnimationFrame(paint)
}
const fonts: Record<Study, string[]> = {
  bricolage: ['400 28px Bricolage'],
  newsreader: ['400 32px Newsreader', 'italic 400 34px Newsreader'],
  source: ['400 28px SourceSansText', '400 70px UnboundedText'],
}
async function change(next: Study) {
  if (next === study) return
  const serial = ++switchSerial
  await Promise.all(fonts[next].map((font) => document.fonts.load(font)))
  if (serial !== switchSerial || abort.signal.aborted) return
  const units = [...visibleArticle().querySelectorAll<HTMLElement>('[data-unit]')]
  const anchor =
    units.find((unit) => unit.getBoundingClientRect().bottom > innerHeight * 0.2) ?? units.at(-1)!
  const top = anchor.getBoundingClientRect().top
  const inPoem = units[0].getBoundingClientRect().top < innerHeight * 0.8
  study = next
  document.body.dataset.reading = next
  studies.forEach((article) => {
    article.hidden = article.dataset.study !== next
  })
  document.querySelectorAll<HTMLAnchorElement>('[data-study-link]').forEach((link) => {
    if (link.dataset.studyLink === next) link.setAttribute('aria-current', 'page')
    else link.removeAttribute('aria-current')
  })
  document.querySelector('[data-description]')!.textContent = descriptions[next]
  const url = new URL(location.href)
  url.searchParams.delete('layout')
  url.searchParams.set('study', next)
  history.replaceState(null, '', url)
  if (inPoem) {
    const target = visibleArticle().querySelector<HTMLElement>(
      `[data-unit="${anchor.dataset.unit}"]`,
    )!
    scrollTo({ top: scrollY + target.getBoundingClientRect().top - top, behavior: 'instant' })
  }
  request()
}
function cycle(direction: number) {
  const keys = Object.keys(descriptions) as Study[]
  void change(keys[(keys.indexOf(study) + direction + keys.length) % keys.length])
}
function toggleUI() {
  document.body.dataset.ui = document.body.dataset.ui === 'hidden' ? 'visible' : 'hidden'
}
const size = document.querySelector<HTMLInputElement>('[data-size]')!
const weight = document.querySelector<HTMLInputElement>('[data-weight]')!
function adjust() {
  document.body.style.setProperty('--reading-scale', String(Number(size.value) / 100))
  document.body.style.setProperty('--reading-weight', weight.value)
  document.querySelector('[data-size-label]')!.textContent = `${size.value} %`
  document.querySelector('[data-weight-label]')!.textContent = weight.value
}
on(size, 'input', adjust)
on(weight, 'input', adjust)
on(document.querySelector('[data-reset]')!, 'click', () => {
  size.value = '100'
  weight.value = '400'
  adjust()
})
document.querySelectorAll<HTMLAnchorElement>('[data-study-link]').forEach((link) =>
  on(link, 'click', ((event: MouseEvent) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    void change(link.dataset.studyLink as Study)
  }) as EventListener),
)
on(document.querySelector('[data-previous]')!, 'click', () => cycle(-1))
on(document.querySelector('[data-next]')!, 'click', () => cycle(1))
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
    cycle(event.key === 'ArrowLeft' ? -1 : 1)
  }
  if (event.key.toLowerCase() === 'h') toggleUI()
}) as EventListener)
on(window, 'scroll', request)
on(window, 'resize', request)
on(window, 'pagehide', () => {
  abort.abort()
  cancelAnimationFrame(frame)
})
paint()
await mountOpening(root, openingProps, abort.signal)
request()
