// Native text flow with a compact, centred refrain hold.
import { mountOpening } from '../scene.ts'
import { openingProps } from './context-props.ts'
import { createTypeSurface, invalidateForest, setTypeFrame, type TypeFrame } from './typography.ts'
import { mist } from './atmosphere.ts'
import { colourCopy } from './copy-colour.ts'
import { blockType } from './block-type.ts'
import { escapeLight } from './escapes.ts'

const root = document.querySelector<HTMLElement>('.temple-opening')!
const stage = root.querySelector<HTMLElement>('.temple-stage')!
const firstPair = document.querySelector<HTMLElement>('.first-pair')!
const refrain = document.querySelector<HTMLElement>('.refrain-composition')!
const refrainStage = document.querySelector<HTMLElement>('.refrain-stage')!
const phrases = [...document.querySelectorAll<HTMLElement>('.refrain-phrase')]
const fitBlocks = blockType(firstPair)
const reduced = matchMedia('(prefers-reduced-motion: reduce)')
const abort = new AbortController()
const copyColour = colourCopy(firstPair, abort.signal, request)
const on = (target: EventTarget, event: string, listener: EventListener) =>
  target.addEventListener(event, listener, { signal: abort.signal })
let lastScroll = -Infinity
let needsResize = false
let refrainInk: ReturnType<typeof createTypeSurface>

const measure = document.createElement('canvas').getContext('2d')!
function inkBounds(phrase: HTMLElement) {
  const style = getComputedStyle(phrase)
  measure.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
  const fontAscent = measure.measureText('Hg').fontBoundingBoxAscent
  const range = document.createRange()
  let left = Infinity,
    right = -Infinity,
    top = Infinity,
    bottom = -Infinity
  for (const word of phrase.querySelectorAll<HTMLElement>('[data-word]')) {
    const node = word.firstChild!
    const text = node.textContent!
    for (let i = 0; i < text.length; i++) {
      range.setStart(node, i)
      range.setEnd(node, i + 1)
      const rect = range.getBoundingClientRect()
      const m = measure.measureText(text[i])
      left = Math.min(left, rect.left - m.actualBoundingBoxLeft)
      right = Math.max(right, rect.left + m.actualBoundingBoxRight)
      top = Math.min(top, rect.top + fontAscent - m.actualBoundingBoxAscent)
      bottom = Math.max(bottom, rect.top + fontAscent + m.actualBoundingBoxDescent)
    }
  }
  return { left, right, top, bottom, width: right - left, height: bottom - top }
}
function fitRefrain() {
  const width = refrainStage.clientWidth * 0.9
  const maxHeight = innerHeight * 0.5
  for (const phrase of phrases) {
    phrase.style.removeProperty('--ink-x')
    phrase.style.removeProperty('--ink-y')
    if (phrase.dataset.face === 'bricolage') {
      phrase.style.fontSize = '100px'
      // Fit actual glyph ink, not advance boxes: the long line touches both edges.
      const bounds = inkBounds(phrase)
      phrase.style.fontSize = `${(100 * refrainStage.clientWidth) / bounds.width}px`
      const ink = inkBounds(phrase),
        rect = phrase.getBoundingClientRect()
      phrase.style.setProperty(
        '--ink-x',
        `${rect.left + rect.width / 2 - (ink.left + ink.right) / 2}px`,
      )
      phrase.style.setProperty(
        '--ink-y',
        `${rect.top + rect.height / 2 - (ink.top + ink.bottom) / 2}px`,
      )
      continue
    }
    const size = Math.min(190, width / 5.9, maxHeight / 2.6)
    phrase.style.fontSize = `${size}px`
    for (let i = 0; i < 3; i++) {
      const content = phrase.querySelector<HTMLElement>('[data-ink]')!
      const scale = Math.min(1, maxHeight / content.offsetHeight, width / content.scrollWidth)
      if (scale >= 0.999) break
      phrase.style.fontSize = `${parseFloat(phrase.style.fontSize) * scale}px`
    }
  }
  const contentHeight =
    Math.max(...phrases.map((p) => Math.max(p.offsetHeight, inkBounds(p).height))) + 32
  refrain.style.setProperty('--refrain-height', `${contentHeight}px`)
}

function resize() {
  fitBlocks()
  fitRefrain()
  refrainInk.resize()
  copyColour.resize()
  request()
}
function draw(now: number, frame: TypeFrame) {
  if (needsResize) {
    needsResize = false
    resize()
  }
  const scrolling = now - lastScroll < 140
  copyColour.draw(now, reduced.matches)
  const section = refrain.getBoundingClientRect()
  const hold = section.height - refrainStage.offsetHeight
  const stickyTop = (stage.clientHeight - refrainStage.offsetHeight) / 2
  const position = Math.max(0, Math.min(1, (stickyTop - section.top) / hold))
  let index = 0,
    next = 0,
    blend = 0
  const transitions = [
    [0, 0.36],
    [0.64, 1],
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
  return refrainInk.draw(frame, now, index, next, blend, scrolling)
}
function request() {
  if (!document.hidden && !abort.signal.aborted) invalidateForest()
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
  fitBlocks()
  fitRefrain()
  refrainInk = createTypeSurface(
    document.querySelector('.refrain-canvas')!,
    phrases.map((p) => p.querySelector('[data-ink]')!),
    abort.signal,
    request,
  )
  refrainInk.resize()
  copyColour.resize()
  on(window, 'scroll', () => {
    lastScroll = performance.now()
    request()
  })
  // Fit in the shared frame, not inside ResizeObserver's delivery cycle: fitting
  // changes the observed section's height and otherwise loops in WebKit.
  const observer = new ResizeObserver(() => {
    needsResize = true
    request()
  })
  observer.observe(firstPair)
  observer.observe(stage)
  on(document.querySelector('[data-copy-color]')!, 'input', (event) => {
    const value = (event.target as HTMLInputElement).value
    document.body.style.setProperty('--copy-color', value)
    copyColour.setBase(value)
    request()
  })
  document.querySelectorAll<HTMLInputElement>('[data-mist-color]').forEach((input) =>
    on(input, 'input', () => {
      const index = Number(input.dataset.mistColor),
        hue = Number(input.value)
      mist.hues[index] = hue
      document.querySelector<HTMLElement>(`[data-mist-swatch="${index}"]`)!.style.color =
        `rgb(255,${Math.round((255 * hue) / 60)},8)`
      invalidateForest()
      request()
    }),
  )
  on(document.querySelector('[data-mist-intensity]')!, 'input', (event) => {
    const value = (event.target as HTMLInputElement).value
    mist.intensity = Number(value) / 100
    invalidateForest()
    document.querySelector('[data-mist-intensity-label]')!.textContent = `${value} %`
    request()
  })
  on(document.querySelector('[data-mist-highlights]')!, 'input', (event) => {
    const value = (event.target as HTMLInputElement).value
    mist.highlights = Number(value) / 100
    document.querySelector('[data-mist-highlights-label]')!.textContent = `${value} %`
    invalidateForest()
    request()
  })
  on(document.querySelector('[data-copy-variance]')!, 'input', (event) => {
    const value = (event.target as HTMLInputElement).value
    copyColour.setVariance(Number(value) / 100)
    document.querySelector('[data-copy-variance-label]')!.textContent = `${value} %`
    request()
  })
  on(document.querySelector('[data-copy-speed]')!, 'input', (event) => {
    const speed = Number((event.target as HTMLInputElement).value) / 25
    copyColour.setSpeed(speed)
    document.querySelector('[data-copy-speed-label]')!.textContent = `${speed.toFixed(1)}×`
    request()
  })
  on(document.querySelector('[data-escape-strength]')!, 'input', (event) => {
    const value = (event.target as HTMLInputElement).value
    escapeLight.intensity = Number(value) / 100
    document.querySelector('[data-escape-label]')!.textContent = `${value} %`
    request()
  })
  on(document.querySelector('[data-hide]')!, 'click', toggleUI)
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
    if (!document.hidden) request()
  })
  on(window, 'pagehide', () => {
    abort.abort()
    observer.disconnect()
  })
  on(reduced, 'change', request)
  // All masks and material share the opener's one animation frame.
  setTypeFrame(draw)
  await mountOpening(root, openingProps, abort.signal)
  request()
}
