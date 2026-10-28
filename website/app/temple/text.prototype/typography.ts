// Shared with the pinned opener in the local browser bundle. No production edits.
export type Glyph = {
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
export const hash = (value: number) => {
  const n = Math.sin(value * 127.1 + 311.7) * 43758.5453
  return n - Math.floor(n)
}
export const forestFrame = document.createElement('canvas')
export let forestBounds = { left: 0, top: 0, width: 0, height: 0 }
const forestInk = forestFrame.getContext('2d')!
export function captureForest(source: HTMLCanvasElement) {
  forestBounds = source.getBoundingClientRect()
  if (forestFrame.width !== source.width || forestFrame.height !== source.height) {
    forestFrame.width = source.width
    forestFrame.height = source.height
  }
  forestInk.drawImage(source, 0, 0)
}

export function roughBand(
  ink: CanvasRenderingContext2D,
  width: number,
  y: number,
  h: number,
  seed: number,
  offset = 0,
) {
  ink.beginPath()
  ink.moveTo(0, y + offset)
  for (let x = 0; x <= width + 32; x += 32)
    ink.lineTo(x, y + offset + (hash(seed + x * 0.01) - 0.5) * Math.min(9, h * 0.3))
  ink.lineTo(width, y + h + offset)
  for (let x = width; x >= -32; x -= 32)
    ink.lineTo(x, y + h + offset + (hash(seed + x * 0.013 + 10) - 0.5) * Math.min(9, h * 0.3))
  ink.closePath()
  ink.clip()
}

export function drawDisturbance(
  maskContext: CanvasRenderingContext2D,
  width: number,
  ratio: number,
  letter: Glyph,
  alt: Glyph,
  event: {
    age: number
    duration: number
    idle?: boolean
    strength?: number
    serial: number
    glyph: number
    y: number
  },
  reduced: boolean,
) {
  const { age, duration } = event
  const envelope = Math.min(1, age / 35) * (1 - age / duration)
  const beat = Math.floor(age / (reduced ? 110 : 46))
  const rhythm = [1, 0.25, 0.8, 0.15, 0.65, 0.4][beat % 6]
  const amount = envelope * rhythm * (event.idle ? event.strength! : 1)
  const spread = (reduced ? 2 : Math.min(17, letter.height * 0.11)) * amount
  maskContext.save()
  // Only the touched character's neighbourhood is disturbed, never the word's spacing.
  maskContext.beginPath()
  maskContext.rect(letter.x - 7, letter.y - event.y - 7, letter.width + 14, letter.height + 14)
  maskContext.clip()
  maskContext.globalCompositeOperation = 'destination-out'
  maskContext.globalAlpha = amount * 0.95
  maskContext.drawImage(
    letter.tile,
    letter.x - 4,
    letter.y - event.y - 4,
    letter.tile.width / ratio,
    letter.tile.height / ratio,
  )
  maskContext.globalCompositeOperation = 'source-over'
  for (let band = 0; band < 5; band++) {
    maskContext.save()
    const y = letter.y - event.y + (letter.height * band) / 5
    roughBand(maskContext, width, y, letter.height / 5 + 2, event.glyph * 7 + band + beat)
    const source = (band + beat) % 3 === 0 ? alt : letter
    const dx = (hash(band + event.serial + beat) > 0.5 ? 1 : -1) * spread
    maskContext.globalAlpha = amount * 0.68
    maskContext.drawImage(
      source.tile,
      letter.origin + source.offsetX + dx,
      letter.baseline + source.offsetY - event.y + (band % 2 ? 1 : -1) * spread * 0.2,
      source.tile.width / ratio,
      source.tile.height / ratio,
    )
    maskContext.restore()
  }
  maskContext.restore()
}

export const faces = [
  { family: 'Bricolage', weight: 800 },
  { family: 'Germania', weight: 400 },
  { family: 'CinzelDecorative', weight: 700 },
  { family: 'UnboundedCopy', weight: 650 },
] as const

type Word = { surface: HTMLCanvasElement; x: number; y: number; width: number; height: number }
type Layer = {
  surface: HTMLCanvasElement
  words: Word[]
  glyphs: (Glyph & { char: string })[]
  size: number
}
type Event = {
  start: number
  glyph: number
  serial: number
  idle?: boolean
  duration: number
  strength?: number
  layer: Layer
}

// Same glyph disturbance and ragged clipping as the opener; arbitrary native text.
export function createTypeSurface(
  canvas: HTMLCanvasElement,
  inkElements: HTMLElement[],
  signal: AbortSignal,
  invalidate: () => void,
) {
  const context = canvas.getContext('2d')!
  const mask = document.createElement('canvas')
  const maskInk = mask.getContext('2d')!
  const measure = document.createElement('canvas').getContext('2d')!
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const events = new Map<number, Event>()
  const tiles = new Map<string, Glyph>()
  // Fresh per visit; fixed across reverse scrolling and resize.
  const seed = Math.random() * 10000
  const variation = (n: number) => hash(n + seed)
  let width = 0,
    height = 0,
    ratio = 1,
    serial = 0,
    current = 0,
    lastPointer = 0
  let layers: Layer[] = []
  let lastInput = performance.now(),
    nextIdle = lastInput + 1000 + Math.random() * 900

  function makeLayer(element: HTMLElement): Layer {
    const hostRect = canvas.getBoundingClientRect()
    const surface = document.createElement('canvas')
    surface.width = canvas.width
    surface.height = canvas.height
    const ink = surface.getContext('2d')!
    ink.setTransform(ratio, 0, 0, ratio, 0, 0)
    const style = getComputedStyle(element)
    const size = parseFloat(style.fontSize)
    ink.font = `${style.fontWeight} ${size}px ${style.fontFamily}`
    ink.letterSpacing = style.letterSpacing === 'normal' ? '0px' : style.letterSpacing
    ink.fontKerning = 'normal'
    ink.fillStyle = '#fff'
    measure.font = ink.font
    const fm = measure.measureText('Hg')
    const glyphs: Layer['glyphs'] = []
    const wordElements = [...element.querySelectorAll<HTMLElement>('[data-word]')]
    const groups = wordElements.length ? wordElements : [element]
    const wordBounds: { x: number; y: number; width: number; height: number }[] = []
    for (const group of groups) {
      const firstGlyph = glyphs.length
      const node = group.firstChild!
      const range = document.createRange()
      const text = node.textContent!
      const lines: { text: string; x: number; baseline: number; y: number }[] = []
      for (let i = 0; i < text.length; i++) {
        range.setStart(node, i)
        range.setEnd(node, i + 1)
        const rect = range.getBoundingClientRect()
        const baseline = rect.top - hostRect.top + fm.fontBoundingBoxAscent
        let line = lines.find((line) => Math.abs(line.y - rect.top) < 2)
        if (!line) {
          line = { text: '', x: rect.left - hostRect.left, baseline, y: rect.top }
          lines.push(line)
        }
        line.text += text[i]
        if (!text[i].trim()) continue
        const metrics = ink.measureText(text[i])
        const glyph = tile(text[i], style.fontFamily, Number(style.fontWeight), size)
        glyphs.push({
          ...glyph,
          char: text[i],
          origin: rect.left - hostRect.left,
          baseline,
          x: rect.left - hostRect.left - metrics.actualBoundingBoxLeft,
          y: baseline - metrics.actualBoundingBoxAscent,
        })
      }
      for (const line of lines) ink.fillText(line.text.trimEnd(), line.x, line.baseline)
      const wordGlyphs = glyphs.slice(firstGlyph)
      const left = Math.min(...wordGlyphs.map((g) => g.x))
      const top = Math.min(...wordGlyphs.map((g) => g.y))
      const right = Math.max(...wordGlyphs.map((g) => g.x + g.width))
      const bottom = Math.max(...wordGlyphs.map((g) => g.y + g.height))
      const x = Math.max(0, left - 4),
        y = Math.max(0, top - 4)
      wordBounds.push({
        x,
        y,
        width: Math.min(width - x, right + 4 - x),
        height: Math.min(height - y, bottom + 4 - y),
      })
    }
    const words = wordBounds.map((bounds) => {
      const word = document.createElement('canvas')
      word.width = Math.max(1, Math.ceil(bounds.width * ratio))
      word.height = Math.max(1, Math.ceil(bounds.height * ratio))
      word
        .getContext('2d')!
        .drawImage(
          surface,
          bounds.x * ratio,
          bounds.y * ratio,
          bounds.width * ratio,
          bounds.height * ratio,
          0,
          0,
          word.width,
          word.height,
        )
      return { ...bounds, surface: word }
    })
    return { surface, words, glyphs, size }
  }

  function tile(char: string, family: string, weight: number, size: number): Glyph {
    const key = `${char}/${family}/${weight}/${size}`
    const cached = tiles.get(key)
    if (cached) return cached
    measure.font = `${weight} ${size}px ${family}`
    const m = measure.measureText(char)
    const width = m.actualBoundingBoxLeft + m.actualBoundingBoxRight
    const height = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent
    const tile = document.createElement('canvas')
    tile.width = Math.max(1, Math.ceil((width + 8) * ratio))
    tile.height = Math.max(1, Math.ceil((height + 8) * ratio))
    const ink = tile.getContext('2d')!
    ink.setTransform(ratio, 0, 0, ratio, 0, 0)
    ink.font = measure.font
    ink.fillStyle = '#fff'
    ink.fillText(char, m.actualBoundingBoxLeft + 4, m.actualBoundingBoxAscent + 4)
    const glyph = {
      tile,
      width,
      height,
      x: 0,
      y: 0,
      origin: 0,
      baseline: 0,
      offsetX: -m.actualBoundingBoxLeft - 4,
      offsetY: -m.actualBoundingBoxAscent - 4,
    }
    tiles.set(key, glyph)
    return glyph
  }

  function resize() {
    const rect = canvas.getBoundingClientRect()
    width = rect.width
    height = rect.height
    ratio = Math.min(devicePixelRatio, 1.5)
    canvas.width = mask.width = Math.max(1, Math.round(width * ratio))
    canvas.height = mask.height = Math.max(1, Math.round(height * ratio))
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    maskInk.setTransform(ratio, 0, 0, ratio, 0, 0)
    events.clear()
    tiles.clear()
    layers = inkElements.map(makeLayer)
  }

  function addEvent(layer: Layer, glyph: number, idle: boolean, now: number) {
    events.set(idle ? -1 : glyph, {
      start: now,
      glyph,
      layer,
      serial: serial++,
      idle,
      duration: idle ? 180 + Math.random() * 160 : reduced.matches ? 220 : 680,
      strength: idle ? 0.18 + Math.random() * 0.2 : 1,
    })
    while (events.size > 2) events.delete(events.keys().next().value!)
  }
  canvas.parentElement!.addEventListener(
    'pointermove',
    (event) => {
      if (event.pointerType === 'touch') return
      const now = performance.now()
      lastInput = now
      if (now - lastPointer < (reduced.matches ? 180 : 65)) return
      const rect = canvas.getBoundingClientRect(),
        x = event.clientX - rect.left,
        y = event.clientY - rect.top
      const layer = layers[current]
      const glyph = layer.glyphs.findIndex(
        (g) => x >= g.x - 4 && x <= g.x + g.width + 4 && y >= g.y - 4 && y <= g.y + g.height + 4,
      )
      if (glyph < 0) return
      addEvent(layer, glyph, false, now)
      lastPointer = now
      invalidate()
    },
    { signal },
  )

  function draw(now: number, index = 0, next = index, blend = 0, scrolling = false) {
    const rect = canvas.getBoundingClientRect()
    if (rect.bottom < 0 || rect.top > innerHeight || rect.width === 0) return false
    const a = layers[index],
      b = layers[next]
    if (!a || !b) return false
    current = blend < 0.5 ? index : next
    maskInk.clearRect(0, 0, width, height)
    const layer = (value: Layer, alpha = 1, dx = 0) => {
      maskInk.globalAlpha = alpha
      maskInk.drawImage(value.surface, dx, 0, width, height)
    }
    if (blend <= 0) layer(a)
    else if (reduced.matches) {
      layer(a, 1 - blend)
      layer(b, blend)
    } else {
      const smooth = (n: number) => {
        const t = Math.max(0, Math.min(1, n))
        return t * t * (3 - 2 * t)
      }
      const pressure = Math.sin(blend * Math.PI)
      const part = (word: Word, alpha: number, dx = 0) => {
        maskInk.globalAlpha = alpha
        maskInk.drawImage(word.surface, word.x + dx, word.y, word.width, word.height)
      }
      // One word starts at lock; the last word resolves exactly at release.
      const wordPhases = (count: number, salt: number) => {
        const order = Array.from({ length: count }, (_, i) => i).sort(
          (a, b) => variation(a * 13 + salt) - variation(b * 13 + salt),
        )
        return Array.from({ length: count }, (_, i) => {
          const rank = order.indexOf(i)
          const start = count === 1 ? 0 : (rank / (count - 1)) * 0.58
          const end =
            rank === count - 1 ? 1 : Math.min(0.94, start + 0.18 + variation(i + salt + 81) * 0.25)
          return smooth((blend - start) / (end - start))
        })
      }
      const departing = wordPhases(a.words.length, index * 43)
      const arriving = wordPhases(b.words.length, index * 59 + 400)
      a.words.forEach((word, i) => part(word, 1 - departing[i]))
      b.words.forEach((word, i) => part(word, arriving[i]))
      const beat = Math.floor(blend * 120 + index * 29)
      for (let patch = 0; patch < 9; patch++) {
        maskInk.save()
        roughBand(
          maskInk,
          width,
          height * variation(beat + patch * 3),
          10 + variation(patch + 4) * 48,
          beat + patch,
        )
        maskInk.globalCompositeOperation = patch === 8 ? 'destination-out' : 'source-over'
        layer(patch % 2 ? a : b, pressure * 0.9, (variation(beat + patch) - 0.5) * 76 * pressure)
        maskInk.restore()
      }
      // Past/future words cut briefly through the current phrase while scrolling.
      if (scrolling && variation(Math.floor(now / 42) + 700) > 0.25) {
        const frame = Math.floor(now / 42)
        for (let flash = 0; flash < 2; flash++) {
          const source = layers[Math.floor(variation(frame + flash * 17) * layers.length)]
          const word = source.words[Math.floor(variation(frame + flash + 91) * source.words.length)]
          maskInk.save()
          if (variation(frame + flash + 55) > 0.3)
            roughBand(
              maskInk,
              width,
              word.y + word.height * variation(frame + 5),
              Math.max(10, word.height * 0.28),
              frame + flash,
            )
          part(word, 0.95 * pressure, (variation(frame + flash + 20) - 0.5) * 64)
          maskInk.restore()
        }
      }
    }
    maskInk.globalAlpha = 1
    if (scrolling) lastInput = now
    if (!reduced.matches && now > nextIdle && now - lastInput > 800) {
      const l = layers[current]
      if (l.glyphs.length) addEvent(l, Math.floor(Math.random() * l.glyphs.length), true, now)
      nextIdle = now + 950 + Math.random() * 1350
    }
    for (const [key, event] of events) {
      const age = now - event.start
      if (age >= event.duration) {
        events.delete(key)
        continue
      }
      const letter = event.layer.glyphs[event.glyph]
      const face = faces[(event.serial + event.glyph) % faces.length]
      const alt = tile(letter.char, face.family, face.weight, event.layer.size)
      drawDisturbance(maskInk, width, ratio, letter, alt, { ...event, age, y: 0 }, reduced.matches)
    }
    context.clearRect(0, 0, width, height)
    // Crop the SAME live forest+glimmers frame before the opener's veil is applied.
    if (forestFrame.width)
      context.drawImage(
        forestFrame,
        0,
        0,
        forestFrame.width,
        forestFrame.height,
        forestBounds.left - rect.left,
        forestBounds.top - rect.top,
        forestBounds.width,
        forestBounds.height,
      )
    context.globalCompositeOperation = 'destination-in'
    context.drawImage(mask, 0, 0, mask.width, mask.height, 0, 0, width, height)
    context.globalCompositeOperation = 'source-over'
    return events.size > 0
  }
  return { resize, draw }
}
