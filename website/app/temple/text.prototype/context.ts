// THROWAWAY: extend the liked close-view entrance to the original first pair.
// Old words continue into depth as working traces; no scene/publication approval.
import { mountOpening } from '../scene.ts'
import { openingProps } from './context-props.ts'

const root = document.querySelector<HTMLElement>('.temple-opening')!
const stage = root.querySelector<HTMLElement>('.temple-stage')!
const text = document.querySelector<HTMLElement>('.entry-text')!
const units = [...text.querySelectorAll<HTMLElement>('.entry-unit')]
const position = document.querySelector<HTMLInputElement>('[data-position]')!
const entryControl = document.querySelector<HTMLInputElement>('[data-entry]')!
const spacingControl = document.querySelector<HTMLInputElement>('[data-spacing]')!
const size = document.querySelector<HTMLInputElement>('[data-size]')!
const count = document.querySelector<HTMLOutputElement>('[data-count]')!
const reduced = matchMedia('(prefers-reduced-motion: reduce)')
const abort = new AbortController()
const on = (target: EventTarget, event: string, listener: EventListener) =>
  target.addEventListener(event, listener, { signal: abort.signal })
const clamp = (value: number) => Math.max(0, Math.min(1, value))
// Half the previous scroll span, with a fast initial response instead of a slow start.
const entrance = 0.12
const arrive = (value: number) => 1 - (1 - clamp(value)) ** 3
const weights = units.map((unit) =>
  Math.min(1.65, Math.max(1, Math.sqrt(unit.textContent!.split(/\s+/).length / 7))),
)
let entry = 0.18,
  spacing = 0.22,
  mode = 'close',
  raf = 0,
  height = 0,
  progress = 0
let onsets: number[] = [],
  end = 0
stage.append(text)
document.body.dataset.context = 'ready'

function timeline() {
  let at = entry
  onsets = weights.map((weight) => {
    const start = at
    at += spacing * weight
    return start
  })
  end = onsets.at(-1)! + entrance + 0.16
  root.style.height = `${(1 + end) * 100}svh`
  position.max = String(end)
  progress = Math.min(progress, end)
}
function draw() {
  raf = 0
  if (stage.clientHeight !== height) {
    measure()
    return
  }
  progress = Math.max(0, Math.min(end, scrollY / height))
  position.value = String(progress)
  const active = onsets.findLastIndex((start) => progress >= start)
  units.forEach((unit, index) => {
    if (index > active) {
      unit.style.opacity = '0'
      unit.dataset.state = 'future'
      unit.setAttribute('aria-hidden', 'true')
      return
    }
    const t = clamp((progress - onsets[index]) / entrance)
    let opacity = clamp(t * 5)
    let scale = mode === 'close' ? 1 + (1 - arrive(t)) * 2.3 : 1
    let move = mode === 'rise' ? (1 - arrive(t)) * height * 0.65 : 0
    if (index < active) {
      // Continue the same depth direction after arrival, instead of replacing a phrase.
      const departure = (progress - onsets[index + 1]) / entrance
      const leaving = reduced.matches ? Number(departure >= 0.5) : arrive(departure)
      const depth = active - index - 1 + leaving
      scale = 0.68 ** depth
      move = -height * 0.14 * Math.min(depth, 3)
      opacity = 1 - leaving * 0.84
      if (active - index > 1) opacity = 0.16 / (1 + (active - index - 1) * 0.4)
    } else if (reduced.matches) {
      opacity = Number(t >= 0.5)
      scale = 1
      move = 0
    }
    unit.style.opacity = String(opacity)
    unit.style.transform = `translateY(${move}px) scale(${scale})`
    unit.style.zIndex = String(index + 1)
    unit.setAttribute('aria-hidden', String(opacity === 0))
    unit.dataset.state = index === active ? 'current' : 'trace'
  })
  count.textContent = active < 0 ? 'Opener' : `${active + 1} / ${units.length}`
  root.dataset.unit = String(active)
}
function request() {
  if (!raf) raf = requestAnimationFrame(draw)
}
function fitText() {
  // Keep the selected size for short phrases; long units must fit at rest on phones too.
  const base = parseFloat(getComputedStyle(text).fontSize)
  units.forEach((unit) => {
    let font = base
    unit.style.fontSize = `${font}px`
    while (unit.offsetHeight > height * 0.76 && font > 24) {
      font = Math.max(24, font * 0.92)
      unit.style.fontSize = `${font}px`
    }
  })
}
function measure() {
  height = stage.clientHeight
  fitText()
  scrollTo({ top: progress * height, behavior: 'instant' })
  request()
}
function toggleUI() {
  document.body.dataset.ui = document.body.dataset.ui === 'hidden' ? 'visible' : 'hidden'
}
const number = (value: number) => `${value.toFixed(2).replace('.', ',')} × Höhe`
on(window, 'scroll', request)
on(reduced, 'change', request)
on(position, 'input', () => {
  progress = Number(position.value)
  scrollTo({ top: progress * height, behavior: 'instant' })
  request()
})
on(entryControl, 'input', () => {
  entry = Number(entryControl.value)
  document.querySelector('[data-entry-label]')!.textContent = number(entry)
  timeline()
  request()
})
on(spacingControl, 'input', () => {
  spacing = Number(spacingControl.value)
  document.querySelector('[data-spacing-label]')!.textContent = number(spacing)
  timeline()
  request()
})
on(size, 'input', () => {
  document.body.style.setProperty('--entry-size', size.value)
  document.querySelector('[data-size-label]')!.textContent = size.value
  fitText()
  request()
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
let width = stage.clientWidth
const observer = new ResizeObserver(() => {
  if (stage.clientHeight !== height || stage.clientWidth !== width) {
    width = stage.clientWidth
    measure()
  }
})
observer.observe(stage)
on(window, 'pagehide', () => {
  abort.abort()
  observer.disconnect()
  cancelAnimationFrame(raf)
})
timeline()
measure()
await mountOpening(root, openingProps, abort.signal)
if (!abort.signal.aborted) {
  fitText()
  request()
}
