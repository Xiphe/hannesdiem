// THROWAWAY contextual workbench. Entry choices are hypotheses, not approvals.
// The server bundles the accepted opener from a pinned main revision.
import { mountOpening } from '../scene.ts'
import { openingProps } from './context-props.ts'

const root = document.querySelector<HTMLElement>('.temple-opening')!
const stage = root.querySelector<HTMLElement>('.temple-stage')!
const text = document.querySelector<HTMLElement>('.entry-text')!
const position = document.querySelector<HTMLInputElement>('[data-position]')!
const entryControl = document.querySelector<HTMLInputElement>('[data-entry]')!
const size = document.querySelector<HTMLInputElement>('[data-size]')!
const reduced = matchMedia('(prefers-reduced-motion: reduce)')
const abort = new AbortController()
const on = (target: EventTarget, event: string, listener: EventListener) =>
  target.addEventListener(event, listener, { signal: abort.signal })
const clamp = (value: number) => Math.max(0, Math.min(1, value))
let entry = 0.3,
  mode = 'rise',
  raf = 0,
  height = 0,
  progress = 0
// Extend the shared scene beyond the approved 0.3-viewport opener sequence.
// Its wordmark, timing, image and particle renderer stay untouched.
stage.append(text)
root.style.height = '200svh'
document.body.dataset.context = 'ready'

function draw() {
  raf = 0
  if (stage.clientHeight !== height) {
    measure()
    return
  }
  progress = clamp(scrollY / height)
  position.value = String(progress)
  const t = clamp((progress - entry) / 0.23)
  const eased = t * t * (3 - 2 * t)
  const opacity = reduced.matches ? Number(t >= 0.5) : clamp(t * 4)
  const move = mode === 'rise' ? (1 - eased) * height * 0.65 : 0
  const scale = mode === 'close' ? 1 + (1 - eased) * 2.3 : 1
  text.style.opacity = String(opacity)
  text.style.transform = reduced.matches ? 'none' : `translateY(${move}px) scale(${scale})`
  text.setAttribute('aria-hidden', String(opacity === 0))
}
function request() {
  if (!raf) raf = requestAnimationFrame(draw)
}
function measure() {
  height = stage.clientHeight
  scrollTo({ top: progress * height, behavior: 'instant' })
  request()
}
function toggleUI() {
  document.body.dataset.ui = document.body.dataset.ui === 'hidden' ? 'visible' : 'hidden'
}
on(window, 'scroll', request)
on(reduced, 'change', request)
on(position, 'input', () => {
  progress = Number(position.value)
  scrollTo({ top: progress * height, behavior: 'instant' })
  request()
})
on(entryControl, 'input', () => {
  entry = Number(entryControl.value)
  document.querySelector('[data-entry-label]')!.textContent =
    `${entry.toFixed(2).replace('.', ',')} × Höhe`
  request()
})
on(size, 'input', () => {
  document.body.style.setProperty('--entry-size', size.value)
  document.querySelector('[data-size-label]')!.textContent = size.value
})
document.querySelectorAll<HTMLButtonElement>('[data-motion]').forEach((button) =>
  on(button, 'click', () => {
    mode = button.dataset.motion!
    document
      .querySelectorAll<HTMLButtonElement>('[data-motion]')
      .forEach((item) => item.setAttribute('aria-pressed', String(item === button)))
    request()
  }),
)
on(document.querySelector('[data-replay]')!, 'click', () => {
  progress = 0
  scrollTo({ top: 0, behavior: 'instant' })
  request()
})
on(document.querySelector('[data-hide]')!, 'click', toggleUI)
on(document.querySelector('[data-restore]')!, 'click', toggleUI)
on(window, 'keydown', ((event: KeyboardEvent) => {
  if ((event.target as HTMLElement).closest('input, textarea, select, [contenteditable]')) return
  if (event.key.toLowerCase() === 'h') toggleUI()
}) as EventListener)
const observer = new ResizeObserver(() => {
  if (stage.clientHeight !== height) measure()
})
observer.observe(stage)
on(window, 'pagehide', () => {
  abort.abort()
  observer.disconnect()
  cancelAnimationFrame(raf)
})
measure()
await mountOpening(root, openingProps, abort.signal)
request()
