// Cache native glyph masks on layout changes; paint colour directly, without
// encoding images or changing DOM styles during animation. Text stays selectable.
import { noise as cloudNoise } from './atmosphere.ts'
import { createBridgeReveal } from './bridge-reveal.ts'
import { defaults } from './defaults.ts'
import { copyInkChannel } from './copy-palette.ts'
const bridgeDark = { base: [192, 205, 226], purple: [211, 183, 224], blue: [156, 198, 238] }
const bridgeLight = { base: [26, 33, 54], purple: [88, 44, 107], blue: [31, 79, 133] }
export function colourCopy(
  root: HTMLElement,
  signal: AbortSignal,
  request: () => void,
  date?: HTMLElement,
) {
  const space = root.querySelector<HTMLElement>('.poem-pairs') ?? root
  const paragraphs = [...root.querySelectorAll<HTMLElement>('.verse-copy > p')]
  const lines = [...root.querySelectorAll<HTMLElement>('.phrase-entry, .bridge-body-copy')]
  const inline = [...root.querySelectorAll<HTMLElement>('[data-copy-inline]')]
  const elements = [...lines, ...inline, ...(date ? [date] : [])]
  const inlineBaselines = inline.map((element) => {
    const baseline = document.createElement('span')
    baseline.className = 'block-baseline'
    baseline.ariaHidden = 'true'
    element.appendChild(baseline)
    return baseline
  })
  const dateBaseline = document.createElement('span')
  dateBaseline.className = 'block-baseline'
  dateBaseline.ariaHidden = 'true'
  date?.appendChild(dateBaseline)
  const makeLayer = (element: HTMLElement) => {
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
      bridge: !!element.closest('.bridge-copy, .bridge-body'),
      inline: element.hasAttribute('data-copy-inline'),
      header: element.closest<HTMLElement>('header'),
      reveal: element.matches('.bridge-body-copy') ? createBridgeReveal(element) : undefined,
    }
  }
  const layers = elements.map(makeLayer)
  const visible = (layer: (typeof layers)[number]) =>
    layer.visible &&
    !(
      layer.inline &&
      layer.header?.hasAttribute('data-nav-mounted') &&
      !layer.header.hasAttribute('data-nav-visible')
    )
  const updateSelection = () => {
    const selection = document.getSelection()
    for (const layer of layers) {
      if (layer.reveal) continue
      layer.element.toggleAttribute(
        'data-copy-selected',
        !!selection && !selection.isCollapsed && selection.containsNode(layer.element, true),
      )
    }
  }
  document.addEventListener('selectionchange', updateSelection, { signal })
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
  const bridgeCanvas = document.createElement('canvas')
  const bridgeInk = bridgeCanvas.getContext('2d')!
  const supported = ink && layers.every((layer) => layer.ink && layer.maskInk)
  let frame: ImageData
  let bridgeFrame: ImageData
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const layer = layers.find((layer) => layer.element === entry.target)
        if (!layer) continue
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
      inlineBaselines.forEach((baseline) => baseline.remove())
      canvas.width = canvas.height = bridgeCanvas.width = bridgeCanvas.height = 0
      for (const { element, canvas, mask, reveal } of layers) {
        element.removeAttribute('data-copy-cloud')
        element.removeAttribute('data-copy-selected')
        element.closest('p')?.removeAttribute('data-copy-cloud')
        canvas.remove()
        reveal?.dispose()
        canvas.width = canvas.height = mask.width = mask.height = 0
      }
    },
    { once: true },
  )

  function resize() {
    if (!supported || signal.aborted) return
    const bridge = [...root.querySelectorAll<HTMLElement>('.bridge-body-copy')]
    for (let index = layers.length - 1; index >= 0; index--) {
      const layer = layers[index]
      if (!layer.reveal || bridge.includes(layer.element)) continue
      observer.unobserve(layer.element)
      layer.element.removeAttribute('data-copy-cloud')
      layer.canvas.remove()
      layer.reveal.dispose()
      layer.canvas.width = layer.canvas.height = layer.mask.width = layer.mask.height = 0
      layers.splice(index, 1)
    }
    for (const element of bridge)
      if (!layers.some((layer) => layer.element === element)) {
        layers.push(makeLayer(element))
        observer.observe(element)
      }
    const bounds = space.getBoundingClientRect()
    cssWidth = paragraphs[0]?.clientWidth ?? space.clientWidth
    cssHeight = space.scrollHeight
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
        element === date || layer.inline
          ? [element]
          : [...element.querySelectorAll<HTMLElement>('.block-row-ink')]
      for (const row of rows) {
        const style = getComputedStyle(row)
        const position = row.getBoundingClientRect()
        const anchor = row.querySelector('.block-baseline')!.getBoundingClientRect()
        const baseline = anchor.top
        maskInk!.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
        maskInk!.fontKerning = 'normal'
        maskInk!.letterSpacing = style.letterSpacing === 'normal' ? '0px' : style.letterSpacing
        if (row.dataset.inkAngle !== undefined) {
          maskInk!.save()
          maskInk!.translate(anchor.left - rect.left, baseline - rect.top)
          maskInk!.rotate(Number(row.dataset.inkAngle))
          maskInk!.fillText(row.textContent!, 0, 0)
          maskInk!.restore()
        } else {
          maskInk!.fillText(row.textContent!, position.left - rect.left, baseline - rect.top)
        }
      }
      layer.reveal?.resize()
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
      bridgeCanvas.width = w
      bridgeCanvas.height = h
      bridgeFrame = bridgeInk.createImageData(w, h)
    }
    const bridgePalette = lightInk ? bridgeLight : bridgeDark
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
        const amount = Math.min(1, Math.abs(temperature) * 2.4)
        const bridgeTint = temperature >= 0 ? bridgePalette.purple : bridgePalette.blue
        const bridgeBlend = amount * (lightInk ? 0.75 : 1)
        const at = (y * w + x) * 4
        for (let c = 0; c < 3; c++) {
          frame.data[at + c] = copyInkChannel(base[c], temperature, c, lightInk)
          bridgeFrame.data[at + c] = Math.round(
            bridgePalette.base[c] + (bridgeTint[c] - bridgePalette.base[c]) * bridgeBlend,
          )
        }
        frame.data[at + 3] = bridgeFrame.data[at + 3] = 255
      }
    ink!.putImageData(frame, 0, 0)
    bridgeInk.putImageData(bridgeFrame, 0, 0)
    revision++
  }
  return {
    resize,
    bridgeBounds() {
      let visible: { left: number; top: number; right: number; bottom: number } | null = null
      for (const layer of layers) {
        const bounds = layer.reveal?.bounds
        if (!layer.visible || !layer.reveal?.active || !bounds) continue
        const rect = layer.element.getBoundingClientRect()
        const top = Math.max(0, rect.top + bounds.top)
        const bottom = Math.min(innerHeight, rect.top + bounds.bottom)
        if (bottom <= top) continue
        const left = rect.left + bounds.left,
          right = rect.left + bounds.right
        if (!visible) visible = { left, right, top, bottom }
        else {
          visible.left = Math.min(visible.left, left)
          visible.right = Math.max(visible.right, right)
          visible.top = Math.min(visible.top, top)
          visible.bottom = Math.max(visible.bottom, bottom)
        }
      }
      return visible
    },
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
      if (!supported || signal.aborted || !cssWidth || !layers.some(visible)) return
      if (dirty || (!reduced && speed > 0 && variance > 0 && now - last >= 100)) {
        paintClouds(phase)
        dirty = false
        last = now
      }
      for (const layer of layers) {
        if (!visible(layer)) continue
        const changed = layer.reveal?.paint(
          layer.maskInk!,
          layer.element.getBoundingClientRect().top,
          layer.width,
          layer.height,
          reduced,
        )
        if (layer.reveal && !layer.reveal.active) {
          if (changed) {
            layer.ink!.clearRect(0, 0, layer.canvas.width, layer.canvas.height)
            layer.revision = -1
          }
          continue
        }
        if (!changed && layer.revision === revision) continue
        const context = layer.ink!
        const ratio = layer.canvas.width / layer.width
        context.setTransform(ratio, 0, 0, layer.canvas.height / layer.height, 0, 0)
        context.globalCompositeOperation = 'copy'
        context.drawImage(layer.mask, 0, 0, layer.width, layer.height)
        context.globalCompositeOperation = 'source-in'
        if (layer.reveal) {
          context.fillStyle = lightInk ? '#1a2136' : '#c0cde2'
          context.fillRect(0, 0, layer.width, layer.height)
        } else if (layer.inline) {
          // Fixed navigation samples one shared horizontal strip of the verse ink.
          context.drawImage(
            canvas,
            -layer.element.getBoundingClientRect().left,
            0,
            innerWidth,
            innerHeight,
          )
        } else {
          context.drawImage(
            layer.bridge ? bridgeCanvas : canvas,
            layer.element === date ? (layer.width - cssWidth) / 2 : 0,
            -layer.offset,
            cssWidth,
            cssHeight,
          )
        }
        context.globalCompositeOperation = 'source-over'
        layer.revision = revision
        if (!layer.element.hasAttribute('data-copy-cloud')) {
          layer.element.dataset.copyCloud = ''
          const paragraph = layer.element.closest('p')
          if (paragraph) paragraph.dataset.copyCloud = ''
        }
      }
    },
  }
}
