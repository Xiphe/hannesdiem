// THROWAWAY: accumulation is the question. No glimmers or automatic text advance.
const stage = document.querySelector('.stage')
const sequence = document.querySelector('.sequence')
const units = [...document.querySelectorAll('.unit')]
const position = document.querySelector('[data-position]')
const distance = document.querySelector('[data-distance]')
const count = document.querySelector('[data-count]')
const descriptions = {
  A: 'Ältere Sätze rücken nach oben und verdichten sich.',
  B: 'Ältere Sätze bleiben als überlagerte Konturen zurück.',
  C: 'Ältere Sätze weichen seitlich aus und bleiben am Bildrand.',
}
let variant = document.body.dataset.variant
let active = 0,
  width = 0,
  height = 0,
  stride = 1,
  heights = []
let frame = 0,
  measuring = false
const abort = new AbortController()
const on = (target, event, listener) =>
  target.addEventListener(event, listener, { signal: abort.signal })
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

function pose(index) {
  const age = active - index
  const center = height * 0.47
  const h = heights[index]
  if (age < 0) return { x: 0, y: center - h / 2 + 48, scale: 1, opacity: 0 }
  if (age === 0) return { x: 0, y: center - h / 2, scale: 1, opacity: 1 }
  if (variant === 'A') {
    // The whole previous sentence stays in the field, in an upward compressed stack.
    const scale = 0.57 - Math.min(age - 1, 5) * 0.035
    const y = center - heights[active] / 2 - 44 - (age - 1) * height * 0.06 - h * scale
    return { x: 0, y: y - (h * (1 - scale)) / 2, scale, opacity: 0.3 - age * 0.025 }
  }
  if (variant === 'B') {
    // Old ink stays at the reading site; outline keeps the next sentence distinct.
    const scale = 1.08 + age * 0.075
    return {
      x: (index % 2 ? -1 : 1) * age * 14,
      y: center - h / 2 + age * height * 0.043,
      scale,
      opacity: 0.27 - age * 0.025,
    }
  }
  // Previously read text moves out of the centre; fragments remain in the margins.
  return {
    x: (index % 2 ? -1 : 1) * width * (0.53 + (age - 1) * 0.025),
    y: center - h / 2 - (age - 1) * height * 0.075,
    scale: 1 + age * 0.04,
    opacity: 0.38 - age * 0.025,
  }
}

function render() {
  units.forEach((unit, index) => {
    const p = pose(index)
    unit.dataset.state = index === active ? 'current' : index < active ? 'trace' : 'future'
    unit.style.transform = `translate(${p.x}px, ${p.y}px) scale(${p.scale})`
    unit.style.opacity = String(p.opacity)
    // Prior phrases stay in source order for assistive reading; future phrases wait.
    unit.setAttribute('aria-hidden', String(index > active))
  })
  position.value = String(active)
  count.textContent = `${active + 1} / ${units.length}`
  sequence.dataset.active = String(active)
}

function measure() {
  measuring = true
  document.body.dataset.measuring = ''
  width = stage.clientWidth
  height = stage.clientHeight
  heights = units.map((unit) => unit.offsetHeight)
  stride = (sequence.offsetHeight - height) / (units.length - 1)
  render()
  scrollTo({ top: active * stride, behavior: 'instant' })
  requestAnimationFrame(() => {
    delete document.body.dataset.measuring
    measuring = false
  })
}
function request() {
  if (frame || measuring) return
  frame = requestAnimationFrame(() => {
    frame = 0
    if (stage.clientWidth !== width || stage.clientHeight !== height) {
      measure()
      return
    }
    const next = clamp(Math.round(scrollY / stride), 0, units.length - 1)
    if (next !== active) {
      active = next
      render()
    }
  })
}
function seek(next) {
  active = clamp(next, 0, units.length - 1)
  render()
  scrollTo({ top: active * stride, behavior: 'instant' })
}
function changeVariant(next) {
  variant = next
  document.body.dataset.variant = next
  document.querySelector('[data-description]').textContent = descriptions[next]
  document.querySelectorAll('[data-variant-link]').forEach((link) => {
    if (link.dataset.variantLink === next) link.setAttribute('aria-current', 'page')
    else link.removeAttribute('aria-current')
  })
  const url = new URL(location.href)
  url.searchParams.set('variant', next)
  history.replaceState(null, '', url)
  render()
}
function cycle(offset) {
  const keys = Object.keys(descriptions)
  changeVariant(keys[(keys.indexOf(variant) + offset + keys.length) % keys.length])
}
function toggleUI() {
  document.body.dataset.ui = document.body.dataset.ui === 'hidden' ? 'visible' : 'hidden'
}
on(position, 'input', () => seek(Number(position.value)))
on(distance, 'input', () => {
  document.body.style.setProperty('--distance', distance.value)
  document.querySelector('[data-distance-label]').textContent =
    `${Number(distance.value).toLocaleString('de-DE')} × Höhe`
  measure()
})
on(document.querySelector('[data-previous]'), 'click', () => cycle(-1))
on(document.querySelector('[data-next]'), 'click', () => cycle(1))
on(document.querySelector('[data-hide]'), 'click', toggleUI)
on(document.querySelector('[data-restore]'), 'click', toggleUI)
document.querySelectorAll('[data-variant-link]').forEach((link) =>
  on(link, 'click', (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    changeVariant(link.dataset.variantLink)
  }),
)
on(window, 'keydown', (event) => {
  if (event.target.closest('input, textarea, select, [contenteditable]')) return
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault()
    cycle(event.key === 'ArrowLeft' ? -1 : 1)
  }
  if (event.key.toLowerCase() === 'h') toggleUI()
})
on(window, 'scroll', request)
on(window, 'pagehide', () => {
  abort.abort()
  observer.disconnect()
  cancelAnimationFrame(frame)
})
// Font metrics are needed only once; no image download/canvas/ambient RAF.
document.body.dataset.ready = ''
await document.fonts.load('600 40px Bricolage')
measure()
const observer = new ResizeObserver(() => {
  if (stage.clientWidth !== width || stage.clientHeight !== height) measure()
})
observer.observe(stage)
