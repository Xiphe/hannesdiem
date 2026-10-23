// Exploration: intact, naturally kerned wordmarks become a live-scene mask.
// Whole words change while pinned; the completed sequence then scrolls upward.
import { createForest } from './forest.js'

const clamp = (value) => Math.max(0, Math.min(1, value))
const smooth = (value) => {
  const t = clamp(value)
  return t * t * (3 - 2 * t)
}
const hash = (value) => {
  const n = Math.sin(value * 127.1 + 311.7) * 43758.5453
  return n - Math.floor(n)
}
// A fresh rhythm per visit, stable while scrolling backwards or resizing.
const seed = crypto.getRandomValues(new Uint32Array(1))[0] % 100000
const variation = (value) => hash(value + seed)
const changes = []
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
const root = document.documentElement
root.dataset.mode = 'layers'
document.querySelector('nav')?.remove()
const catalog = await fetch('/typefaces.json').then((response) => response.json())
const faces = ['1', '19', '21', '2'].map((id) => catalog.find((face) => face.id === id))
const fontStyle = document.createElement('style')
fontStyle.textContent = faces
  .map(
    (face) =>
      `@font-face{font-family:"${face.family}";src:url("/fonts/${face.file}.ttf");font-weight:${face.id === '1' ? '200 800' : face.weight}}`,
  )
  .join('\n')
document.head.append(fontStyle)
await Promise.all(faces.map((face) => document.fonts.load(`${face.weight} 100px "${face.family}"`)))
const image = new Image()
image.src = '/forest.webp'
await image.decode()
const paintForest = createForest(image)
const main = document.querySelector('main')
main.setAttribute('aria-label', 'Temple of Sound opening study')
const canvas = document.createElement('canvas')
canvas.setAttribute('role', 'img')
canvas.setAttribute('aria-label', 'Temple of Sound')
main.append(canvas)
const date = document.createElement('div')
date.className = 'scene-date'
const dateText = 'November 1 – December 20, 2026'
const dateLabel = document.createElement('span')
dateLabel.textContent = dateText
date.append(dateLabel)
document.body.append(date)
const scrollHint = document.createElement('div')
scrollHint.className = 'scroll-hint'
scrollHint.setAttribute('aria-hidden', 'true')
// Exact Heroicons 2.2.0 optimized/16/solid/arrow-down.svg (MIT).
// License: website/app/assets/heroicons-LICENSE
scrollHint.innerHTML =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" data-slot="icon"> <path fill-rule="evenodd" d="M8 2a.75.75 0 0 1 .75.75v8.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.22 3.22V2.75A.75.75 0 0 1 8 2Z" clip-rule="evenodd"/> </svg>'
document.body.append(scrollHint)
const context = canvas.getContext('2d')
const mask = document.createElement('canvas'),
  veil = document.createElement('canvas')
const maskContext = mask.getContext('2d'),
  veilContext = veil.getContext('2d')
const edgeOverlay = document.createElement('canvas')
const edgeContext = edgeOverlay.getContext('2d')
const measure = document.createElement('canvas').getContext('2d')
const reduced = matchMedia('(prefers-reduced-motion: reduce)')
const words = ['TEMPLE', 'OF', 'SOUND']
const lastInputStart = performance.now()
let width = 0,
  height = 0,
  ratio = 1,
  layers = [],
  raf = 0
const effect = new URL(location.href).searchParams.get('effect') === 'cuts' ? 'cuts' : 'impressions'
let lastNow = performance.now(),
  elapsed = 0
let pointer = null,
  pointerAt = 0,
  gesture = 0
const disturbances = new Map()
let lastInput = lastInputStart,
  lastScroll = -Infinity,
  nextIdle = lastInputStart + 1000 + variation(400) * 600,
  nextDate = lastInputStart + 1400,
  idleSerial = 0

// Optical corrections for this Bricolage wordmark, in 100-cap-height units.
// Preserve native kerning, then close each pair to a shallow ink overlap.
const bricolagePairs = {
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

function makeLayer(face) {
  const bricolage = face.id === '1'
  const cinzel = face.id === '21'
  const text = cinzel ? ['TEMpLe', 'of', 'SOuNd'] : words
  measure.letterSpacing = '0px'
  measure.font = `${face.weight} 100px "${face.family}"`
  const unitSize = 10000 / measure.measureText('H').actualBoundingBoxAscent
  measure.font = `${face.weight} ${unitSize}px "${face.family}"`
  measure.fontKerning = 'normal'
  const tracking = 0
  const shaping = text.map((word) => {
    const native = measure.measureText(word)
    let adjustment = 0
    let left = Infinity,
      right = -Infinity
    const positions = [...word].map((char, column) => {
      if (bricolage && column) adjustment += bricolagePairs[word.slice(column - 1, column + 1)] ?? 0
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
  const scale = bricolage
    ? width / extent
    : Math.min((width * 0.88) / extent, (height * 0.78) / totalHeight)
  const size = unitSize * scale
  const left = (width - extent * scale) / 2
  const top = (height - totalHeight * scale) / 2 - height * 0.025
  const joint = left + (rowWidths[0] - rowWidths[1]) * scale
  const glyphs = []
  const rows = text.map((word, row) => {
    const x = row === 0 ? left : joint
    const origin = x + bounds[row].actualBoundingBoxLeft * scale
    const baseline = top + baselines[row] * scale
    const y = baseline - bounds[row].actualBoundingBoxAscent * scale
    const w = rowWidths[row] * scale
    const h = (bounds[row].actualBoundingBoxAscent + bounds[row].actualBoundingBoxDescent) * scale
    const surface = document.createElement('canvas')
    surface.width = Math.ceil((w + 8) * ratio)
    surface.height = Math.ceil((h + 8) * ratio)
    const ink = surface.getContext('2d')
    ink.setTransform(ratio, 0, 0, ratio, 0, 0)
    ink.fillStyle = '#fff'
    ink.font = `${face.weight} ${size}px "${face.family}"`
    ink.fontKerning = 'normal'
    ink.letterSpacing = `${tracking * scale}px`
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
      const tileInk = tile.getContext('2d')
      tileInk.setTransform(ratio, 0, 0, ratio, 0, 0)
      tileInk.font = ink.font
      tileInk.fillStyle = '#fff'
      tileInk.fillText(char, metrics.actualBoundingBoxLeft + 4, metrics.actualBoundingBoxAscent + 4)
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
    face,
    rows,
    glyphs,
    anchors: {
      templeRight: left + rowWidths[0] * scale,
      ofRight: joint + rowWidths[1] * scale,
      ofLeft: joint,
      soundLeft: joint,
      left,
      right: left + extent * scale,
      tracking,
      leading,
      words: text,
      ofSoundGap: (cinzel ? originalGap / 2 : originalGap) * scale,
    },
  }
}

function resize() {
  const rect = canvas.getBoundingClientRect()
  width = rect.width
  height = rect.height
  ratio = Math.min(devicePixelRatio, 1.5)
  for (const surface of [canvas, mask, veil, edgeOverlay]) {
    surface.width = Math.round(width * ratio)
    surface.height = Math.round(height * ratio)
  }
  for (const ink of [context, maskContext, veilContext, edgeContext])
    ink.setTransform(ratio, 0, 0, ratio, 0, 0)
  paintOverlay()
  layers = faces.map(makeLayer)
  disturbances.clear()
  canvas.dataset.anchors = JSON.stringify(layers.map((layer) => layer.anchors))
  requestDraw()
}

function state() {
  const scroll = Math.max(0, -main.getBoundingClientRect().top)
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
  const focus = rows.find((row) => row.blend > 0) ?? rows[0]
  // Run the same sequence in 0.3 viewports of scroll, including the exit.
  const y = clamp((progress - 1.05) / 0.95) * height
  return {
    scroll,
    y,
    index: focus.index,
    next: focus.next,
    word: focus.row,
    blend: focus.blend,
    rows,
    rowFaces: rows.map((row) => (row.blend > 0.5 ? row.next : row.index)),
    reveal: smooth((y / height - 0.08) / 0.8),
  }
}

function drawLayer(ink, layer, y, alpha = 1, dx = 0, dy = 0, row) {
  ink.globalAlpha = alpha
  for (const word of row === undefined ? layer.rows : [layer.rows[row]])
    ink.drawImage(word.surface, word.x + dx, word.y + dy - y, word.width, word.height)
}

function roughBand(ink, y, h, seed, offset = 0) {
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

function compose(s, now) {
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
    } else if (effect === 'impressions') {
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
    } else {
      const low = Math.min(a.rows[row].y, b.rows[row].y) - s.y
      const high =
        Math.max(a.rows[row].y + a.rows[row].height, b.rows[row].y + b.rows[row].height) - s.y
      for (let strip = 0, py = low; py < high; py += 14, strip++) {
        const threshold = clamp(((strip % 13) / 13) * 0.5 + hash(strip + 91) * 0.5)
        const slip = (hash(strip + Math.floor(s.scroll / 21)) - 0.5) * 24 * pressure
        maskContext.save()
        roughBand(maskContext, py, 16, strip)
        drawLayer(maskContext, blend > threshold ? b : a, s.y, 1, slip, 0, row)
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
    s.y < height * 0.75 &&
    variation(beat + 901) > 0.3
  const fragmentFaces = []
  if (fragment) {
    const count = variation(beat + 83) > 0.55 ? 2 : 1
    for (let flash = 0; flash < count; flash++) {
      const row = (Math.floor(variation(beat + 12) * 3) + flash) % 3
      const current = s.rowFaces[row]
      const face = (current + 1 + Math.floor(variation(beat + flash * 31 + 19) * 3)) % 4
      const source = layers[face]
      const region = layers[current].rows[row]
      fragmentFaces.push({ row, current, face })
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
  return { active: fragment, faces: fragmentFaces }
}

function disturb(event, s, now) {
  const age = now - event.start
  const duration = event.idle ? event.duration : reduced.matches ? 220 : 680
  if (age >= duration) return false
  const letter = layers[event.layer].glyphs[event.glyph]
  const alt = layers[(event.layer + 1 + (event.glyph % 2)) % 4].glyphs[event.glyph]
  const envelope = Math.min(1, age / 35) * (1 - age / duration)
  const beat = Math.floor(age / (reduced.matches ? 110 : 46))
  const rhythm = [1, 0.25, 0.8, 0.15, 0.65, 0.4][beat % 6]
  const amount = envelope * rhythm * (event.idle ? event.strength : 1)
  const spread = (reduced.matches ? 2 : Math.min(17, letter.height * 0.11)) * amount
  maskContext.save()
  // Only the touched character's neighbourhood is disturbed, never the word's spacing.
  maskContext.beginPath()
  maskContext.rect(letter.x - 7, letter.y - s.y - 7, letter.width + 14, letter.height + 14)
  maskContext.clip()
  maskContext.globalCompositeOperation = 'destination-out'
  maskContext.globalAlpha = amount * 0.95
  maskContext.drawImage(
    letter.tile,
    letter.x - 4,
    letter.y - s.y - 4,
    letter.tile.width / ratio,
    letter.tile.height / ratio,
  )
  maskContext.globalCompositeOperation = 'source-over'
  for (let band = 0; band < 5; band++) {
    maskContext.save()
    const y = letter.y - s.y + (letter.height * band) / 5
    roughBand(maskContext, y, letter.height / 5 + 2, event.glyph * 7 + band + beat)
    const source = (band + beat) % 3 === 0 ? alt : letter
    const dx = (hash(band + event.serial + beat) > 0.5 ? 1 : -1) * spread
    maskContext.globalAlpha = amount * (effect === 'impressions' ? 0.68 : 1)
    maskContext.drawImage(
      source.tile,
      letter.origin + source.offsetX + dx,
      letter.baseline + source.offsetY - s.y + (band % 2 ? 1 : -1) * spread * 0.2,
      source.tile.width / ratio,
      source.tile.height / ratio,
    )
    maskContext.restore()
  }
  maskContext.restore()
  return true
}

function requestDraw() {
  if (!raf && !document.hidden) raf = requestAnimationFrame(draw)
}
function draw(now) {
  raf = 0
  const dt = Math.min(0.05, (now - lastNow) / 1000)
  lastNow = now
  if (!reduced.matches) elapsed += dt
  const s = state()
  date.style.setProperty('--scene-exit', `${-s.y}px`)
  scrollHint.style.opacity = String(1 - smooth(s.scroll / Math.min(36, height * 0.04)))
  const { active: fragment, faces: fragmentFaces } = compose(s, now)
  if (!reduced.matches && now > nextIdle && now - lastInput > 800 && !s.y) {
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
  if (!reduced.matches && now > nextDate) {
    date.animate([{ opacity: 0.12 }, { opacity: 1 }], { duration: 28 })
    nextDate = now + 1800 + variation(Math.floor(now / 73)) * 1400
  }
  context.clearRect(0, 0, width, height)
  paintForest(context, width, height, elapsed)
  // One opaque veil with openings over the *combined* photograph + particles.
  veilContext.clearRect(0, 0, width, height)
  veilContext.globalCompositeOperation = 'source-over'
  veilContext.globalAlpha = 1 - s.reveal
  veilContext.fillStyle = '#030503'
  veilContext.fillRect(0, 0, width, height)
  veilContext.globalAlpha = 1
  veilContext.globalCompositeOperation = 'destination-out'
  veilContext.drawImage(mask, 0, 0, mask.width, mask.height, 0, 0, width, height)
  veilContext.globalCompositeOperation = 'source-over'
  context.drawImage(veil, 0, 0, veil.width, veil.height, 0, 0, width, height)
  // Edge colour is clipped to the live lettering, then disappears with its reveal.
  if (overlayOpacity > 0 && s.reveal < 1) {
    veilContext.clearRect(0, 0, width, height)
    veilContext.drawImage(
      edgeOverlay,
      0,
      0,
      edgeOverlay.width,
      edgeOverlay.height,
      0,
      0,
      width,
      height,
    )
    veilContext.globalCompositeOperation = 'destination-in'
    veilContext.drawImage(mask, 0, 0, mask.width, mask.height, 0, 0, width, height)
    veilContext.globalCompositeOperation = 'source-over'
    context.globalAlpha = overlayOpacity * (1 - s.reveal)
    context.drawImage(veil, 0, 0, veil.width, veil.height, 0, 0, width, height)
    context.globalAlpha = 1
  }
  canvas.dataset.state = JSON.stringify({
    ...s,
    effect,
    fragment,
    fragmentFaces,
    face: layers[s.rowFaces[s.word]].face.name,
    disturbances: disturbances.size,
    time: elapsed,
    overlay: { color: overlayColor, opacity: overlayOpacity },
    idle: [...disturbances.values()].some((event) => event.idle),
  })
  if (!reduced.matches || disturbances.size) requestDraw()
}

function touchLetter(event) {
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
  while (disturbances.size > 2) disturbances.delete(disturbances.keys().next().value)
  requestDraw()
}
canvas.addEventListener('pointermove', (event) => {
  if (event.pointerType !== 'touch') touchLetter(event)
})
canvas.addEventListener('pointerdown', touchLetter)
canvas.addEventListener('pointerleave', () => {
  pointer = null
})
window.addEventListener(
  'scroll',
  () => {
    lastInput = lastScroll = performance.now()
    requestDraw()
  },
  { passive: true },
)
window.addEventListener('resize', resize)
reduced.addEventListener('change', () => {
  date.getAnimations().forEach((animation) => animation.cancel())
  requestDraw()
})
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    cancelAnimationFrame(raf)
    raf = 0
  } else {
    lastNow = performance.now()
    requestDraw()
  }
})

// Artist-selected edge overlay.
const overlayOpacity = 0.11
const overlayColor = '#ff8800'
function paintOverlay() {
  edgeContext.clearRect(0, 0, width, height)
  const transparent = overlayColor + '00'
  for (const gradient of [
    edgeContext.createLinearGradient(0, 0, width, 0),
    edgeContext.createLinearGradient(0, 0, 0, height),
  ]) {
    gradient.addColorStop(0, overlayColor)
    gradient.addColorStop(0.42, transparent)
    gradient.addColorStop(0.58, transparent)
    gradient.addColorStop(1, overlayColor)
    edgeContext.fillStyle = gradient
    edgeContext.fillRect(0, 0, width, height)
  }
}
resize()
