// Cache native glyph masks on layout changes; paint colour directly, without
// encoding images or changing DOM styles during animation. Text stays selectable.
import { noise as cloudNoise } from './atmosphere.ts'
import { defaults } from './defaults.ts'
const warmInk = [142, 68, 28]
const coolInk = [36, 89, 137]
const darkRange = [50, -8, -65]
export function colourCopy(
  root: HTMLElement,
  signal: AbortSignal,
  request: () => void,
  date?: HTMLElement,
) {
  const paragraphs = [...root.querySelectorAll<HTMLElement>('.verse-copy > p')]
  const elements = date ? [...paragraphs, date] : paragraphs
  const dateBaseline = document.createElement('span')
  dateBaseline.className = 'block-baseline'
  dateBaseline.ariaHidden = 'true'
  date?.appendChild(dateBaseline)
  const layers = elements.map((element) => {
    const canvas = document.createElement('canvas')
    canvas.className = 'copy-cloud-canvas'
    canvas.ariaHidden = 'true'
    const mask = document.createElement('canvas')
    return {
      element,
      canvas,
      ink: canvas.getContext('2d'),
      mask,
      maskInk: mask.getContext('2d'),
      width: 0,
      height: 0,
      offset: 0,
      visible: false,
      revision: -1,
    }
  })
  let variance = defaults.copyVariance,
    speed = defaults.copySpeed,
    phase = 0,
    clock = performance.now(),
    base = [1, 3, 5].map((i) => parseInt(defaults.copyColor.slice(i, i + 2), 16)),
    last = -Infinity,
    dirty = true,
    lightInk = false,
    revision = 0,
    cssWidth = 0,
    cssHeight = 0
  const canvas = document.createElement('canvas')
  const ink = canvas.getContext('2d')
  const supported = ink && layers.every((layer) => layer.ink && layer.maskInk)
  let frame: ImageData
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const layer = layers.find((layer) => layer.element === entry.target)!
        layer.visible = entry.isIntersecting
      }
      request()
    },
    { rootMargin: '160px' },
  )
  if (supported) for (const { element } of layers) observer.observe(element)
  signal.addEventListener(
    'abort',
    () => {
      observer.disconnect()
      dateBaseline.remove()
      for (const { element, canvas, mask } of layers) {
        element.removeAttribute('data-copy-cloud')
        canvas.remove()
        canvas.width = canvas.height = mask.width = mask.height = 0
      }
    },
    { once: true },
  )

  function resize() {
    if (!supported || signal.aborted) return
    const bounds = root.getBoundingClientRect()
    cssWidth = paragraphs[0].clientWidth
    cssHeight = root.scrollHeight
    const ratio = Math.min(3, devicePixelRatio || 1)
    for (const layer of layers) {
      const { element, canvas, mask, maskInk } = layer
      const rect = element.getBoundingClientRect()
      layer.width = rect.width
      layer.height = rect.height
      layer.offset = element === date ? 0 : rect.top - bounds.top
      layer.visible = rect.bottom > -160 && rect.top < innerHeight + 160
      canvas.width = mask.width = Math.ceil(rect.width * ratio)
      canvas.height = mask.height = Math.ceil(rect.height * ratio)
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      maskInk!.setTransform(mask.width / rect.width, 0, 0, mask.height / rect.height, 0, 0)
      maskInk!.fillStyle = '#fff'
      const rows =
        element === date ? [element] : [...element.querySelectorAll<HTMLElement>('.block-row-ink')]
      for (const row of rows) {
        const style = getComputedStyle(row)
        const position = row.getBoundingClientRect()
        const baseline = row.querySelector('.block-baseline')!.getBoundingClientRect().top
        maskInk!.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
        maskInk!.fontKerning = 'normal'
        maskInk!.letterSpacing = style.letterSpacing === 'normal' ? '0px' : style.letterSpacing
        maskInk!.fillText(row.textContent!, position.left - rect.left, baseline - rect.top)
      }
      layer.revision = -1
      if (!canvas.isConnected) element.appendChild(canvas)
    }
    dirty = true
  }
  function paintClouds(time: number) {
    // These are broad colour clouds, not glyph detail. Keep the texture small as
    // the fitted poster blocks make the document taller; glyphs remain native.
    const w = 128,
      h = Math.max(1, Math.min(512, Math.ceil((cssHeight / cssWidth) * w)))
    if (!frame || canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
      frame = ink!.createImageData(w, h)
    }
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const u = x / w,
          v = y / w
        const wx = (cloudNoise(u * 1.6 + time * 0.05, v * 1.6 + 7) - 0.5) * 0.6
        const wy = (cloudNoise(u * 1.5 + 19, v * 1.5 - time * 0.04) - 0.5) * 0.5
        const warm = cloudNoise(u * 3 + wx + time * 0.1, v * 3 + wy + 11)
        const cool = cloudNoise(u * 3.8 - wx + 43, v * 3.8 - wy - time * 0.08)
        const detail = cloudNoise(u * 11 + wx, v * 11 + wy + 71) - 0.5
        const temperature = Math.max(-1, Math.min(1, (warm - cool) * 1.7 + detail * 0.2)) * variance
        // Near-black ink has no room for the old +/- shifts: channels clipped
        // to zero. Mix towards bounded coloured inks on paper instead.
        const tint = temperature >= 0 ? warmInk : coolInk
        const amount = Math.min(1, Math.abs(temperature) * 2.4)
        const at = (y * w + x) * 4
        for (let c = 0; c < 3; c++) {
          const original = Math.max(0, Math.min(255, base[c] + temperature * darkRange[c]))
          frame.data[at + c] = Math.max(
            0,
            Math.min(
              255,
              Math.round(
                lightInk ? (original + base[c] + (tint[c] - base[c]) * amount) / 2 : original,
              ),
            ),
          )
        }
        frame.data[at + 3] = 255
      }
    ink!.putImageData(frame, 0, 0)
    revision++
  }
  return {
    resize,
    setBase(hex: string, useLightInk = lightInk) {
      base = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
      lightInk = useLightInk
      dirty = true
    },
    setVariance(value: number) {
      variance = value
      dirty = true
    },
    setSpeed(value: number) {
      speed = value
      dirty = true
    },
    draw(now: number, reduced: boolean) {
      if (!reduced) phase += Math.min(0.25, (now - clock) / 1000) * speed
      clock = now
      if (!supported || signal.aborted || !cssWidth || !layers.some((layer) => layer.visible))
        return
      if (dirty || (!reduced && speed > 0 && variance > 0 && now - last >= 100)) {
        paintClouds(phase)
        dirty = false
        last = now
      }
      for (const layer of layers) {
        if (!layer.visible || layer.revision === revision) continue
        const context = layer.ink!
        const ratio = layer.canvas.width / layer.width
        context.setTransform(ratio, 0, 0, layer.canvas.height / layer.height, 0, 0)
        context.globalCompositeOperation = 'copy'
        context.drawImage(layer.mask, 0, 0, layer.width, layer.height)
        context.globalCompositeOperation = 'source-in'
        context.drawImage(
          canvas,
          layer.element === date ? (layer.width - cssWidth) / 2 : 0,
          -layer.offset,
          cssWidth,
          cssHeight,
        )
        context.globalCompositeOperation = 'source-over'
        layer.revision = revision
        if (!layer.element.hasAttribute('data-copy-cloud')) layer.element.dataset.copyCloud = ''
      }
    },
  }
}
