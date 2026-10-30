import { verseCurve } from './curve.ts'

// native type fitted to one reading column, not fixed letter slots.
export function blockType(root: HTMLElement, signal: AbortSignal) {
  const lines = [...root.querySelectorAll<HTMLElement>('[data-type-line]')].map((element) => ({
    element,
    text: element.textContent!.trim(),
  }))
  signal.addEventListener(
    'abort',
    () => {
      for (const { element, text } of lines) {
        element.textContent = text
        element.removeAttribute('data-fitted')
      }
    },
    { once: true },
  )
  const measure = document.createElement('canvas').getContext('2d')!
  return () => {
    const copySizes = new Map<Element, number>()
    const ordered = [
      ...lines.filter(({ element }) => element.dataset.lettering === 'copy'),
      ...lines.filter(({ element }) => element.dataset.lettering !== 'copy'),
    ]
    for (const { element, text } of ordered) {
      const style = getComputedStyle(element)
      const tracking = element.dataset.lettering === 'spaced' ? 0.28 : 0
      const width = element.clientWidth
      measure.font = `${style.fontWeight} 100px ${style.fontFamily}`
      measure.fontKerning = 'normal'
      measure.letterSpacing = `${tracking * 100}px`
      const extent = (text: string) => {
        const m = measure.measureText(text)
        return m.actualBoundingBoxLeft + m.actualBoundingBoxRight
      }
      const words = text.split(' ')
      const paragraph = element.closest('p')!
      const minSize =
        element.dataset.lettering === 'copy'
          ? 18
          : element.dataset.lettering === 'spaced'
            ? 0
            : width <= 640
              ? Math.max(36, (copySizes.get(paragraph) ?? 18) * 1.3)
              : 24
      let rows = [words]
      // Split semantic lines only when fitting them would make phone text tiny.
      for (
        let count = 2;
        rows.some((row) => (width * 100) / extent(row.join(' ')) < minSize);
        count++
      ) {
        if (count > words.length) break
        rows = []
        let at = 0
        for (let row = 0; row < count; row++) {
          const remaining = count - row
          const target = extent(words.slice(at).join(' ')) / remaining
          let end = at + 1
          while (
            end < words.length - remaining + 1 &&
            Math.abs(extent(words.slice(at, end + 1).join(' ')) - target) <
              Math.abs(extent(words.slice(at, end).join(' ')) - target)
          )
            end++
          rows.push(words.slice(at, end))
          at = end
        }
      }
      const fragment = document.createDocumentFragment()
      const optical: {
        row: HTMLElement
        ink: HTMLElement
        baseline: HTMLElement
        ascent: number
      }[] = []
      rows.forEach((words, i) => {
        if (i) fragment.append(' ')
        const row = document.createElement('span')
        row.className = 'block-row'
        const ink = document.createElement('span')
        ink.className = 'block-row-ink'
        ink.textContent = words.join(' ')
        let size = (width * 100) / extent(ink.textContent)
        if (element.dataset.lettering === 'spaced')
          size = Math.min(size, Math.max(16, width * 0.05))
        row.style.fontSize = `${size}px`
        measure.font = `${style.fontWeight} ${size}px ${style.fontFamily}`
        let spacing = size * tracking
        if (element.dataset.lettering === 'spaced') {
          // Keep the address quiet while distributing it across the same width.
          measure.letterSpacing = '0px'
          spacing = (width - extent(ink.textContent)) / (ink.textContent.length - 1)
        }
        ink.style.letterSpacing = `${spacing}px`
        measure.letterSpacing = `${spacing}px`
        const metrics = measure.measureText(ink.textContent)
        ink.style.marginLeft = `${metrics.actualBoundingBoxLeft}px`
        row.style.height = `${metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent}px`
        // The empty probe gives the browser's actual baseline, independent of
        // each font's em-box and leading. No pixel reads or transformed glyphs.
        const baseline = document.createElement('span')
        baseline.className = 'block-baseline'
        baseline.ariaHidden = 'true'
        ink.appendChild(baseline)
        optical.push({ row, ink, baseline, ascent: metrics.actualBoundingBoxAscent })
        measure.font = `${style.fontWeight} 100px ${style.fontFamily}`
        measure.letterSpacing = `${tracking * 100}px`
        row.appendChild(ink)
        fragment.append(row)
        if (element.dataset.lettering === 'copy')
          copySizes.set(paragraph, Math.max(copySizes.get(paragraph) ?? 0, size))
      })
      element.replaceChildren(fragment)
      element.dataset.fitted = ''
      for (const { row, ink, baseline, ascent } of optical) {
        const offset =
          baseline.getBoundingClientRect().top - row.getBoundingClientRect().top - ascent
        ink.style.top = `${-offset}px`
      }
      if (element.dataset.shape === 'sweep') {
        for (const { row, ink } of optical) {
          const style = getComputedStyle(ink)
          measure.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
          measure.letterSpacing = '0px'
          const text = ink.textContent!
          const inset = 6
          const size =
            parseFloat(style.fontSize) *
            Math.min(1, (width - inset * 2) / measure.measureText(text).width)
          measure.font = `${style.fontWeight} ${size}px ${style.fontFamily}`
          const total = measure.measureText(text).width
          const amplitude = width * 0.25
          const coordinates = { x: verseCurve.map((p) => p.x), y: verseCurve.map((p) => p.y) }
          const cubic = (t: number, axis: 'x' | 'y') => {
            const p = coordinates[axis]
            return (
              (1 - t) ** 3 * p[0] +
              3 * (1 - t) ** 2 * t * p[1] +
              3 * (1 - t) * t * t * p[2] +
              t ** 3 * p[3]
            )
          }
          const derivative = (t: number, axis: 'x' | 'y') => {
            const p = coordinates[axis]
            return (
              3 * (1 - t) ** 2 * (p[1] - p[0]) +
              6 * (1 - t) * t * (p[2] - p[1]) +
              3 * t * t * (p[3] - p[2])
            )
          }
          const samples = Array.from({ length: 101 }, (_, i) => cubic(i / 100, 'y'))
          const minimum = Math.min(...samples)
          const range = amplitude * (Math.max(...samples) - minimum)
          const origin = parseFloat(ink.style.top)
          const left = (width - total) / 2
          const fragment = document.createDocumentFragment()
          // Follow a continuous, gently undulating baseline. Each letter turns
          // with its tangent; geometry is cached until the next layout refit.
          for (let i = 0; i < text.length; i++) {
            const x = measure.measureText(text.slice(0, i)).width
            let low = 0,
              high = 1
            for (let step = 0; step < 20; step++) {
              const mid = (low + high) / 2
              if (cubic(mid, 'x') < x / total) low = mid
              else high = mid
            }
            const t = (low + high) / 2
            const y = 4 + amplitude * (cubic(t, 'y') - minimum)
            const slope =
              ((amplitude / total) * derivative(t, 'y')) / Math.max(0.001, derivative(t, 'x'))
            const glyph = document.createElement('span')
            glyph.className = 'block-row-ink'
            glyph.style.fontSize = `${size}px`
            glyph.dataset.inkAngle = String(Math.atan(slope))
            glyph.style.left = `${left + x}px`
            glyph.style.top = `${origin + y}px`
            const probe = document.createElement('span')
            probe.className = 'block-baseline'
            probe.ariaHidden = 'true'
            glyph.appendChild(probe)
            glyph.appendChild(document.createTextNode(text[i]))
            fragment.append(glyph)
          }
          row.style.height = `${parseFloat(row.style.height) + range + 8}px`
          row.replaceChildren(fragment)
          for (const glyph of row.querySelectorAll<HTMLElement>('[data-ink-angle]')) {
            const baseline = glyph.querySelector('.block-baseline')!.getBoundingClientRect()
            glyph.style.transformOrigin = `0px ${baseline.top - glyph.getBoundingClientRect().top}px`
            glyph.style.transform = `rotate(${glyph.dataset.inkAngle}rad)`
          }
        }
      }
    }
  }
}
