// THROWAWAY. Native verse flow; the refrain also scrolls with the document.
import { mountOpening } from '../scene.ts'
import { openingProps } from './context-props.ts'
import { createTypeSurface } from './typography.ts'

const root = document.querySelector<HTMLElement>('.temple-opening')!
const stage = root.querySelector<HTMLElement>('.temple-stage')!
const firstPair = document.querySelector<HTMLElement>('.first-pair')!
const refrain = document.querySelector<HTMLElement>('.refrain-composition')!
const refrainStage = document.querySelector<HTMLElement>('.refrain-stage')!
const phrases = [...document.querySelectorAll<HTMLElement>('.refrain-phrase')]
const highlights = [...document.querySelectorAll<HTMLElement>('[data-mask]')]
const reduced = matchMedia('(prefers-reduced-motion: reduce)')
const abort = new AbortController()
const on = (target: EventTarget, event: string, listener: EventListener) =>
  target.addEventListener(event, listener, { signal: abort.signal })
let raf = 0,
  lastScroll = -Infinity,
  lift = 0.42,
  pigment = '#e8dfcc'
let surfaces: { host: HTMLElement; ink: ReturnType<typeof createTypeSurface> }[] = []
let refrainInk: ReturnType<typeof createTypeSurface>

function fitRefrain() {
  const width = refrainStage.clientWidth * 0.9
  const maxHeight = refrainStage.clientHeight * 0.5
  for (const phrase of phrases) {
    const size = Math.min(190, width / 5.9, maxHeight / 2.6)
    phrase.style.fontSize = `${size}px`
    let scale = 1
    for (let i = 0; i < 3; i++) {
      const content = phrase.querySelector<HTMLElement>('[data-ink]')!
      scale = Math.min(1, maxHeight / content.offsetHeight, width / content.scrollWidth)
      if (scale >= 0.999) break
      phrase.style.fontSize = `${parseFloat(phrase.style.fontSize) * scale}px`
    }
  }
}
function resize() {
  fitRefrain()
  for (const { ink } of surfaces) ink.resize()
  refrainInk.resize()
  request()
}
function draw(now: number) {
  raf = 0
  const progress = scrollY / stage.clientHeight
  root.classList.toggle('reading-backdrop', progress >= 0.3)
  if (progress >= 0.14) document.body.dataset.reading = 'true'
  else delete document.body.dataset.reading
  const scrolling = now - lastScroll < 140
  let active = false
  for (const { host, ink } of surfaces) {
    if (host.getBoundingClientRect().bottom < 0 || host.getBoundingClientRect().top > innerHeight)
      continue
    active = ink.draw(now, 0, 0, 0, scrolling, lift, pigment) || active
  }
  const rect = refrainStage.getBoundingClientRect()
  const position = Math.max(0, Math.min(1, (innerHeight - rect.top) / (innerHeight + rect.height)))
  let index = 0,
    next = 0,
    blend = 0
  const transitions = [
    [0.38, 0.46],
    [0.54, 0.62],
  ]
  for (let i = 0; i < transitions.length; i++) {
    const [start, end] = transitions[i]
    if (position >= end) index = next = i + 1
    else if (position > start) {
      index = i
      next = i + 1
      const t = (position - start) / (end - start)
      blend = t * t * (3 - 2 * t)
      break
    }
  }
  refrain.dataset.active = String(blend < 0.5 ? index : next)
  active = refrainInk.draw(now, index, next, blend, scrolling, lift, pigment) || active
  if (!reduced.matches || active) request()
}
function request() {
  if (!raf && !document.hidden && !abort.signal.aborted) raf = requestAnimationFrame(draw)
}
function toggleUI() {
  document.body.dataset.ui = document.body.dataset.ui === 'hidden' ? 'visible' : 'hidden'
}

await Promise.all([
  document.fonts.load('350 28px UnboundedCopy'),
  document.fonts.load('700 80px CinzelDecorative'),
  document.fonts.load('800 100px Bricolage'),
  document.fonts.load('400 100px Germania'),
])
if (!abort.signal.aborted) {
  const light = matchMedia('(prefers-color-scheme: light)').matches
  pigment = light ? '#172415' : '#e8dfcc'
  lift = light ? 0.7 : 0.42
  document.querySelector<HTMLInputElement>('[data-pigment]')!.value = pigment
  document.querySelector<HTMLInputElement>('[data-lift]')!.value = String(Math.round(lift * 100))
  document.querySelector('[data-lift-label]')!.textContent = `${Math.round(lift * 100)} %`
  const copy = getComputedStyle(document.querySelector('.verse-copy')!).color.match(/\d+/g)!
  document.querySelector<HTMLInputElement>('[data-copy-color]')!.value =
    '#' +
    copy
      .slice(0, 3)
      .map((n) => Number(n).toString(16).padStart(2, '0'))
      .join('')
  refrain.dataset.ready = 'true'
  fitRefrain()
  surfaces = highlights.map((host) => {
    const ink = createTypeSurface(
      host.querySelector('canvas')!,
      [host.querySelector('[data-ink]')!],
      abort.signal,
      request,
    )
    ink.resize()
    host.dataset.ready = 'true'
    return { host, ink }
  })
  refrainInk = createTypeSurface(
    document.querySelector('.refrain-canvas')!,
    phrases.map((p) => p.querySelector('[data-ink]')!),
    abort.signal,
    request,
  )
  refrainInk.resize()
  on(window, 'scroll', () => {
    lastScroll = performance.now()
    request()
  })
  const observer = new ResizeObserver(resize)
  observer.observe(firstPair)
  observer.observe(stage)
  on(document.querySelector('[data-lift]')!, 'input', ((event: Event) => {
    const value = (event.target as HTMLInputElement).value
    lift = Number(value) / 100
    document.querySelector('[data-lift-label]')!.textContent = `${value} %`
    request()
  }) as EventListener)
  on(document.querySelector('[data-pigment]')!, 'input', (event) => {
    pigment = (event.target as HTMLInputElement).value
    request()
  })
  on(document.querySelector('[data-copy-color]')!, 'input', (event) => {
    document.body.style.setProperty('--copy-color', (event.target as HTMLInputElement).value)
  })
  on(document.querySelector('[data-veil]')!, 'input', (event) => {
    document.body.style.setProperty(
      '--reading-veil',
      String(Number((event.target as HTMLInputElement).value) / 100),
    )
  })
  document.querySelectorAll<HTMLButtonElement>('[data-accent-choice]').forEach((button) =>
    on(button, 'click', async () => {
      document.body.dataset.accent = button.dataset.accentChoice!
      document
        .querySelectorAll<HTMLButtonElement>('[data-accent-choice]')
        .forEach((b) => b.setAttribute('aria-pressed', String(b === button)))
      await document.fonts.ready
      resize()
    }),
  )
  on(document.querySelector('[data-hide]')!, 'click', toggleUI)
  on(document.querySelector('[data-restore]')!, 'click', toggleUI)
  on(document.querySelector('[data-replay]')!, 'click', () =>
    scrollTo({ top: 0, behavior: 'instant' }),
  )
  on(document.querySelector('[data-refrain]')!, 'click', () =>
    scrollTo({
      top: scrollY + refrainStage.getBoundingClientRect().top - innerHeight * 0.25,
      behavior: 'instant',
    }),
  )
  on(window, 'keydown', ((event: KeyboardEvent) => {
    if ((event.target as HTMLElement).closest('input, textarea, select, [contenteditable]')) return
    if (event.key.toLowerCase() === 'h') toggleUI()
  }) as EventListener)
  on(document, 'visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(raf)
      raf = 0
    } else request()
  })
  on(window, 'pagehide', () => {
    abort.abort()
    observer.disconnect()
    cancelAnimationFrame(raf)
  })
  on(reduced, 'change', request)
  // The shared forest frame is captured before the approved opener's veil.
  await mountOpening(root, openingProps, abort.signal)
  request()
}
