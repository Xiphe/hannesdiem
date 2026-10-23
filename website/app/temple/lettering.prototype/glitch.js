// Letter exchange experiment. Original fonts; fixed slots, baseline and anchors.
const root = document.documentElement
root.dataset.mode = 'glitch'
root.dataset.fill = 'solid'
const catalog = await fetch('/typefaces.json').then((response) => response.json())
const faces = ['19', '21', '2', '1'].map((id) => catalog.find((face) => face.id === id))
const style = document.createElement('style')
style.textContent = faces
  .map(
    (face) =>
      `@font-face { font-family: "${face.family}"; src: url("/fonts/${face.file}.ttf"); font-weight: ${face.weight}; }`,
  )
  .join('\n')
document.head.append(style)
await Promise.all(faces.map((face) => document.fonts.load(`${face.weight} 100px "${face.family}"`)))

const main = document.querySelector('main')
main.setAttribute('aria-label', 'Interactive title lettering experiment')
const canvas = document.createElement('canvas')
canvas.setAttribute('role', 'img')
canvas.setAttribute('aria-label', 'Temple of Sound')
main.append(canvas)
const context = canvas.getContext('2d')
const measure = document.createElement('canvas').getContext('2d')
const image = new Image()
image.src = '/forest.webp'
await image.decode()
const words = ['TEMPLE', 'OF', 'SOUND']
const select = document.querySelector('#typeface')
const fill = document.querySelector('#fill')
select.setAttribute('aria-label', 'Starting lettering')
select.add(new Option('Mixed lettering', 'mixed'))
faces.forEach((face, index) => select.add(new Option(face.name, String(index))))
fill.setAttribute('aria-pressed', 'true')
fill.setAttribute('aria-label', 'Show photographic lettering')

const effect = document.createElement('button')
effect.type = 'button'
effect.textContent = '↯'
effect.title = 'Letter exchange on / off'
effect.setAttribute('aria-label', 'Letter exchange')
effect.setAttribute('aria-pressed', 'true')
document.querySelector('nav').append(effect)
document.querySelector('#overview').title = 'Compare the typefaces'
document.querySelector('#overview').setAttribute('aria-label', 'Compare the typefaces')
document.querySelector('#overview').addEventListener('click', () => {
  location.href = '/prototype/temple-lettering?round=3'
})

let base = -1
let enabled = true
let letters = []
let frame = 0
let lastPointer = null
let lastPointerSwap = 0
const edits = new Map()
const reduced = matchMedia('(prefers-reduced-motion: reduce)')

// Normalize cap heights, retaining each font's original proportions and outlines.
const metrics = words.map((word) =>
  [...word].map((char) =>
    faces.map((face) => {
      measure.font = `${face.weight} 100px "${face.family}"`
      const cap = measure.measureText('H').actualBoundingBoxAscent
      const size = 10000 / cap
      measure.font = `${face.weight} ${size}px "${face.family}"`
      const ink = measure.measureText(char)
      return {
        size,
        left: ink.actualBoundingBoxLeft,
        right: ink.actualBoundingBoxRight,
        ascent: ink.actualBoundingBoxAscent,
        descent: ink.actualBoundingBoxDescent,
      }
    }),
  ),
)

function layout() {
  const rect = canvas.getBoundingClientRect()
  const ratio = Math.min(devicePixelRatio, 2)
  canvas.width = Math.round(rect.width * ratio)
  canvas.height = Math.round(rect.height * ratio)
  context.setTransform(ratio, 0, 0, ratio, 0, 0)
  const widths = metrics.map((row) =>
    row.map((options) => Math.max(...options.map((m) => m.left + m.right)) + 5),
  )
  const rowWidths = widths.map((row) => row.reduce((sum, width) => sum + width, 0) - 5)
  const width = rowWidths[0] + rowWidths[2] - rowWidths[1]
  const ascent = Math.max(...metrics.flat(2).map((m) => m.ascent))
  const descent = Math.max(0, ...metrics.flat(2).map((m) => m.descent))
  const rowHeight = ascent + descent + 22
  const height = rowHeight * 3 - 22
  const scale = Math.min((rect.width - 40) / width, (rect.height - 200) / height)
  const left = (rect.width - width * scale) / 2
  const top = (rect.height - 60 - height * scale) / 2
  const joint = rowWidths[0] - rowWidths[1]
  canvas.dataset.anchors = JSON.stringify({
    templeRight: left + rowWidths[0] * scale,
    ofRight: left + (joint + rowWidths[1]) * scale,
    ofLeft: left + joint * scale,
    soundLeft: left + joint * scale,
  })
  letters = []
  words.forEach((word, row) => {
    let x = row === 0 ? 0 : joint
    ;[...word].forEach((char, column) => {
      letters.push({
        char,
        row,
        column,
        x: left + x * scale,
        baseline: top + (ascent + row * rowHeight) * scale,
        width: (widths[row][column] - 5) * scale,
        scale,
        metrics: metrics[row][column],
        index: letters.length,
      })
      x += widths[row][column]
    })
  })
  canvas.dataset.slots = JSON.stringify(
    letters.map(({ x, baseline, width }) => ({ x, baseline, width })),
  )
  edits.clear()
  requestDraw()
}

function scrollFace(letter) {
  const step = enabled ? Math.floor(scrollY / 44) : 0
  const turns = Math.floor(step / letters.length)
  const front = step % letters.length
  const start = base < 0 ? (letter.index * 7 + 2) % faces.length : base
  return (start + turns + (letter.index < front ? 1 : 0)) % faces.length
}

function requestDraw() {
  if (!frame) frame = requestAnimationFrame(draw)
}

function draw(now) {
  frame = 0
  const { width, height } = canvas.getBoundingClientRect()
  context.clearRect(0, 0, width, height)
  context.fillStyle = '#f5f3ed'
  for (const letter of letters) {
    const edit = edits.get(letter.index)
    if (edit && edit.expires <= now) edits.delete(letter.index)
    const faceIndex = enabled && edit?.expires > now ? edit.face : scrollFace(letter)
    const face = faces[faceIndex]
    const metric = letter.metrics[faceIndex]
    const inkWidth = (metric.left + metric.right) * letter.scale
    let x = letter.x + (letter.width - inkWidth) / 2
    if (letter.column === 0) x = letter.x
    if (letter.column === words[letter.row].length - 1) x = letter.x + letter.width - inkWidth
    context.font = `${face.weight} ${metric.size * letter.scale}px "${face.family}"`
    context.fillText(letter.char, x + metric.left * letter.scale, letter.baseline)
  }
  if (root.dataset.fill === 'photo') {
    context.globalCompositeOperation = 'source-in'
    const scale = Math.max(width / image.width, height / image.height)
    context.drawImage(
      image,
      (width - image.width * scale) / 2,
      (height - image.height * scale) / 2,
      image.width * scale,
      image.height * scale,
    )
    context.globalCompositeOperation = 'source-over'
  }
  // Test/review state exposes fixed geometry separately from changing faces.
  canvas.dataset.faces = letters
    .map((letter) => edits.get(letter.index)?.face ?? scrollFace(letter))
    .join(',')
  if (edits.size) requestDraw()
}

canvas.addEventListener('pointermove', (event) => {
  if (!enabled || event.pointerType === 'touch') return
  const now = performance.now()
  const rect = canvas.getBoundingClientRect()
  const pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top }
  if (lastPointer && Math.hypot(pointer.x - lastPointer.x, pointer.y - lastPointer.y) < 9) return
  lastPointer = pointer
  if (now - lastPointerSwap < (reduced.matches ? 160 : 55)) return
  const nearest = [...letters].sort(
    (a, b) =>
      Math.hypot(a.x + a.width / 2 - pointer.x, a.baseline - 45 * a.scale - pointer.y) -
      Math.hypot(b.x + b.width / 2 - pointer.x, b.baseline - 45 * b.scale - pointer.y),
  )[0]
  if (
    !nearest ||
    Math.hypot(
      nearest.x + nearest.width / 2 - pointer.x,
      nearest.baseline - 45 * nearest.scale - pointer.y,
    ) > Math.max(70, 110 * nearest.scale)
  )
    return
  const prior = edits.get(nearest.index)?.face ?? scrollFace(nearest)
  edits.set(nearest.index, {
    face: (prior + 1) % faces.length,
    expires: now + (reduced.matches ? 350 : 230),
  })
  lastPointerSwap = now
  requestDraw()
})
canvas.addEventListener('pointerleave', () => {
  lastPointer = null
})
window.addEventListener('scroll', requestDraw, { passive: true })
window.addEventListener('resize', layout)
select.addEventListener('change', () => {
  base = select.value === 'mixed' ? -1 : Number(select.value)
  edits.clear()
  requestDraw()
})
document.querySelector('#previous').addEventListener('click', () => {
  select.selectedIndex = (select.selectedIndex + select.options.length - 1) % select.options.length
  select.dispatchEvent(new Event('change'))
})
document.querySelector('#next').addEventListener('click', () => {
  select.selectedIndex = (select.selectedIndex + 1) % select.options.length
  select.dispatchEvent(new Event('change'))
})
fill.addEventListener('click', () => {
  const solid = root.dataset.fill === 'photo'
  root.dataset.fill = solid ? 'solid' : 'photo'
  fill.setAttribute('aria-pressed', String(solid))
  fill.setAttribute('aria-label', solid ? 'Show photographic lettering' : 'Show solid lettering')
  requestDraw()
})
effect.addEventListener('click', () => {
  enabled = !enabled
  effect.setAttribute('aria-pressed', String(enabled))
  edits.clear()
  requestDraw()
})
layout()
