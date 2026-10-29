// Cloud colour texture clipped to native, selectable paragraph text.
import { noise as cloudNoise } from './atmosphere.ts'
import { defaults } from './defaults.ts'
export function colourCopy(root: HTMLElement) {
  const paragraphs = [...root.querySelectorAll<HTMLElement>('.verse-copy > p')]
  let variance = defaults.copyVariance,
    speed = defaults.copySpeed,
    phase = 0,
    clock = performance.now(),
    base = [1, 3, 5].map((i) => parseInt(defaults.copyColor.slice(i, i + 2), 16)),
    last = -Infinity
  const canvas = document.createElement('canvas')
  const ink = canvas.getContext('2d')!
  let frame: ImageData
  function paintClouds(time: number) {
    const cssWidth = paragraphs[0].clientWidth,
      cssHeight = root.scrollHeight
    // These are broad colour clouds, not glyph detail. Keep the texture small as
    // the fitted poster blocks make the document taller; glyphs remain native.
    const w = 128,
      h = Math.max(1, Math.min(512, Math.ceil((cssHeight / cssWidth) * w)))
    if (!frame || canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
      frame = ink.createImageData(w, h)
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
        const at = (y * w + x) * 4
        for (let c = 0; c < 3; c++)
          frame.data[at + c] = Math.max(
            0,
            Math.min(255, Math.round(base[c] + temperature * [50, -8, -65][c])),
          )
        frame.data[at + 3] = 255
      }
    ink.putImageData(frame, 0, 0)
    const image = `url("${canvas.toDataURL()}")`
    const rootTop = root.getBoundingClientRect().top
    for (const paragraph of paragraphs) {
      paragraph.style.backgroundImage = image
      paragraph.style.backgroundSize = `${cssWidth}px ${cssHeight}px`
      paragraph.style.backgroundPosition = `0px ${rootTop - paragraph.getBoundingClientRect().top}px`
      paragraph.dataset.copyCloud = ''
    }
  }
  return {
    setBase(hex: string) {
      base = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
      last = -Infinity
    },
    setVariance(value: number) {
      variance = value
      last = -Infinity
    },
    setSpeed(value: number) {
      speed = value
      last = -Infinity
    },
    draw(now: number, reduced: boolean) {
      if (!reduced && now - last < 100) return
      last = now
      if (!reduced) phase += Math.min(0.25, (now - clock) / 1000) * speed
      clock = now
      paintClouds(phase)
    },
  }
}
