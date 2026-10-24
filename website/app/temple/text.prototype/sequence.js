// THROWAWAY coupling probe. Input chooses a fixed source unit; time only animates particles.
const stage = document.querySelector('.stage')
const sequence = document.querySelector('.sequence')
const units = [...document.querySelectorAll('.unit')]
const canvas = document.querySelector('canvas')
const context = canvas.getContext('2d')
const count = document.querySelector('[data-count]')
const bindingButton = document.querySelector('[data-binding]')
const motion = matchMedia('(prefers-reduced-motion: reduce)')
const image = new Image()
image.src = '/forest.jpg'
document.body.dataset.ready = ''
const [imageReady] = await Promise.all([
  image.decode().then(
    () => true,
    () => false,
  ),
  document.fonts.load('600 40px Bricolage'),
])

let seed = 8129
function random() {
  seed = (Math.imul(seed, 1664525) + 1013904223) | 0
  return (seed >>> 0) / 4294967296
}
const particles = Array.from({ length: 980 }, () => ({
  angle: random() * Math.PI * 2,
  phase: random(),
  speed: 0.045 + random() * 0.055,
  brightness: 0.04 + random() ** 3 * 1.9,
  size: 0.45 + random() ** 2 * 2.1,
  bound: random() < 0.64,
  pick: random(),
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
}))
const sprite = document.createElement('canvas')
sprite.width = sprite.height = 48
const brush = sprite.getContext('2d')
const glow = brush.createRadialGradient(24, 24, 0, 24, 24, 24)
glow.addColorStop(0, '#fff9df')
glow.addColorStop(0.1, '#ffeac6e0')
glow.addColorStop(0.3, '#ffd19365')
glow.addColorStop(1, '#ffb45b00')
brush.fillStyle = glow
brush.fillRect(0, 0, 48, 48)

let width = 0,
  height = 0,
  stride = 1,
  targets = []
let bound = true,
  active = -1,
  initialized = false
let progress = 0
let raf = 0,
  last = 0,
  time = 0
const abort = new AbortController()
const on = (target, event, listener) =>
  target.addEventListener(event, listener, { signal: abort.signal })
const clamp = (value, low, high) => Math.max(low, Math.min(high, value))
function ease(low, high, value) {
  const t = clamp((value - low) / (high - low), 0, 1)
  return t * t * (3 - 2 * t)
}

function freePosition(particle) {
  const dx = Math.cos(particle.angle),
    dy = Math.sin(particle.angle)
  const edge = 1 / Math.max(Math.abs(dx) / (width / 2), Math.abs(dy) / (height / 2))
  const life = (particle.phase + time * particle.speed) % 1
  const distance = life * edge * 1.08
  return { x: width / 2 + dx * distance, y: height / 2 + dy * distance }
}

function measure() {
  const position = initialized ? progress : 0
  width = stage.clientWidth
  height = stage.clientHeight
  const ratio = Math.min(devicePixelRatio, 1.5)
  canvas.width = Math.round(width * ratio)
  canvas.height = Math.round(height * ratio)
  context.setTransform(ratio, 0, 0, ratio, 0, 0)
  stride = (sequence.offsetHeight - height) / (units.length - 1)
  const mask = document.createElement('canvas')
  mask.width = width
  mask.height = height
  const ink = mask.getContext('2d', { willReadFrequently: true })
  const origin = stage.getBoundingClientRect()
  targets = units.map((unit) => {
    ink.clearRect(0, 0, width, height)
    const style = getComputedStyle(unit)
    ink.font = `${style.fontWeight} ${style.fontSize} Bricolage`
    ink.textBaseline = 'alphabetic'
    ink.fillStyle = '#fff'
    const metrics = ink.measureText('Hg')
    const ascent = metrics.fontBoundingBoxAscent
    const descent = metrics.fontBoundingBoxDescent
    for (const word of unit.querySelectorAll('.word')) {
      const rect = word.getBoundingClientRect()
      const baseline = (rect.height - ascent - descent) / 2 + ascent
      ink.fillText(word.textContent, rect.left - origin.left, rect.top - origin.top + baseline)
    }
    const pixels = ink.getImageData(0, 0, width, height).data
    const points = []
    const alpha = (x, y) => pixels[(y * width + x) * 4 + 3] ?? 0
    for (let y = 3; y < height - 3; y += 4) {
      for (let x = 3; x < width - 3; x += 4) {
        if (
          alpha(x, y) < 30 &&
          (alpha(x - 3, y) > 150 ||
            alpha(x + 3, y) > 150 ||
            alpha(x, y - 3) > 150 ||
            alpha(x, y + 3) > 150)
        )
          points.push({ x, y })
      }
    }
    return points
  })
  if (!initialized) {
    particles.forEach((particle) => Object.assign(particle, freePosition(particle)))
    initialized = true
  } else {
    // Keep the semantic unit/progress when a phone rotates or the viewport changes.
    scrollTo({ top: position * stride, behavior: 'instant' })
  }
  request()
}

function paint(now) {
  raf = 0
  if (document.hidden) return
  // A resize can clamp scrollY before ResizeObserver runs; retain the last semantic progress.
  if (stage.clientWidth !== width || stage.clientHeight !== height) {
    measure()
    return
  }
  const dt = last ? Math.min((now - last) / 1000, 0.04) : 1 / 60
  last = now
  if (!motion.matches) time += dt
  const position = clamp(scrollY / stride, 0, units.length - 1)
  progress = position
  const current = Math.min(Math.floor(position), units.length - 1)
  const next = Math.min(current + 1, units.length - 1)
  const fraction = position - current
  const morph = ease(0.55, 0.95, fraction)
  const dominant = fraction >= 0.78 ? next : current
  if (active !== dominant) {
    active = dominant
    units.forEach((unit, index) => {
      unit.getAnimations().forEach((animation) => animation.cancel())
      unit.style.opacity = index === active ? '1' : '0'
      unit.setAttribute('aria-hidden', String(index !== active))
    })
    // Input selects the unit; a short entrance finishes even if scrolling stops.
    // Avoid scroll positions where both sentences are almost invisible or overlap.
    if (!motion.matches)
      units[active].animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 240,
        easing: 'linear',
      })
    count.textContent = `${active + 1} / ${units.length}`
    sequence.dataset.active = String(active)
    document.querySelector('[data-previous]').disabled = active === 0
    document.querySelector('[data-next]').disabled = active === units.length - 1
  }
  // Same image-space sun point as the opener; photo and particles share one viewport.
  const sx = 0.5324,
    sy = 0.5407
  const scale = Math.max(
    width / (2 * Math.min(sx, 1 - sx) * image.naturalWidth),
    height / (2 * Math.min(sy, 1 - sy) * image.naturalHeight),
  )
  context.globalAlpha = 1
  context.globalCompositeOperation = 'source-over'
  if (imageReady)
    context.drawImage(
      image,
      width / 2 - image.naturalWidth * scale * sx,
      height / 2 - image.naturalHeight * scale * sy,
      image.naturalWidth * scale,
      image.naturalHeight * scale,
    )
  context.fillStyle = '#030503b8'
  context.fillRect(0, 0, width, height)
  context.globalCompositeOperation = 'screen'
  for (const particle of particles) {
    const free = freePosition(particle)
    let gx = free.x,
      gy = free.y
    const from = targets[current],
      to = targets[next]
    const gather = bound && particle.bound && from.length && to.length
    if (gather) {
      const a = from[Math.floor(particle.pick * from.length)]
      const b = to[Math.floor(particle.pick * to.length)]
      gx = a.x + (b.x - a.x) * morph + Math.sin(time * 0.6 + particle.phase * 20) * 2
      gy = a.y + (b.y - a.y) * morph + Math.cos(time * 0.5 + particle.phase * 17) * 2
    }
    if (motion.matches) {
      particle.x = gx
      particle.y = gy
      particle.vx = particle.vy = 0
    } else {
      const drag = Math.exp(-10 * dt)
      particle.vx = (particle.vx + (gx - particle.x) * 45 * dt) * drag
      particle.vy = (particle.vy + (gy - particle.y) * 45 * dt) * drag
      particle.x += particle.vx * dt
      particle.y += particle.vy * dt
    }
    const edgeDistance = Math.min(particle.x, width - particle.x, particle.y, height - particle.y)
    const fade = clamp(edgeDistance / (Math.min(width, height) * 0.085), 0, 1)
    const shimmer = 0.68 + 0.32 * Math.sin(time * 0.4 + particle.phase * 24) ** 2
    const pocket =
      0.16 +
      0.84 *
        Math.max(
          0,
          Math.sin(particle.angle * 4 + particle.phase * 5) *
            Math.cos(particle.phase * 8 - particle.angle),
        )
    context.globalAlpha = Math.min(
      0.85,
      (particle.brightness + (gather ? 0.12 : 0)) * fade * shimmer * (gather ? 0.9 : pocket),
    )
    const size = particle.size * (gather ? 7 : 8)
    context.drawImage(sprite, particle.x - size / 2, particle.y - size / 2, size, size)
  }
  context.globalAlpha = 1
  context.globalCompositeOperation = 'source-over'
  if (!motion.matches) request()
}
function request() {
  if (!raf && !document.hidden) raf = requestAnimationFrame(paint)
}
function jump(direction) {
  scrollTo({ top: clamp(active + direction, 0, units.length - 1) * stride, behavior: 'instant' })
}
function toggleUI() {
  document.body.dataset.ui = document.body.dataset.ui === 'hidden' ? 'visible' : 'hidden'
}
on(document.querySelector('[data-previous]'), 'click', () => jump(-1))
on(document.querySelector('[data-next]'), 'click', () => jump(1))
on(bindingButton, 'click', () => {
  bound = !bound
  bindingButton.textContent = bound ? 'Buchstabenform' : 'Freies Feld'
  bindingButton.setAttribute('aria-pressed', String(bound))
  request()
})
on(document.querySelector('[data-hide]'), 'click', toggleUI)
on(document.querySelector('[data-restore]'), 'click', toggleUI)
on(window, 'keydown', (event) => {
  if (event.target.closest('input, textarea, select, [contenteditable]')) return
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault()
    jump(event.key === 'ArrowLeft' ? -1 : 1)
  }
  if (event.key.toLowerCase() === 'h') toggleUI()
})
on(window, 'scroll', request)
on(document, 'visibilitychange', () => {
  last = 0
  request()
})
on(motion, 'change', () => {
  if (motion.matches)
    units.forEach((unit) => unit.getAnimations().forEach((animation) => animation.cancel()))
  request()
})
const observer = new ResizeObserver(measure)
observer.observe(stage)
on(window, 'pagehide', () => {
  abort.abort()
  observer.disconnect()
  cancelAnimationFrame(raf)
})
measure()
