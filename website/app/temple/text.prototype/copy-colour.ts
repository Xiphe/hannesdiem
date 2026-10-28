// Subtle correlated temperature patches; native inline shaping/word boundaries remain.
import { hash } from './typography.ts'
import { noise as cloudNoise } from './atmosphere.ts'
import { defaults } from './defaults.ts'
export function colourCopy(root: HTMLElement) {
  const seed = Math.random() * 10000
  const groups: { paragraph: HTMLElement; letters: { node: HTMLSpanElement; index: number }[] }[] =
    []
  let index = 0,
    variance = defaults.copyVariance,
    speed = defaults.copySpeed,
    mode: 'letters' | 'clouds' = 'letters',
    phase = 0,
    clock = performance.now(),
    base = [1, 3, 5].map((i) => parseInt(defaults.copyColor.slice(i, i + 2), 16)),
    last = -Infinity
  for (const paragraph of root.querySelectorAll<HTMLElement>(
    '.verse-copy > p:not(.verse-opening)',
  )) {
    const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        return node.parentElement!.closest('.type-emphasis')
          ? NodeFilter.FILTER_REJECT
          : NodeFilter.FILTER_ACCEPT
      },
    })
    const nodes: Text[] = []
    while (walker.nextNode()) nodes.push(walker.currentNode as Text)
    const letters: { node: HTMLSpanElement; index: number }[] = []
    for (const node of nodes) {
      const fragment = document.createDocumentFragment()
      for (const { segment } of new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(
        node.data,
      )) {
        const at = index++
        if (!segment.trim()) {
          fragment.append(segment)
          continue
        }
        const span = document.createElement('span')
        span.dataset.copyLetter = ''
        span.textContent = segment
        letters.push({ node: span, index: at })
        fragment.append(span)
      }
      node.replaceWith(fragment)
    }
    groups.push({ paragraph, letters })
  }
  function noise(x: number) {
    const whole = Math.floor(x),
      t = x - whole,
      s = t * t * (3 - 2 * t)
    return (hash(whole + seed) * (1 - s) + hash(whole + 1 + seed) * s) * 2 - 1
  }
  const canvas = document.createElement('canvas')
  const ink = canvas.getContext('2d')!
  let frame: ImageData
  function paintClouds(time: number) {
    const cssWidth = groups[0].paragraph.clientWidth,
      cssHeight = root.scrollHeight
    const w = 192,
      h = Math.max(1, Math.min(768, Math.ceil((cssHeight / cssWidth) * w)))
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
    for (const { paragraph } of groups) {
      paragraph.style.backgroundImage = image
      paragraph.style.backgroundSize = `${cssWidth}px ${cssHeight}px`
      paragraph.style.backgroundPosition = `0px ${rootTop - paragraph.getBoundingClientRect().top}px`
    }
  }
  return {
    setMode(value: 'letters' | 'clouds') {
      mode = value
      document.body.dataset.copyMode = mode
      last = -Infinity
    },
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
      const time = phase
      if (mode === 'clouds') {
        paintClouds(time)
        return
      }
      for (const { paragraph, letters } of groups) {
        const rect = paragraph.getBoundingClientRect()
        if (rect.bottom < 0 || rect.top > innerHeight) continue
        for (const { node, index } of letters) {
          const temperature =
            (noise(index * 0.12 + time * 0.18) * 0.74 + noise(index * 0.43 - time * 0.13) * 0.26) *
            variance
          const rgb = base.map((v, i) =>
            Math.max(0, Math.min(255, Math.round(v + temperature * [50, -8, -65][i]))),
          )
          node.style.color = `rgb(${rgb.join(',')})`
        }
      }
    },
  }
}
