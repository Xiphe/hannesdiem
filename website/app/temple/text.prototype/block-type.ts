// THROWAWAY: native type fitted to one reading column, not fixed letter slots.
export function blockType(root: HTMLElement) {
  const lines = [...root.querySelectorAll<HTMLElement>('[data-type-line]')].map((element) => ({
    element,
    text: element.textContent!.trim(),
  }))
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
        ink.append(baseline)
        optical.push({ row, ink, baseline, ascent: metrics.actualBoundingBoxAscent })
        measure.font = `${style.fontWeight} 100px ${style.fontFamily}`
        measure.letterSpacing = `${tracking * 100}px`
        row.append(ink)
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
    }
  }
}
