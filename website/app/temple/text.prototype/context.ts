// THROWAWAY. Native text flow with a compact, centred refrain hold.
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
  const maxHeight = innerHeight * 0.5
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
  const contentHeight = Math.max(...phrases.map((p) => p.offsetHeight)) + 32
  refrain.style.setProperty('--refrain-height', `${contentHeight}px`)
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
  const scrolling = now - lastScroll < 140
  let active = false
  for (const { host, ink } of surfaces) {
    if (host.getBoundingClientRect().bottom < 0 || host.getBoundingClientRect().top > innerHeight)
      continue
    active = ink.draw(now, 0, 0, 0, scrolling, lift, pigment) || active
  }
  const section = refrain.getBoundingClientRect()
  const hold = section.height - refrainStage.offsetHeight
  const stickyTop = (stage.clientHeight - refrainStage.offsetHeight) / 2
  const position = Math.max(0, Math.min(1, (stickyTop - section.top) / hold))
  let index = 0,
    next = 0,
    blend = 0
  const transitions = [
    [0.08, 0.45],
    [0.53, 0.93],
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
      false,
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
      top:
        scrollY +
        refrain.getBoundingClientRect().top -
        (stage.clientHeight - refrainStage.offsetHeight) / 2,
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
