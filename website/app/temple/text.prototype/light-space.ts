// Disposable material tests. Semantic text and its order stay in the DOM.
import { createForestStudy } from './forest-study.ts'
const canvas = document.querySelector<HTMLCanvasElement>('.light-space')
if (canvas) await mount(canvas)

async function mount(canvas: HTMLCanvasElement) {
  const poem = document.querySelector<HTMLElement>('.poem')!
  const words = [...poem.querySelectorAll<HTMLElement>('.word')]
  const image = new Image()
  image.src = '/forest.jpg'
  await Promise.all([image.decode(), document.fonts.load('550 48px Bricolage')])
  const treatment = canvas.dataset.treatment
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const paintForest = createForestStudy(image, { x: 53.24, y: 54.07 })
  const context = canvas.getContext('2d')!
  const world = document.createElement('canvas')
  const worldInk = world.getContext('2d')!
  const mask = document.createElement('canvas')
  const maskInk = mask.getContext('2d')!
  const material = document.createElement('canvas')
  const materialInk = material.getContext('2d')!
  const fieldSurface = document.createElement('canvas')
  const fieldInk = fieldSurface.getContext('2d')!
  let width = 0,
    height = 0,
    ratio = 1,
    raf = 0,
    previous = 0,
    elapsed = 0
  let visible = true,
    dirty = true
  let geometry: {
    text: string
    x: number
    y: number
    width: number
    height: number
    baseline: number
  }[] = []
  const trail: { x: number; y: number; dx: number; dy: number; time: number }[] = []
  let lastPointer: { x: number; y: number; time: number } | undefined

  function resize() {
    width = innerWidth
    height = innerHeight
    ratio = Math.min(devicePixelRatio, 1.25)
    for (const surface of [canvas, world, mask, material, fieldSurface]) {
      surface.width = Math.round(width * ratio)
      surface.height = Math.round(height * ratio)
    }
    for (const ink of [context, worldInk, maskInk, materialInk, fieldInk])
      ink.setTransform(ratio, 0, 0, ratio, 0, 0)
    dirty = true
    request()
  }
  function measure() {
    const style = getComputedStyle(poem)
    maskInk.font = `${style.fontWeight} ${style.fontSize} Bricolage`
    maskInk.letterSpacing = style.letterSpacing
    geometry = words.map((word) => {
      const r = word.getBoundingClientRect()
      const metrics = maskInk.measureText(word.textContent!)
      return {
        text: word.textContent!,
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
        baseline:
          r.y + r.height / 2 + (metrics.fontBoundingBoxAscent - metrics.fontBoundingBoxDescent) / 2,
      }
    })
    dirty = false
  }
  function field(x: number, y: number, now: number) {
    let dx = 0,
      dy = 0,
      light = 0,
      weight = 0
    if (reduced.matches) return { x: 0, y: 0, light: 0 }
    for (const point of trail) {
      const age = (now - point.time) / 1000
      const strength =
        Math.exp(-age / 1.25) * Math.exp(-((x - point.x) ** 2 + (y - point.y) ** 2) / 45000)
      dx += point.dx * strength
      dy += point.dy * strength
      light += strength
      weight += strength
    }
    const normal = Math.max(1, weight)
    return { x: (dx / normal) * 24, y: (dy / normal) * 24, light: Math.min(2, light) }
  }
  function textMask(now: number) {
    maskInk.clearRect(0, 0, width, height)
    maskInk.fillStyle = '#fff'
    maskInk.save()
    if (treatment === 'B') {
      // Project the same words onto a receding plane around the light source.
      maskInk.translate(width / 2, height / 2)
      maskInk.transform(1.02, 0.025, -0.075, 0.94, 0, 0)
      maskInk.translate(-width / 2, -height / 2)
    }
    for (const word of geometry) {
      const influence =
        treatment === 'C'
          ? field(word.x + word.width / 2, word.y + word.height / 2, now)
          : { x: 0, y: 0 }
      // A shared field moves ink less than free particles; each word stays intact.
      maskInk.fillText(word.text, word.x + influence.x * 0.45, word.baseline + influence.y * 0.45)
    }
    maskInk.restore()
  }
  function request() {
    if (!raf && visible && !document.hidden) raf = requestAnimationFrame(draw)
  }
  function draw(now: number) {
    raf = 0
    const dt = previous ? Math.min(0.05, (now - previous) / 1000) : 0
    previous = now
    if (!reduced.matches) elapsed += dt
    while (trail.length && now - trail[0].time > 5000) trail.shift()
    if (dirty) measure()
    textMask(now)
    worldInk.clearRect(0, 0, width, height)
    paintForest(
      worldInk,
      width,
      height,
      elapsed,
      treatment === 'C' ? (x, y) => field(x, y, now) : undefined,
    )
    context.clearRect(0, 0, width, height)
    materialInk.clearRect(0, 0, width, height)
    materialInk.globalCompositeOperation = 'source-over'
    if (treatment === 'A') {
      context.fillStyle = '#030503'
      context.fillRect(0, 0, width, height)
      materialInk.drawImage(world, 0, 0, width, height)
      // A working underprint keeps small photographic letters readable.
      materialInk.fillStyle = '#e4e0d4'
      materialInk.globalAlpha = 0.56
      materialInk.fillRect(0, 0, width, height)
      materialInk.globalAlpha = 1
      materialInk.globalCompositeOperation = 'destination-in'
      materialInk.drawImage(mask, 0, 0, width, height)
      materialInk.globalCompositeOperation = 'source-over'
      context.drawImage(material, 0, 0, width, height)
    } else if (treatment === 'B') {
      context.drawImage(world, 0, 0, width, height)
      // Expose the photograph so dark projected lettering can be assessed.
      context.fillStyle = '#e4e0d4'
      context.globalAlpha = 0.52
      context.fillRect(0, 0, width, height)
      context.globalAlpha = 1
      materialInk.fillStyle = '#030503'
      materialInk.fillRect(0, 0, width, height)
      materialInk.globalCompositeOperation = 'destination-in'
      materialInk.drawImage(mask, 0, 0, width, height)
      materialInk.globalCompositeOperation = 'source-over'
      context.filter = 'blur(1.25px)'
      context.globalAlpha = 0.94
      context.drawImage(material, 0, 0, width, height)
      context.filter = 'none'
      context.globalAlpha = 1
    } else {
      context.drawImage(world, 0, 0, width, height)
      context.fillStyle = '#030503'
      context.globalAlpha = 0.78
      context.fillRect(0, 0, width, height)
      context.globalAlpha = 1
      // The pointer's fading trace opens the same photographic world beneath the ink.
      fieldInk.clearRect(0, 0, width, height)
      for (const point of trail) {
        const alpha = Math.exp(-(now - point.time) / 1250) * 0.3
        const gradient = fieldInk.createRadialGradient(point.x, point.y, 0, point.x, point.y, 240)
        gradient.addColorStop(0, `rgba(255,255,255,${alpha})`)
        gradient.addColorStop(1, 'rgba(255,255,255,0)')
        fieldInk.fillStyle = gradient
        fieldInk.fillRect(point.x - 240, point.y - 240, 480, 480)
      }
      materialInk.drawImage(world, 0, 0, width, height)
      materialInk.globalCompositeOperation = 'destination-in'
      materialInk.drawImage(fieldSurface, 0, 0, width, height)
      materialInk.globalCompositeOperation = 'source-over'
      context.drawImage(material, 0, 0, width, height)
      materialInk.clearRect(0, 0, width, height)
      materialInk.fillStyle = '#e4e0d4'
      materialInk.fillRect(0, 0, width, height)
      materialInk.globalCompositeOperation = 'destination-in'
      materialInk.drawImage(mask, 0, 0, width, height)
      materialInk.globalCompositeOperation = 'source-over'
      context.drawImage(material, 0, 0, width, height)
      // Let light leave a visible trace around the same field that moves the words.
      context.globalCompositeOperation = 'screen'
      context.globalAlpha = 0.42
      paintForest(context, width, height, elapsed, (x, y) => field(x, y, now), false)
      context.globalAlpha = 1
      context.globalCompositeOperation = 'source-over'
    }
    document.body.dataset.materialReady = 'true'
    if (!reduced.matches || trail.length) request()
  }
  function pointer(event: PointerEvent) {
    if (
      treatment !== 'C' ||
      (event.target instanceof Element && event.target.closest('.switcher, .restore-controls'))
    )
      return
    const time = performance.now()
    if (lastPointer && time - lastPointer.time < 30) return
    const dx = lastPointer ? event.clientX - lastPointer.x : 0
    const dy = lastPointer ? event.clientY - lastPointer.y : -12
    const length = Math.max(12, Math.hypot(dx, dy))
    trail.push({ x: event.clientX, y: event.clientY, dx: dx / length, dy: dy / length, time })
    while (trail.length > 24) trail.shift()
    lastPointer = { x: event.clientX, y: event.clientY, time }
    request()
  }
  addEventListener('pointermove', pointer, { passive: true })
  addEventListener('pointerdown', pointer, { passive: true })
  addEventListener(
    'scroll',
    () => {
      dirty = true
      request()
    },
    { passive: true },
  )
  addEventListener('resize', resize)
  reduced.addEventListener('change', request)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(raf)
      raf = 0
    } else {
      previous = performance.now()
      request()
    }
  })
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting
    if (visible) {
      previous = performance.now()
      request()
    } else {
      cancelAnimationFrame(raf)
      raf = 0
    }
  }).observe(poem)
  resize()
}
