// Codrops' effect10: random 50ms letter stagger, 250ms opacity/20px blur reveal.
// Native WAAPI filters work in WebKit too; only temporary glyph canvases animate.
// Reference: https://github.com/codrops/OnScrollTypographyAnimations/blob/main/src/js/index.js
type Glyph = {
  canvas: HTMLCanvasElement
  mask: HTMLCanvasElement
  x: number
  y: number
  width: number
  height: number
  delay: number
}
type Group = {
  element: HTMLElement
  state: 'pending' | 'playing' | 'settled'
  glyphs: Glyph[]
  rows: { y: number; height: number }[]
  animations: Animation[]
  started: number
  generation: number
  order: number[]
}
export function highlightReveal(paragraph: HTMLElement, signal: AbortSignal, changed: () => void) {
  const groups: Group[] = [
    ...paragraph.querySelectorAll<HTMLElement>('[data-lettering="cinzel"]'),
  ].map((element) => ({
    element,
    state: 'pending',
    glyphs: [],
    rows: [],
    animations: [],
    started: 0,
    generation: 0,
    order: [],
  }))
  let reduced = matchMedia('(prefers-reduced-motion: reduce)').matches

  function detach(group: Group) {
    group.generation++
    for (const animation of group.animations) animation.cancel()
    group.animations = []
    for (const glyph of group.glyphs) glyph.canvas.remove()
  }
  function state(group: Group, value: Group['state']) {
    if (group.state === value) return
    detach(group)
    group.state = value
    group.element.dataset.highlightState = value
    changed()
  }
  function play(group: Group) {
    if (!group.glyphs.length || reduced || signal.aborted) return
    const generation = ++group.generation
    const elapsed = performance.now() - group.started
    for (const glyph of group.glyphs) {
      paragraph.append(glyph.canvas)
      const animation = glyph.canvas.animate(
        [
          { opacity: 0, filter: 'blur(20px)' },
          { opacity: 1, filter: 'blur(0px)' },
        ],
        { duration: 250, delay: glyph.delay, easing: 'ease-in-out', fill: 'both' },
      )
      animation.currentTime = elapsed
      group.animations.push(animation)
    }
    Promise.all(group.animations.map((animation) => animation.finished)).then(
      () => {
        if (!signal.aborted && group.generation === generation) state(group, 'settled')
      },
      () => {}, // Layout rebuild/disposal cancels the old animations.
    )
  }
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const group = groups.find((group) => group.element === entry.target)!
      if (reduced || entry.boundingClientRect.bottom <= 0) state(group, 'settled')
      else if (entry.isIntersecting && group.state === 'pending') {
        state(group, 'playing')
        group.started = performance.now()
        play(group)
      } else if (entry.boundingClientRect.top >= innerHeight) state(group, 'pending')
    }
  })
  for (const group of groups) {
    group.element.dataset.highlightState = 'pending'
    observer.observe(group.element)
  }
  signal.addEventListener(
    'abort',
    () => {
      observer.disconnect()
      for (const group of groups) {
        detach(group)
        for (const { canvas, mask } of group.glyphs)
          canvas.width = canvas.height = mask.width = mask.height = 0
        group.glyphs = []
        delete group.element.dataset.highlightState
      }
    },
    { once: true },
  )

  return {
    resize(bounds: DOMRect, ratio: number) {
      for (const group of groups) {
        detach(group)
        for (const { canvas, mask } of group.glyphs)
          canvas.width = canvas.height = mask.width = mask.height = 0
        group.glyphs = []
        group.rows = []
        const range = document.createRange()
        for (const row of group.element.querySelectorAll<HTMLElement>('.block-row-ink')) {
          const style = getComputedStyle(row)
          const rowRect = row.parentElement!.getBoundingClientRect()
          group.rows.push({ y: rowRect.top - bounds.top, height: rowRect.height })
          const baseline =
            row.querySelector('.block-baseline')!.getBoundingClientRect().top - bounds.top
          const node = row.firstChild!
          const text = node.textContent!
          for (let at = 0; at < text.length; at++) {
            if (!text[at].trim()) continue
            range.setStart(node, at)
            range.setEnd(node, at + 1)
            const position = range.getBoundingClientRect()
            const mask = document.createElement('canvas')
            const ink = mask.getContext('2d')!
            ink.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
            ink.fontKerning = 'normal'
            const font = ink.font
            const metrics = ink.measureText(text[at])
            const x = position.left - bounds.left - metrics.actualBoundingBoxLeft - 2
            const y = baseline - metrics.actualBoundingBoxAscent - 2
            const width = metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight + 4
            const height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent + 4
            const canvas = document.createElement('canvas')
            canvas.className = 'copy-highlight-glyph'
            canvas.ariaHidden = 'true'
            canvas.width = mask.width = Math.ceil(width * ratio)
            canvas.height = mask.height = Math.ceil(height * ratio)
            Object.assign(canvas.style, {
              left: `${x}px`,
              top: `${y}px`,
              width: `${width}px`,
              height: `${height}px`,
            })
            ink.setTransform(mask.width / width, 0, 0, mask.height / height, 0, 0)
            ink.font = font
            ink.fillStyle = '#fff'
            ink.fillText(
              text[at],
              metrics.actualBoundingBoxLeft + 2,
              metrics.actualBoundingBoxAscent + 2,
            )
            group.glyphs.push({ canvas, mask, x, y, width, height, delay: 0 })
          }
        }
        if (group.order.length !== group.glyphs.length) {
          group.order = group.glyphs.map((_, index) => index)
          for (let i = group.order.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            ;[group.order[i], group.order[j]] = [group.order[j], group.order[i]]
          }
        }
        group.glyphs.forEach((glyph, index) => {
          glyph.delay = group.order[index] * 50
        })
        if (group.state === 'playing') play(group)
      }
    },
    setReduced(value: boolean) {
      reduced = value
      if (reduced) for (const group of groups) state(group, 'settled')
    },
    clearUnrevealed(context: CanvasRenderingContext2D, width: number) {
      for (const group of groups)
        if (group.state !== 'settled')
          for (const row of group.rows) context.clearRect(0, row.y, width, row.height)
    },
    paint(texture: HTMLCanvasElement, width: number, height: number, offset: number) {
      for (const group of groups)
        if (group.state === 'playing')
          for (const glyph of group.glyphs) {
            const ink = glyph.canvas.getContext('2d')!
            ink.setTransform(
              glyph.canvas.width / glyph.width,
              0,
              0,
              glyph.canvas.height / glyph.height,
              0,
              0,
            )
            ink.globalCompositeOperation = 'copy'
            ink.drawImage(glyph.mask, 0, 0, glyph.width, glyph.height)
            ink.globalCompositeOperation = 'source-in'
            ink.drawImage(texture, -glyph.x, -offset - glyph.y, width, height)
            ink.globalCompositeOperation = 'source-over'
          }
    },
  }
}
