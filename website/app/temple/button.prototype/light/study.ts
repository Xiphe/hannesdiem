import { createTraceField, advanceTraces, traceSample } from './trace-field.ts'
import { createGlimmerSprite } from './glimmer-sprite.ts'

// One tunable hypothesis in the real page. All wording remains in CMX.
type Settings = {
  light: number
  particles: number
  reach: number
  idle: number
  mode: string
  preview: boolean
}
const settings: Settings = {
  light: 2,
  particles: 9,
  reach: 56,
  idle: 0.52,
  mode: 'pointer',
  preview: false,
}
const reduced = matchMedia('(prefers-reduced-motion: reduce)')
const controls = document.createElement('details')
controls.id = 'button-study-controls'
controls.open = innerWidth > 600
controls.innerHTML = `<summary>Light button study</summary>
  <p>White surface, blue light and purple-pink traces. Approach for light; hover for glimmers.</p>
  <label>Background<input aria-label="Background colour" type="color" value="#ffffff" data-background="picker"></label>
  <label>Hex<input aria-label="Background hex" type="text" value="#ffffff" maxlength="7" spellcheck="false" autocomplete="off" data-background="hex"></label>
  <button type="button" data-background-reset>Reset to white</button>
  <label>Light<input aria-label="Light" type="range" min="0.2" max="2" step="0.05" value="2" data-setting="light"></label>
  <label>Glimmers<input aria-label="Glimmers" type="range" min="0" max="24" step="1" value="9" data-setting="particles"></label>
  <label>Drift reach<input aria-label="Drift reach" type="range" min="16" max="100" step="1" value="56" data-setting="reach"></label>
  <label>Idle light<input aria-label="Idle light" type="range" min="0" max="0.7" step="0.01" value="0.52" data-setting="idle"></label>
  <label>On hover<select aria-label="Border" data-setting="mode"><option value="pointer">Pointer light</option><option value="both">Pointer + traces</option><option value="traces">Travelling traces</option></select></label>
  <label class="preview-toggle"><input type="checkbox" data-setting="preview">Hold hover for review</label>
  <button type="button" data-jump="button">Find button</button><button type="button" data-jump="opener">Opener</button>`
document.body.appendChild(controls)
const instances: ReturnType<typeof mount>[] = []
const colourPicker = controls.querySelector<HTMLInputElement>('[data-background="picker"]')!
const colourHex = controls.querySelector<HTMLInputElement>('[data-background="hex"]')!
const backgroundStorageKey = 'temple-button-light-background-white'
function normaliseHex(value: string) {
  const hex = value.trim().replace(/^#/, '')
  if (/^[\da-f]{6}$/i.test(hex)) return `#${hex.toLowerCase()}`
  if (/^[\da-f]{3}$/i.test(hex))
    return `#${hex
      .split('')
      .map((c) => c + c)
      .join('')
      .toLowerCase()}`
  return null
}
function setBackground(hex: string | null, syncHex = true) {
  const style = document.documentElement.style
  if (hex) {
    style.setProperty('--study-button-colour', hex)
    // Keep the native label readable while exploring the complete colour range.
    const channels = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
    style.setProperty(
      '--study-button-ink',
      luminance >= 0.33 ? '#283541' : luminance <= 0.183 ? '#ffffff' : '#000000',
    )
  } else {
    style.removeProperty('--study-button-colour')
    style.removeProperty('--study-button-ink')
  }
  colourPicker.value = hex || '#ffffff'
  if (syncHex) colourHex.value = hex || '#ffffff'
  colourHex.removeAttribute('aria-invalid')
  try {
    if (hex) localStorage.setItem(backgroundStorageKey, hex)
    else localStorage.removeItem(backgroundStorageKey)
  } catch {
    /* Colour controls still work when browser storage is unavailable. */
  }
}
try {
  const saved = normaliseHex(localStorage.getItem(backgroundStorageKey) || '')
  if (saved) setBackground(saved)
} catch {
  /* Use the white background when storage is unavailable. */
}
controls.addEventListener('input', (event) => {
  const input = event.target as HTMLInputElement
  if (input.dataset.background === 'picker') {
    setBackground(input.value)
    return
  }
  if (input.dataset.background === 'hex') {
    const hex = normaliseHex(input.value)
    colourHex.setAttribute('aria-invalid', String(!hex))
    // Let shorthand values be completed before expanding them.
    if (hex && input.value.replace(/^#/, '').length === 6) setBackground(hex, false)
    return
  }
  const key = input.dataset.setting as keyof Settings | undefined
  if (key === 'preview') settings.preview = input.checked
  else if (key === 'mode') settings.mode = input.value
  else if (key) settings[key] = Number(input.value)
  instances.forEach((instance) => instance.wake())
})
function commitHex() {
  const hex = normaliseHex(colourHex.value)
  if (hex) setBackground(hex)
  else colourHex.setAttribute('aria-invalid', 'true')
}
colourHex.addEventListener('change', commitHex)
colourHex.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault()
    commitHex()
  }
})
controls.addEventListener('click', (event) => {
  if ((event.target as HTMLElement).hasAttribute('data-background-reset')) setBackground(null)
  const jump = (event.target as HTMLElement).dataset.jump
  if (jump === 'button') findButton()
  if (jump === 'opener')
    window.scrollTo({
      top: 0,
      behavior: reduced.matches ? 'instant' : 'smooth',
    })
})

function findButton() {
  document.querySelector('.temple-entry-welcome .magic-study')?.scrollIntoView({
    block: 'center',
    behavior: reduced.matches ? 'instant' : 'smooth',
  })
}

function mount(button: HTMLAnchorElement) {
  button.classList.add('magic-study')
  const canvas = document.createElement('canvas')
  canvas.setAttribute('aria-hidden', 'true')
  button.appendChild(canvas)
  const ctx = canvas.getContext('2d')!
  const palette = getComputedStyle(button)
  const teal = palette.getPropertyValue('--temple-primary-end-light').trim() || '#60cbcd'
  const blue = palette.getPropertyValue('--temple-primary-light').trim() || '#32608b'
  const sprite = createGlimmerSprite(false, [teal, `${teal}e0`, `${blue}50`, `${blue}00`])
  const pinkSprite = createGlimmerSprite(false, ['#e68fdb', '#e68fdbe0', '#9f8fb750', '#9f8fb700'])
  const events = new AbortController()
  const pad = 120
  let sidePad = pad
  let width = 0,
    height = 0,
    perimeter = 0
  let border = new Path2D()
  let samples: { x: number; y: number; nx: number; ny: number }[] = []
  let hovering = false,
    focused = false,
    visible = false,
    raf = 0
  let pointer = { x: 0.5, y: 0.5 },
    proximity = 0,
    glow = 0,
    last = 0,
    whiten = 0,
    emission = 0
  const particles: {
    x: number
    y: number
    vx: number
    vy: number
    age: number
    life: number
    size: number
    phase: number
    pink: boolean
  }[] = []
  const field = createTraceField()
  let contour: { offset: number; distance: number }[] = []
  let seamDistance = 0
  let bounds: DOMRect
  function resize() {
    width = button.offsetWidth
    height = button.offsetHeight
    bounds = button.getBoundingClientRect()
    sidePad = Math.max(0, Math.min(pad, bounds.left, innerWidth - bounds.right) - 2)
    const ratio = Math.min(devicePixelRatio || 1, 2)
    canvas.width = Math.round((width + sidePad * 2) * ratio)
    canvas.height = Math.round((height + pad * 2) * ratio)
    canvas.style.width = `${width + sidePad * 2}px`
    canvas.style.height = `${height + pad * 2}px`
    canvas.style.left = `${-sidePad - 1}px`
    canvas.style.top = `${-pad - 1}px`
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
    const r = 8,
      w = width,
      h = height
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute(
      'd',
      `M ${r} 0 H ${w - r} Q ${w} 0 ${w} ${r} V ${h - r} Q ${w} ${h} ${w - r} ${h} H ${r} Q 0 ${h} 0 ${h - r} V ${r} Q 0 0 ${r} 0 Z`,
    )
    border = new Path2D(path.getAttribute('d')!)
    perimeter = path.getTotalLength()
    const count = Math.ceil(perimeter)
    samples = Array.from({ length: count }, (_, i) => {
      const distance = (i / count) * perimeter
      const p = path.getPointAtLength(distance)
      const next = path.getPointAtLength((distance + 0.5) % perimeter)
      const dx = next.x - p.x,
        dy = next.y - p.y,
        length = Math.hypot(dx, dy) || 1
      return { x: p.x, y: p.y, nx: dy / length, ny: -dx / length }
    })
    // Angle is monotonic along this convex outline. Mapping distance to angle
    // lets one continuous stroke carry its true travelled-light history through
    // corners, rather than reorienting a start-to-end linear gradient.
    contour = samples
      .map((p, index) => ({
        offset:
          ((Math.atan2(p.y - height / 2, p.x - width / 2) + Math.PI * 2) % (Math.PI * 2)) /
          (Math.PI * 2),
        distance: (index / samples.length) * perimeter,
      }))
      .sort((a, b) => a.offset - b.offset)
    seamDistance =
      (samples.reduce(
        (best, p, index) =>
          p.x > width - 1 && Math.abs(p.y - height / 2) < Math.abs(samples[best].y - height / 2)
            ? index
            : best,
        Math.floor(samples.length / 4),
      ) /
        samples.length) *
      perimeter
    wake()
  }
  function wake() {
    if (!raf && visible && !document.hidden) raf = requestAnimationFrame(draw)
  }
  function draw(now: number) {
    raf = 0
    if (!visible || document.hidden) {
      last = 0
      return
    }
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60
    last = now
    const active = hovering || focused || settings.preview
    const targetGlow = active ? 1 : proximity * 0.2
    glow += (targetGlow - glow) * (1 - Math.exp(-dt * (targetGlow > glow ? 8 : 3)))
    button.style.setProperty('--shine-opacity', String(glow * 0.25))
    whiten += (Number(active) - whiten) * (1 - Math.exp(-dt * 6))
    advanceTraces(field, reduced.matches ? 0 : dt)
    ctx.clearRect(0, 0, width + sidePad * 2, height + pad * 2)
    ctx.save()
    ctx.translate(sidePad, pad)
    const nearPointer = (p: { x: number; y: number }) =>
      Math.exp(-((p.x - pointer.x * width) ** 2 + (p.y - pointer.y * height) ** 2) / 5800)
    // Stroke each continuous route once. Stamping many round-capped segments
    // accumulated alpha at their joins and gave the previous border its dots.
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    if (settings.mode !== 'traces' && glow > 0.001) {
      const x = pointer.x * width,
        y = pointer.y * height
      const light = ctx.createRadialGradient(x, y, 0, x, y, 185)
      light.addColorStop(0, blue)
      light.addColorStop(0.35, blue)
      light.addColorStop(1, `${blue}00`)
      ctx.strokeStyle = light
      ctx.lineWidth = 1
      ctx.globalAlpha = Math.min(1, glow * settings.light * 0.66)
      ctx.stroke(border)
    }
    const traceStrength = settings.idle * (1 + whiten * 0.9)
    const pearl = ctx.createConicGradient(0, width / 2, height / 2)
    const colorAt = (distance: number) => {
      const sample = traceSample(field, distance, perimeter)
      const alpha = Math.min(1, sample.light)
      const red = Math.round(sample.red + (230 - sample.red) * whiten * 0.85)
      const green = Math.round(sample.green + (143 - sample.green) * whiten * 0.85)
      const blue = Math.round(sample.blue + (219 - sample.blue) * whiten * 0.85)
      return `rgba(${red},${green},${blue},${alpha})`
    }
    const seam = colorAt(seamDistance)
    pearl.addColorStop(0, seam)
    for (const point of contour) {
      if (point.offset > 0 && point.offset < 1)
        pearl.addColorStop(point.offset, colorAt(point.distance))
    }
    pearl.addColorStop(1, seam)
    ctx.strokeStyle = pearl
    for (const [lineWidth, strength] of [
      [7, 0.07],
      [3, 0.15],
      [1, 1],
    ]) {
      ctx.lineWidth = lineWidth
      ctx.globalAlpha = Math.min(1, traceStrength * strength)
      ctx.stroke(border)
    }
    ctx.globalAlpha = 1
    if (!reduced.matches && active) {
      emission += dt * settings.particles
      while (emission >= 1 && particles.length < 80) {
        emission--
        let index = Math.floor(Math.random() * samples.length)
        if (settings.mode !== 'traces') {
          for (
            let attempt = 0;
            attempt < 8 && Math.random() > nearPointer(samples[index]);
            attempt++
          )
            index = Math.floor(Math.random() * samples.length)
        }
        const p = samples[index],
          life = 1.3 + Math.random() * 1.4
        const speed = (settings.reach / life) * (0.55 + Math.random() * 0.4)
        particles.push({
          x: p.x,
          y: p.y,
          vx: p.nx * speed + (Math.random() - 0.5) * 9,
          vy: p.ny * speed - 4,
          age: 0,
          life,
          size: 3 + Math.random() ** 2 * 9,
          phase: Math.random() * 6.28,
          pink: Math.random() < 1 / 3,
        })
      }
    } else emission = 0
    if (reduced.matches) particles.length = 0
    ctx.globalCompositeOperation = 'multiply'
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]
      p.age += dt
      if (p.age >= p.life) {
        particles.splice(i, 1)
        continue
      }
      p.x += p.vx * dt
      p.y += p.vy * dt
      const age = p.age / p.life
      const opacity =
        Math.sin(Math.PI * age) ** 0.7 * (0.5 + 0.5 * Math.sin(p.age * 5 + p.phase) ** 2)
      const size = p.size * (1 + age * 0.6) * 0.8
      ctx.globalAlpha = opacity * Math.min(1, settings.light) * 0.75
      ctx.drawImage(p.pink ? pinkSprite : sprite, p.x - size / 2, p.y - size / 2, size, size)
    }
    ctx.restore()
    if (
      (!reduced.matches && (active || settings.idle > 0)) ||
      Math.abs(glow - targetGlow) > 0.005 ||
      Math.abs(whiten - Number(active)) > 0.005 ||
      particles.length
    )
      wake()
    else last = 0
  }
  button.addEventListener('pointerenter', () => {
    hovering = true
    wake()
  })
  button.addEventListener('pointerleave', () => {
    hovering = false
    wake()
  })
  let cursor: { x: number; y: number } | undefined
  function updateProximity() {
    if (!cursor || !bounds || !width || !height) return
    // Pointer coordinates follow the painted header morph, not its fixed layout box.
    bounds = button.getBoundingClientRect()
    const dx = Math.max(bounds.left - cursor.x, 0, cursor.x - bounds.right)
    const dy = Math.max(bounds.top - cursor.y, 0, cursor.y - bounds.bottom)
    const closeness = Math.max(0, 1 - Math.hypot(dx, dy) / 110)
    proximity = closeness * closeness * (3 - 2 * closeness)
    pointer = {
      x: (cursor.x - bounds.left) / bounds.width,
      y: (cursor.y - bounds.top) / bounds.height,
    }
    button.style.setProperty('--shine-x', `${pointer.x * 100}%`)
    button.style.setProperty('--shine-y', `${pointer.y * 100}%`)
    wake()
  }
  document.addEventListener(
    'pointermove',
    (event) => {
      if (event.pointerType === 'touch') return
      cursor = { x: event.clientX, y: event.clientY }
      updateProximity()
    },
    { passive: true, signal: events.signal },
  )
  document.documentElement.addEventListener(
    'pointerleave',
    () => {
      cursor = undefined
      proximity = 0
      wake()
    },
    { signal: events.signal },
  )
  window.addEventListener(
    'scroll',
    () => {
      bounds = button.getBoundingClientRect()
      updateProximity()
    },
    { passive: true, signal: events.signal },
  )
  button.addEventListener('focus', () => {
    focused = true
    wake()
  })
  button.addEventListener('blur', () => {
    focused = false
    wake()
  })
  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting
    if (!visible) {
      cancelAnimationFrame(raf)
      raf = 0
      particles.length = 0
      glow = 0
      last = 0
    } else wake()
  })
  intersection.observe(button)
  const observer = new ResizeObserver(resize)
  observer.observe(button)
  window.addEventListener('resize', resize)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(raf)
      raf = 0
      last = 0
      particles.length = 0
    } else wake()
  })
  reduced.addEventListener('change', wake)
  window.addEventListener(
    'pagehide',
    () => {
      cancelAnimationFrame(raf)
      events.abort()
      observer.disconnect()
      intersection.disconnect()
      sprite.width = sprite.height = 0
      pinkSprite.width = pinkSprite.height = 0
    },
    { once: true },
  )
  return { wake }
}

async function start() {
  // Wait for CMX's existing island to finish mounting before attaching decoration.
  for (let attempt = 0; attempt < 120; attempt++) {
    if (
      document.querySelector(
        '.temple-artwork[data-state="ready"], .temple-artwork[data-state="fallback"]',
      )
    )
      break
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  document
    .querySelectorAll<HTMLAnchorElement>(
      '.temple-entry-welcome .fact-action a, .temple-entry-closing a, .temple-nav-enter a',
    )
    .forEach((button) => instances.push(mount(button)))
  // Default to the first actual entry action; Opener returns to its source material.
  if (new URL(location.href).searchParams.has('button-study')) findButton()
}
start()
