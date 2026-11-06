import { createTraceField, advanceTraces, traceSample, darkTraceShades } from './trace-field.ts'
import { createGlimmerSprite } from '../glimmer-sprite.ts'

const lightTraceShades = [
  [120, 104, 147],
  [143, 126, 164],
  [155, 139, 171],
  [131, 130, 156],
] as const

/** Enhance native entry actions within the existing CMX/Remix Opening task. */
export function mountEntryButtons(host: HTMLElement, signal: AbortSignal) {
  if (signal.aborted) return
  const appearance = matchMedia('(prefers-color-scheme: dark)')
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  for (const button of host.querySelectorAll<HTMLAnchorElement>('a.temple-enter-button'))
    mountEntryButton(button, host, appearance, reduced, signal)
}

function mountEntryButton(
  button: HTMLAnchorElement,
  host: HTMLElement,
  appearance: MediaQueryList,
  reduced: MediaQueryList,
  signal: AbortSignal,
) {
  const canvas = document.createElement('canvas')
  canvas.className = 'temple-enter-effects'
  canvas.setAttribute('aria-hidden', 'true')
  const context = canvas.getContext('2d')
  if (!context) return
  const ctx = context
  button.appendChild(canvas)
  const palette = getComputedStyle(button)
  const teal = palette.getPropertyValue('--temple-primary-end-light').trim() || '#60cbcd'
  const blue = palette.getPropertyValue('--temple-primary-light').trim() || '#32608b'
  let dark = appearance.matches
  let sprites: HTMLCanvasElement[] = []
  const events = { passive: true, signal }
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
    painted = getComputedStyle(button).visibility !== 'hidden',
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
  let field = createTraceField()
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
  function wake(refreshVisibility = true) {
    // Loading and stylesheet changes can settle after an attribute observer.
    // Refresh on new input/geometry, without reading styles on every frame.
    if (refreshVisibility) painted = getComputedStyle(button).visibility !== 'hidden'
    if (!raf && visible && painted && !document.hidden && !signal.aborted)
      raf = requestAnimationFrame(draw)
  }
  function draw(now: number) {
    raf = 0
    if (!visible || !painted || document.hidden || signal.aborted || !width || !height) {
      last = 0
      return
    }
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60
    last = now
    const active = hovering || focused
    const targetGlow = active ? 1 : proximity * 0.2
    glow += (targetGlow - glow) * (1 - Math.exp(-dt * (targetGlow > glow ? 8 : 3)))
    button.style.setProperty('--temple-enter-shine-opacity', String(glow * 0.25))
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
    if (glow > 0.001) {
      const x = pointer.x * width,
        y = pointer.y * height
      const light = ctx.createRadialGradient(x, y, 0, x, y, 185)
      light.addColorStop(0, dark ? '#fff0ce' : blue)
      light.addColorStop(0.35, dark ? '#edc48e' : blue)
      light.addColorStop(1, dark ? '#edc48e00' : `${blue}00`)
      ctx.strokeStyle = light
      ctx.lineWidth = 1
      ctx.globalAlpha = Math.min(1, glow * 2 * 0.66)
      ctx.stroke(border)
    }
    const traceStrength = (dark ? 0.34 : 0.52) * (1 + whiten * (dark ? 0.7 : 0.9))
    const pearl = ctx.createConicGradient(0, width / 2, height / 2)
    const colorAt = (distance: number) => {
      const sample = traceSample(field, distance, perimeter)
      const alpha = Math.min(1, sample.light)
      const red = Math.round(
        sample.red + ((dark ? 255 : 230) - sample.red) * whiten * (dark ? 0.92 : 0.85),
      )
      const green = Math.round(
        sample.green + ((dark ? 255 : 143) - sample.green) * whiten * (dark ? 0.92 : 0.85),
      )
      const blue = Math.round(
        sample.blue + ((dark ? 255 : 219) - sample.blue) * whiten * (dark ? 0.92 : 0.85),
      )
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
      emission += dt * 9
      while (emission >= 1 && particles.length < 80) {
        emission--
        let index = Math.floor(Math.random() * samples.length)
        for (let attempt = 0; attempt < 8 && Math.random() > nearPointer(samples[index]); attempt++)
          index = Math.floor(Math.random() * samples.length)
        const p = samples[index],
          life = 1.3 + Math.random() * 1.4
        const speed = ((dark ? 32 : 56) / life) * (0.55 + Math.random() * 0.4)
        particles.push({
          x: p.x,
          y: p.y,
          vx: p.nx * speed + (Math.random() - 0.5) * 9,
          vy: p.ny * speed - 4,
          age: 0,
          life,
          size: 3 + Math.random() ** 2 * 9,
          phase: Math.random() * 6.28,
          pink: !dark && Math.random() < 1 / 3,
        })
      }
    } else emission = 0
    if (reduced.matches) particles.length = 0
    ctx.globalCompositeOperation = dark ? 'screen' : 'multiply'
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
      const size = p.size * (1 + age * 0.6) * (dark ? 1 : 0.8)
      ctx.globalAlpha = opacity * (dark ? 1 : 0.75)
      ctx.drawImage(sprites[p.pink ? 1 : 0], p.x - size / 2, p.y - size / 2, size, size)
    }
    ctx.restore()
    if (
      !reduced.matches ||
      Math.abs(glow - targetGlow) > 0.005 ||
      Math.abs(whiten - Number(active)) > 0.005 ||
      particles.length
    )
      wake(false)
    else last = 0
  }
  button.addEventListener(
    'pointerenter',
    () => {
      hovering = true
      wake()
    },
    events,
  )
  button.addEventListener(
    'pointerleave',
    () => {
      hovering = false
      wake()
    },
    events,
  )
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
    button.style.setProperty('--temple-enter-shine-x', `${pointer.x * 100}%`)
    button.style.setProperty('--temple-enter-shine-y', `${pointer.y * 100}%`)
    wake()
  }
  document.addEventListener(
    'pointermove',
    (event) => {
      if (event.pointerType === 'touch') return
      cursor = { x: event.clientX, y: event.clientY }
      updateProximity()
    },
    events,
  )
  document.documentElement.addEventListener(
    'pointerleave',
    () => {
      cursor = undefined
      proximity = 0
      wake()
    },
    { signal },
  )
  window.addEventListener(
    'scroll',
    () => {
      bounds = button.getBoundingClientRect()
      updateProximity()
    },
    events,
  )
  button.addEventListener(
    'focus',
    () => {
      focused = true
      wake()
    },
    events,
  )
  button.addEventListener(
    'blur',
    () => {
      focused = false
      wake()
    },
    events,
  )
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
  window.addEventListener('resize', resize, events)
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden) {
        cancelAnimationFrame(raf)
        raf = 0
        last = 0
        particles.length = 0
      } else wake()
    },
    events,
  )
  reduced.addEventListener(
    'change',
    () => {
      particles.length = 0
      wake()
    },
    { signal },
  )
  function configureAppearance() {
    for (const sprite of sprites) sprite.width = sprite.height = 0
    dark = appearance.matches
    sprites = dark
      ? [createGlimmerSprite()]
      : [
          createGlimmerSprite(false, [teal, `${teal}e0`, `${blue}50`, `${blue}00`]),
          createGlimmerSprite(false, ['#e68fdb', '#e68fdbe0', '#9f8fb750', '#9f8fb700']),
        ]
    field = createTraceField(dark ? darkTraceShades : lightTraceShades)
    particles.length = 0
    emission = 0
    wake()
  }
  appearance.addEventListener('change', configureAppearance, { signal })
  configureAppearance()
  // IntersectionObserver alone still considers visibility:hidden buttons on
  // screen. Pause the hidden half of the welcome/header handoff as well.
  const visibilityHost =
    button.closest('.temple-entry-closing') ?? host.querySelector('.temple-top-navigation')
  const visibility = new MutationObserver(() => {
    painted = getComputedStyle(button).visibility !== 'hidden'
    if (painted) wake()
    else {
      cancelAnimationFrame(raf)
      raf = 0
      last = 0
      particles.length = 0
      glow = 0
      button.style.setProperty('--temple-enter-shine-opacity', '0')
    }
  })
  if (visibilityHost)
    visibility.observe(visibilityHost, {
      attributes: true,
      attributeFilter: ['data-nav-visible', 'data-nav-mounted', 'data-entry-visible'],
    })
  visibility.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-temple-loading'],
  })
  signal.addEventListener(
    'abort',
    () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      intersection.disconnect()
      visibility.disconnect()
      for (const sprite of sprites) sprite.width = sprite.height = 0
      canvas.width = canvas.height = 0
      canvas.remove()
      particles.length = 0
      field.traces.length = 0
      samples = []
      contour = []
      for (const property of ['x', 'y', 'opacity'])
        button.style.removeProperty(`--temple-enter-shine-${property}`)
    },
    { once: true },
  )
}
