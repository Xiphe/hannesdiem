import { roughBand as sharedBand, drawDisturbance, type TypeFrame } from './typography.ts'
import type { Escapes } from './escapes.ts'
import { createForest } from './forest.ts'
import type { OpeningProps } from './types.ts'
type Face = { id: string; family: string; weight: number }
type Glyph = {
  char: string
  row: number
  x: number
  y: number
  width: number
  height: number
  origin: number
  baseline: number
  tile: HTMLCanvasElement
  offsetX: number
  offsetY: number
}
type Layer = {
  rows: {
    surface: HTMLCanvasElement
    x: number
    y: number
    width: number
    height: number
    text: string
  }[]
  glyphs: Glyph[]
}
type Disturbance = {
  start: number
  layer: number
  glyph: number
  serial: number
  idle?: boolean
  duration?: number
  strength?: number
}

export async function mountOpening(
  root: HTMLElement,
  props: OpeningProps,
  signal: AbortSignal,
  effects: {
    escapes: Escapes
    paintMist: (
      context: CanvasRenderingContext2D,
      width: number,
      height: number,
      seconds: number,
    ) => void
    drawType: (now: number, frame: TypeFrame) => boolean
    paintType?: (frame: TypeFrame) => void
    ready: () => void
  },
) {
  const { beginPortals, cachePortal, addPortal, drawEscapes } = effects.escapes
  const clamp = (value: number) => Math.max(0, Math.min(1, value))
  const smooth = (value: number) => {
    const t = clamp(value)
    return t * t * (3 - 2 * t)
  }
  const hash = (value: number) => {
    const n = Math.sin(value * 127.1 + 311.7) * 43758.5453
    return n - Math.floor(n)
  }
  // A fresh rhythm per visit, stable while scrolling backwards or resizing.
  const seed = crypto.getRandomValues(new Uint32Array(1))[0] % 100000
  const variation = (value: number) => hash(value + seed)
  const changes: { row: number; from: number; next: number; start: number; end: number }[] = []
  for (let face = 0; face < 3; face++) {
    const order = [0, 1, 2].sort((a, b) => variation(face * 17 + a) - variation(face * 17 + b))
    const weights = order.map((row) => 0.65 + variation(face * 41 + row + 100) * 0.9)
    const total = weights.reduce((sum, weight) => sum + weight, 0)
    let at = 0.055 + face * 0.29
    order.forEach((row, index) => {
      const duration = (weights[index] / total) * 0.25
      changes.push({
        row,
        from: face,
        next: face + 1,
        start: at,
        end: at + duration * (0.95 + variation(face * 13 + row + 200) * 0.22),
      })
      at += duration
    })
  }
  const faces = [
    { id: '1', family: 'Bricolage', weight: 800 },
    { id: '19', family: 'Germania', weight: 400 },
    { id: '21', family: 'CinzelDecorative', weight: 700 },
    { id: '2', family: 'Unbounded', weight: 650 },
  ]
  const stage = root.querySelector<HTMLElement>('.temple-stage')!
  const canvas = root.querySelector('canvas')!
  const date = root.querySelector<HTMLElement>('.temple-date')!
  const scrollHint = root.querySelector<HTMLElement>('.temple-scroll-hint')!
  const image = root.querySelector('img')!
  await Promise.all([
    image.decode(),
    ...faces.map((face) => document.fonts.load(`${face.weight} 100px "${face.family}"`)),
  ])
  if (signal.aborted) return
  const paintForest = createForest(image, props.lightSource, effects.escapes, signal)
  const context = canvas.getContext('2d')!
  const foreground = root.parentElement!.querySelector<HTMLCanvasElement>('.temple-escapes')!
  const foregroundInk = foreground.getContext('2d')!
  const mask = document.createElement('canvas')
  const maskContext = mask.getContext('2d')!
  const measure = document.createElement('canvas').getContext('2d')!
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const portrait = matchMedia('(orientation: portrait)')
  const appearance = matchMedia('(prefers-color-scheme: dark)')
  const words = props.title.toUpperCase().split(/\s+/)
  const lastInputStart = performance.now()
  let width = 0,
    height = 0,
    ratio = 1,
    layers: Layer[] = [],
    raf = 0
  let lastNow = performance.now(),
    elapsed = 0
  let pointer: { x: number; y: number } | null = null,
    pointerAt = 0,
    gesture = 0
  const disturbances = new Map<string | number, Disturbance>()
  let lastInput = lastInputStart,
    lastScroll = -Infinity,
    nextIdle = lastInputStart + 1000 + variation(400) * 600,
    idleSerial = 0

  // Optical corrections for this Bricolage wordmark, in 100-cap-height units.
  // Preserve native kerning, then close each pair to a shallow ink overlap.
  const bricolagePairs: Record<string, number> = {
    TE: -9.2,
    EM: -11.2,
    MP: -14.2,
    PL: -9.2,
    LE: -8.2,
    OF: -11.2,
    SO: -10.2,
    OU: -11.2,
    UN: -13.2,
    ND: -13.2,
  }

  function makeLayer(face: Face): Layer {
    const bricolage = face.id === '1'
    const cinzel = face.id === '21'
    const text = cinzel ? ['TEMpLe', 'of', 'SOuNd'] : words
    measure.letterSpacing = '0px'
    measure.font = `${face.weight} 100px "${face.family}"`
    const unitSize = 10000 / measure.measureText('H').actualBoundingBoxAscent
    measure.font = `${face.weight} ${unitSize}px "${face.family}"`
    measure.fontKerning = 'normal'
    const shaping = text.map((word) => {
      const native = measure.measureText(word)
      let adjustment = 0
      let left = Infinity,
        right = -Infinity
      const positions = [...word].map((char, column) => {
        if (bricolage && column)
          adjustment += bricolagePairs[word.slice(column - 1, column + 1)] ?? 0
        const glyph = measure.measureText(char)
        const position =
          measure.measureText(word.slice(0, column + 1)).width - glyph.width + adjustment
        left = Math.min(left, position - glyph.actualBoundingBoxLeft)
        right = Math.max(right, position + glyph.actualBoundingBoxRight)
        return position
      })
      return {
        positions,
        bounds: bricolage
          ? {
              actualBoundingBoxLeft: -left,
              actualBoundingBoxRight: right,
              actualBoundingBoxAscent: native.actualBoundingBoxAscent,
              actualBoundingBoxDescent: native.actualBoundingBoxDescent,
            }
          : native,
      }
    })
    const bounds = shaping.map((word) => word.bounds)
    const rowWidths = bounds.map(
      (bound) => bound.actualBoundingBoxLeft + bound.actualBoundingBoxRight,
    )
    const extent = rowWidths[0] + rowWidths[2] - rowWidths[1]
    const ascent = Math.max(...bounds.map((bound) => bound.actualBoundingBoxAscent))
    const leading = bricolage ? 89 : 119
    const baselines = [ascent, ascent + leading, ascent + leading * 2]
    // Halve the visible OF–SOUND gap, rather than halving their baseline distance.
    const originalGap =
      leading - bounds[2].actualBoundingBoxAscent - bounds[1].actualBoundingBoxDescent
    if (cinzel) baselines[2] -= originalGap / 2
    const totalHeight = baselines[2] + Math.max(0, bounds[2].actualBoundingBoxDescent)
    const inset = bricolage ? 0 : Math.max(16, width * 0.03)
    const scale = portrait.matches
      ? Math.min((width - inset * 2) / Math.max(...rowWidths), (height * 0.78) / totalHeight)
      : bricolage
        ? width / extent
        : Math.min((width * 0.88) / extent, (height * 0.78) / totalHeight)
    const size = unitSize * scale
    const left = (width - extent * scale) / 2
    const top = (height - totalHeight * scale) / 2 - height * 0.025
    const joint = left + (rowWidths[0] - rowWidths[1]) * scale
    const glyphs: Glyph[] = []
    const rows = text.map((word, row) => {
      const x = portrait.matches ? (width - rowWidths[row] * scale) / 2 : row === 0 ? left : joint
      const origin = x + bounds[row].actualBoundingBoxLeft * scale
      const baseline = top + baselines[row] * scale
      const y = baseline - bounds[row].actualBoundingBoxAscent * scale
      const w = rowWidths[row] * scale
      const h = (bounds[row].actualBoundingBoxAscent + bounds[row].actualBoundingBoxDescent) * scale
      const surface = document.createElement('canvas')
      surface.width = Math.ceil((w + 8) * ratio)
      surface.height = Math.ceil((h + 8) * ratio)
      const ink = surface.getContext('2d')!
      ink.setTransform(ratio, 0, 0, ratio, 0, 0)
      ink.fillStyle = '#fff'
      ink.font = `${face.weight} ${size}px "${face.family}"`
      ink.fontKerning = 'normal'
      ink.letterSpacing = '0px'
      if (bricolage) {
        ;[...word].forEach((char, column) =>
          ink.fillText(
            char,
            origin - x + 4 + shaping[row].positions[column] * scale,
            baseline - y + 4,
          ),
        )
      } else ink.fillText(word, origin - x + 4, baseline - y + 4)
      if (face.id === '19') {
        // The line belongs to the word's mask, including its spaces between strokes.
        ink.fillRect(4, baseline - y - 45 * scale + 4, w, 4 * scale)
      }
      ;[...word].forEach((char, column) => {
        const metrics = ink.measureText(char)
        const prefix = shaping[row].positions[column] * scale
        const glyphOrigin = origin + prefix
        const x1 = glyphOrigin - metrics.actualBoundingBoxLeft
        const y1 = baseline - metrics.actualBoundingBoxAscent
        const gw = metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight
        const gh = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent
        const tile = document.createElement('canvas')
        tile.width = Math.ceil((gw + 8) * ratio)
        tile.height = Math.ceil((gh + 8) * ratio)
        const tileInk = tile.getContext('2d')!
        tileInk.setTransform(ratio, 0, 0, ratio, 0, 0)
        tileInk.font = ink.font
        tileInk.fillStyle = '#fff'
        tileInk.fillText(
          char,
          metrics.actualBoundingBoxLeft + 4,
          metrics.actualBoundingBoxAscent + 4,
        )
        glyphs.push({
          char,
          row,
          x: x1,
          y: y1,
          width: gw,
          height: gh,
          origin: glyphOrigin,
          baseline,
          tile,
          offsetX: -metrics.actualBoundingBoxLeft - 4,
          offsetY: -metrics.actualBoundingBoxAscent - 4,
        })
      })
      return {
        surface,
        x: x - 4,
        y: y - 4,
        width: surface.width / ratio,
        height: surface.height / ratio,
        text: word,
      }
    })
    return {
      rows,
      glyphs,
    }
  }

  function resize() {
    const rect = stage.getBoundingClientRect()
    width = rect.width
    height = rect.height
    ratio = Math.min(devicePixelRatio, 1.5)
    for (const surface of [canvas, mask, foreground]) {
      surface.width = Math.round(width * ratio)
      surface.height = Math.round(height * ratio)
    }
    for (const ink of [context, maskContext, foregroundInk])
      ink.setTransform(ratio, 0, 0, ratio, 0, 0)
    layers = faces.map(makeLayer)
    for (const layer of layers) for (const row of layer.rows) cachePortal(row.surface)
    disturbances.clear()
    requestDraw()
  }

  function state() {
    const scroll = Math.max(0, -root.getBoundingClientRect().top)
    const progress = (scroll / height) * (2 / 0.3)
    const rows = words.map((_, row) => {
      let result = { row, index: 0, next: 0, blend: 0 }
      for (const change of changes.filter((change) => change.row === row)) {
        if (progress < change.start) break
        result =
          progress >= change.end
            ? { row, index: change.next, next: change.next, blend: 0 }
            : {
                row,
                index: change.from,
                next: change.next,
                blend: smooth((progress - change.start) / (change.end - change.start)),
              }
      }
      return result
    })
    // Finish the face changes first, then exit at the following text’s document speed.
    const y = Math.max(0, scroll - height * 0.1575)
    return {
      scroll,
      // The browser scrolls the sticky canvas. Glyph masks stay in local space.
      y: 0,
      exit: y,
      rows,
      rowFaces: rows.map((row) => (row.blend > 0.5 ? row.next : row.index)),
      reveal: smooth((y / height - 0.08) / 0.8),
    }
  }

  function drawLayer(
    ink: CanvasRenderingContext2D,
    layer: Layer,
    y: number,
    alpha = 1,
    dx = 0,
    dy = 0,
    row?: number,
  ) {
    ink.globalAlpha = alpha
    for (const word of row === undefined ? layer.rows : [layer.rows[row]])
      ink.drawImage(word.surface, word.x + dx, word.y + dy - y, word.width, word.height)
  }

  function roughBand(
    ink: CanvasRenderingContext2D,
    y: number,
    h: number,
    seed: number,
    offset = 0,
  ) {
    sharedBand(ink, width, y, h, seed, offset)
  }
  function compose(s: ReturnType<typeof state>, now: number) {
    maskContext.clearRect(0, 0, width, height)
    for (let row = 0; row < 3; row++) {
      const phase = s.rows[row]
      const a = layers[phase.index]
      const blend = phase.blend
      const active = blend > 0
      if (!active) {
        drawLayer(maskContext, a, s.y, 1, 0, 0, row)
        continue
      }
      const b = layers[phase.next]
      const pressure = Math.sin(blend * Math.PI)
      if (reduced.matches || blend === 1) {
        drawLayer(maskContext, a, s.y, 1 - blend, 0, 0, row)
        drawLayer(maskContext, b, s.y, blend, 0, 0, row)
      } else {
        drawLayer(maskContext, a, s.y, Math.min(1, (1 - blend) * 1.45), 0, 0, row)
        drawLayer(maskContext, b, s.y, Math.min(1, blend * 1.45), 0, 0, row)
        const beat = Math.floor(s.scroll / 16)
        const region = a.rows[row]
        for (let patch = 0; patch < 4; patch++) {
          const py = region.y + hash(patch + beat * 0.05) * region.height - s.y
          maskContext.save()
          roughBand(maskContext, py, 8 + hash(patch + 11) * 24, patch + beat)
          maskContext.globalCompositeOperation = patch === 3 ? 'destination-out' : 'source-over'
          drawLayer(
            maskContext,
            patch % 2 ? a : b,
            s.y,
            pressure * 0.65,
            (hash(patch + beat) - 0.5) * 28 * pressure,
            0,
            row,
          )
          maskContext.restore()
        }
      }
    }
    // Brief returns and premonitions: whole-word frames mixed with clipped fragments.
    const beat = Math.floor(now / 48)
    const fragment =
      !reduced.matches &&
      now - lastScroll < 145 &&
      s.scroll > 0 &&
      s.exit < height * 0.75 &&
      variation(beat + 901) > 0.3
    if (fragment) {
      const count = variation(beat + 83) > 0.55 ? 2 : 1
      for (let flash = 0; flash < count; flash++) {
        const row = (Math.floor(variation(beat + 12) * 3) + flash) % 3
        const current = s.rowFaces[row]
        const face = (current + 1 + Math.floor(variation(beat + flash * 31 + 19) * 3)) % 4
        const source = layers[face]
        const region = layers[current].rows[row]
        maskContext.save()
        if (flash === 0 && variation(beat + 88) < 0.2) {
          maskContext.globalCompositeOperation = 'destination-out'
          drawLayer(maskContext, layers[current], s.y, 0.92, 0, 0, row)
          maskContext.globalCompositeOperation = 'source-over'
          drawLayer(maskContext, source, s.y, 0.92, 0, 0, row)
        } else {
          roughBand(
            maskContext,
            region.y + region.height * (0.1 + variation(beat + flash) * 0.7) - s.y,
            Math.max(5, region.height * (0.1 + variation(beat + 51) * 0.13)),
            beat + flash,
          )
          drawLayer(maskContext, source, s.y, 0.78, (hash(beat + 2) - 0.5) * 36, 0, row)
        }
        maskContext.restore()
      }
    }
    maskContext.globalAlpha = 1
    maskContext.globalCompositeOperation = 'source-over'
  }

  function disturb(event: Disturbance, s: ReturnType<typeof state>, now: number) {
    const age = now - event.start
    const duration = event.idle ? event.duration! : reduced.matches ? 220 : 680
    if (age >= duration) return false
    const letter = layers[event.layer].glyphs[event.glyph]
    const alt = layers[(event.layer + 1 + (event.glyph % 2)) % 4].glyphs[event.glyph]
    drawDisturbance(
      maskContext,
      width,
      ratio,
      letter,
      alt,
      { ...event, age, duration, y: s.y },
      reduced.matches,
    )
    return true
  }
  function requestDraw() {
    if (!raf && !document.hidden && visible && !suspended && !signal.aborted)
      raf = requestAnimationFrame(draw)
  }
  function draw(now: number) {
    raf = 0
    const dt = Math.min(0.05, (now - lastNow) / 1000)
    lastNow = now
    if (!reduced.matches) elapsed += dt
    const s = state()
    const hintOpacity = String(1 - smooth(s.scroll / Math.min(36, height * 0.04)))
    if (scrollHint.style.opacity !== hintOpacity) scrollHint.style.opacity = hintOpacity
    const titleBounds = canvas.getBoundingClientRect()
    if (titleBounds.bottom > 0) compose(s, now)
    beginPortals()
    for (const phase of s.rows)
      if (titleBounds.bottom > 0 && (phase.blend <= 0.08 || phase.blend >= 0.92)) {
        const row = layers[s.rowFaces[phase.row]].rows[phase.row]
        addPortal(
          row.surface,
          row.x + titleBounds.left,
          row.y + titleBounds.top,
          row.width,
          row.height,
        )
      }
    const frame: TypeFrame = {
      bounds: new DOMRect(0, 0, width, height),
      paintMaterial(ink, bounds) {
        ink.save()
        ink.translate(-bounds.left, -bounds.top)
        const top = Math.max(0, bounds.top),
          left = Math.max(0, bounds.left)
        const clip = new DOMRect(
          left,
          top,
          Math.max(0, Math.min(width, bounds.right) - left),
          Math.max(0, Math.min(height, bounds.bottom) - top),
        )
        paintForest(ink, width, height, elapsed, clip)
        effects.paintMist(ink, width, height, elapsed)
        ink.restore()
      },
    }
    const typeActive = effects.drawType(now, frame)
    if (!reduced.matches && now > nextIdle && now - lastInput > 800 && !s.exit) {
      const glyph = Math.floor(variation(idleSerial + 71) * layers[0].glyphs.length)
      const row = layers[0].glyphs[glyph].row
      disturbances.set(`idle-${idleSerial}`, {
        start: now,
        layer: s.rowFaces[row],
        glyph,
        serial: idleSerial++,
        idle: true,
        duration: 180 + variation(idleSerial + 102) * 160,
        strength: 0.18 + variation(idleSerial + 215) * 0.2,
      })
      nextIdle = now + 950 + variation(idleSerial) * 1350
    }
    for (const [key, event] of disturbances) if (!disturb(event, s, now)) disturbances.delete(key)

    if (titleBounds.bottom > 0) {
      context.clearRect(0, 0, width, height)
      frame.paintMaterial(context, titleBounds)
      context.globalCompositeOperation = 'destination-in'
      context.drawImage(mask, 0, 0, width, height)
      context.globalCompositeOperation = 'source-over'
    }
    effects.paintType?.(frame)
    foregroundInk.clearRect(0, 0, width, height)
    drawEscapes(foregroundInk, elapsed, reduced.matches)
    if (!root.hasAttribute('data-ready')) {
      root.dataset.ready = 'true'
      effects.ready()
    }
    if (!reduced.matches || disturbances.size || typeActive) requestDraw()
  }

  function touchLetter(event: PointerEvent) {
    const now = performance.now()
    lastInput = now
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left,
      y = event.clientY - rect.top
    if (pointer && Math.hypot(x - pointer.x, y - pointer.y) < 5) return
    pointer = { x, y }
    if (now - pointerAt < (reduced.matches ? 180 : 65)) return
    const s = state()
    const found = layers
      .flatMap((layer, index) => layer.glyphs.map((glyph, i) => ({ glyph, i, index })))
      .filter(({ glyph, index }) => {
        const face = s.rowFaces[glyph.row]
        return (
          index === face &&
          x >= glyph.x - 4 &&
          x <= glyph.x + glyph.width + 4 &&
          y + s.y >= glyph.y - 4 &&
          y + s.y <= glyph.y + glyph.height + 4
        )
      })
      .sort(
        (a, b) =>
          Math.abs(x - a.glyph.x - a.glyph.width / 2) - Math.abs(x - b.glyph.x - b.glyph.width / 2),
      )[0]
    if (!found) return
    pointerAt = now
    disturbances.set(found.i, { start: now, layer: found.index, glyph: found.i, serial: gesture++ })
    while (disturbances.size > 2) disturbances.delete(disturbances.keys().next().value!)
    requestDraw()
  }
  canvas.addEventListener(
    'pointermove',
    (event) => {
      if (event.pointerType !== 'touch') touchLetter(event)
    },
    { signal },
  )
  canvas.addEventListener('pointerdown', touchLetter, { signal })
  canvas.addEventListener(
    'pointerleave',
    () => {
      pointer = null
    },
    { signal },
  )
  window.addEventListener(
    'scroll',
    () => {
      lastInput = lastScroll = performance.now()
      requestDraw()
    },
    { passive: true, signal },
  )
  portrait.addEventListener('change', resize, { signal })
  appearance.addEventListener(
    'change',
    () => {
      requestDraw()
    },
    { signal },
  )
  const sizeObserver = new ResizeObserver(resize)
  sizeObserver.observe(stage)
  reduced.addEventListener(
    'change',
    () => {
      requestDraw()
    },
    { signal },
  )
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden) {
        cancelAnimationFrame(raf)
        raf = 0
      } else {
        lastNow = performance.now()
        requestDraw()
      }
    },
    { signal },
  )

  let suspended = false
  window.addEventListener(
    'pagehide',
    () => {
      suspended = true
      cancelAnimationFrame(raf)
      raf = 0
    },
    { signal },
  )
  window.addEventListener(
    'pageshow',
    () => {
      suspended = false
      lastNow = performance.now()
      requestDraw()
    },
    { signal },
  )
  let visible = true
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting
    if (visible) {
      lastNow = performance.now()
      requestDraw()
    } else {
      cancelAnimationFrame(raf)
      raf = 0
    }
  })
  observer.observe(root.parentElement!)
  signal.addEventListener(
    'abort',
    () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      sizeObserver.disconnect()
      disturbances.clear()
      layers = []
      for (const surface of [canvas, mask, foreground]) surface.width = surface.height = 0
      root.removeAttribute('data-ready')
    },
    { once: true },
  )
  resize()
  return requestDraw
}
