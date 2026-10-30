import { mountOpening } from './scene.ts'
import type { OpeningProps } from './types.ts'
import { createTypeSurface, type TypeFrame } from './typography.ts'
import { createAtmosphere } from './atmosphere.ts'
import { createEscapes } from './escapes.ts'
import { colourCopy } from './copy-colour.ts'
import { blockType } from './block-type.ts'
export async function mountArtwork(
  host: HTMLElement,
  props: OpeningProps,
  signal: AbortSignal,
  ready: () => void,
) {
  const abort = new AbortController()
  signal.addEventListener('abort', () => abort.abort(), { once: true })
  const root = host.querySelector<HTMLElement>('.temple-opening')!
  const stage = root.querySelector<HTMLElement>('.temple-stage')!
  const firstPair = host.querySelector<HTMLElement>('.first-pair')!
  if (!firstPair) {
    const escapes = createEscapes(signal)
    await mountOpening(root, props, signal, {
      escapes,
      paintMist: createAtmosphere(signal),
      drawType: () => false,
      ready,
    })
    return
  }
  const refrain = host.querySelector<HTMLElement>('.refrain-composition')!
  const refrainStage = host.querySelector<HTMLElement>('.refrain-stage')!
  const phrases = [...host.querySelectorAll<HTMLElement>('.refrain-phrase')]
  const fitBlocks = blockType(firstPair, abort.signal)
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const appearance = matchMedia('(prefers-color-scheme: dark)')
  const escapes = createEscapes(abort.signal)
  const paintMist = createAtmosphere(abort.signal)
  let requestScene = () => {}
  const copyColour = colourCopy(
    firstPair,
    abort.signal,
    request,
    root.querySelector<HTMLElement>('.temple-date')!,
  )
  const on = (target: EventTarget, event: string, listener: EventListener) =>
    target.addEventListener(event, listener, { signal: abort.signal })
  let lastScroll = -Infinity
  let needsResize = false
  let maskResizeFrames = 0
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
    // WebKit settles native baseline probes after painting the newly fitted DOM.
    // Rebuilding masks immediately caches old baselines and clips later rows.
    maskResizeFrames = 2
    request()
  }
  function draw(now: number, frame: TypeFrame) {
    if (needsResize) {
      needsResize = false
      resize()
    }
    if (maskResizeFrames > 0) {
      if (--maskResizeFrames === 0) {
        refrainInk.resize()
        copyColour.resize()
      } else request()
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
    const active = String(blend < 0.5 ? index : next)
    if (refrain.dataset.active !== active) refrain.dataset.active = active
    return refrainInk.draw(frame, now, index, next, blend, scrolling)
  }
  function request() {
    if (!document.hidden && !abort.signal.aborted) requestScene()
  }
  function syncCopyAppearance() {
    // Read explicit theme tokens: light-dark() can still return the previous
    // used colour during a media-query change, including its first render frame.
    const hex = getComputedStyle(host)
      .getPropertyValue(appearance.matches ? '--copy-ink-dark' : '--copy-ink-light')
      .trim()
    copyColour.setBase(hex, !appearance.matches)
    request()
  }

  try {
    await Promise.all([
      document.fonts.load('350 28px UnboundedCopy'),
      document.fonts.load('700 80px CinzelDecorative'),
      document.fonts.load('800 100px Bricolage'),
      document.fonts.load('400 100px Germania'),
    ])
    if (!abort.signal.aborted) {
      syncCopyAppearance()
      refrain.dataset.ready = 'true'
      fitBlocks()
      fitRefrain()
      await settledLayout(abort.signal)
      if (abort.signal.aborted) return
      refrainInk = createTypeSurface(
        host.querySelector('.refrain-canvas')!,
        phrases.map((p) => p.querySelector('[data-ink]')!),
        abort.signal,
        request,
        escapes,
      )
      refrainInk.resize()
      copyColour.resize()
      on(window, 'scroll', () => {
        lastScroll = performance.now()
        request()
      })
      // Fit only when layout inputs change. The section height is our output:
      // observing it as an input can repeatedly refit the centred refrain.
      let layout = `${firstPair.clientWidth}/${stage.clientWidth}/${stage.clientHeight}`
      const observer = new ResizeObserver(() => {
        const next = `${firstPair.clientWidth}/${stage.clientWidth}/${stage.clientHeight}`
        if (next === layout) return
        layout = next
        needsResize = true
        request()
      })
      observer.observe(firstPair)
      observer.observe(stage)
      on(document, 'visibilitychange', () => {
        if (!document.hidden) request()
      })
      abort.signal.addEventListener(
        'abort',
        () => {
          observer.disconnect()
          refrain.removeAttribute('data-ready')
          refrain.removeAttribute('data-active')
          refrain.style.removeProperty('--refrain-height')
          for (const phrase of phrases) phrase.removeAttribute('style')
        },
        { once: true },
      )
      on(reduced, 'change', request)
      on(appearance, 'change', () => {
        syncCopyAppearance()
      })
      // All masks and material share the opener's one animation frame.
      requestScene =
        (await mountOpening(root, props, abort.signal, {
          escapes,
          paintMist,
          drawType: draw,
          paintType: (frame) => refrainInk.paint(frame),
          ready,
        })) ?? (() => {})
      request()
    }
  } catch (error) {
    abort.abort()
    throw error
  }
}

// Only a startup barrier; ongoing rendering belongs to the scene's shared RAF.
function settledLayout(signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(finish)
    })
    function finish() {
      cancelAnimationFrame(frame)
      signal.removeEventListener('abort', finish)
      resolve()
    }
    signal.addEventListener('abort', finish, { once: true })
  })
}
