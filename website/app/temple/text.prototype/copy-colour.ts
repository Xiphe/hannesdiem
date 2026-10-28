// Subtle correlated temperature patches; native inline shaping/word boundaries remain.
import { hash } from './typography.ts'
export function colourCopy(root: HTMLElement) {
  const seed = Math.random() * 10000
  const groups: { paragraph: HTMLElement; letters: { node: HTMLSpanElement; index: number }[] }[] =
    []
  let index = 0,
    variance = 0.4,
    speed = 1,
    phase = 0,
    clock = performance.now(),
    base = [210, 208, 200],
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
      const time = phase
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
