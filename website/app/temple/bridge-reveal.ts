import { bridgeTextNodes } from './bridge-text-dom.ts'
export const bridgeAnimatingGlyphs = 7
export const bridgeScrollPerGlyph = 6

export function bridgeGlyphScale(position: number, index: number) {
  return Math.max(0, Math.min(1, (position - index) / bridgeAnimatingGlyphs)) ** 3
}

// Cache native paragraph geometry and a small glyph atlas at layout time.
// Scroll only scales cached ink; the selectable source stays in document flow.
export function createBridgeReveal(element: HTMLElement) {
  const atlas = document.createElement('canvas')
  const ink = atlas.getContext('2d')!
  let glyphs: {
    x: number
    y: number
    origin: number
    row: number
    run: number
    lingering: boolean
    sx: number
    sy: number
    w: number
    h: number
  }[] = []
  let scales = new Float32Array(0)
  let ratio = 1
  let active = false
  let bounds: { left: number; top: number; right: number; bottom: number } | null = null
  let rowCount = 0
  let rowStarts: number[] = []
  let rowOffsets: number[] = []
  let totalSteps = 0
  let hold = 1
  let runs: {
    text: string
    font: string
    x: number
    baseline: number
    end: number
    offset: number
    node: Text
    row: number
  }[] = []
  const page = element.closest<HTMLElement>('.bridge-page')
  return {
    get bounds() {
      return bounds
    },
    get active() {
      return active
    },
    resize() {
      bounds = null
      glyphs = []
      runs = []
      rowCount = 0
      rowStarts = []
      rowOffsets = []
      totalSteps = 0
      hold = page ? parseFloat(page.style.getPropertyValue('--bridge-hold')) : 1
      ratio = Math.min(3, devicePixelRatio || 1)
      const text = bridgeTextNodes(element)
      const styles = text.map((node) => {
        const style = getComputedStyle(node.parentElement!)
        const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
        ink.font = font
        const metrics = ink.measureText('Hg')
        return {
          node,
          font,
          size: parseFloat(style.fontSize),
          ascent: metrics.fontBoundingBoxAscent,
          descent: metrics.fontBoundingBoxDescent,
        }
      })
      const letters = new Map<string, { char: string; font: string }>()
      for (const { node, font } of styles)
        for (const char of node.textContent!) {
          if (/\S/.test(char)) letters.set(font + '\0' + char, { char, font })
        }
      const cell = Math.ceil(Math.max(...styles.map((style) => style.size), 19) * 2.5)
      atlas.width = cell * 16 * ratio
      atlas.height = cell * Math.max(1, Math.ceil(letters.size / 16)) * ratio
      ink.setTransform(ratio, 0, 0, ratio, 0, 0)
      ink.fillStyle = '#fff'
      ink.fontKerning = 'normal'
      const sprites = new Map(
        [...letters].map(([key, { char, font }], index) => {
          ink.font = font
          const m = ink.measureText(char)
          const sx = (index % 16) * cell + 4
          const sy = Math.floor(index / 16) * cell + 4
          ink.fillText(char, sx + m.actualBoundingBoxLeft, sy + m.actualBoundingBoxAscent)
          return [
            key,
            {
              sx: sx - 2,
              sy: sy - 2,
              w: m.actualBoundingBoxLeft + m.actualBoundingBoxRight + 4,
              h: m.actualBoundingBoxAscent + m.actualBoundingBoxDescent + 4,
              left: m.actualBoundingBoxLeft,
              ascent: m.actualBoundingBoxAscent,
            },
          ] as const
        }),
      )
      const elementBounds = element.getBoundingClientRect()
      const range = document.createRange()
      let lastBaseline = -Infinity
      for (const { node, font, ascent, descent } of styles) {
        let offset = 0
        for (const char of node.textContent!) {
          const i = offset
          offset += char.length
          const sprite = sprites.get(font + '\0' + char)
          if (!sprite) continue
          range.setStart(node, i)
          range.setEnd(node, offset)
          const rect = range.getBoundingClientRect()
          const baseline = rect.top - elementBounds.top + ascent
          if (Math.abs(baseline - lastBaseline) > 2) {
            rowStarts.push(glyphs.length)
            rowCount++
            lastBaseline = baseline
          }
          let run = runs[runs.length - 1]
          if (!run || run.node !== node || run.row !== rowCount - 1) {
            run = {
              text: '',
              font,
              x: rect.left - elementBounds.left,
              baseline,
              end: glyphs.length,
              offset: i,
              node,
              row: rowCount - 1,
            }
            runs.push(run)
          }
          run.text = node.textContent!.slice(run.offset, offset)
          run.end = glyphs.length + 1
          glyphs.push({
            ...sprite,
            x: rect.left - elementBounds.left - sprite.left - 2,
            y: baseline - sprite.ascent - 2,
            origin: baseline + descent,
            row: rowCount - 1,
            run: runs.length - 1,
            lingering: !!node.parentElement?.closest('[data-bridge-linger]'),
          })
        }
      }
      // WebKit rounds single-character ranges differently from complete runs.
      // Measure finished native runs together so their fractional origins stay
      // aligned with the selectable source after the reveal front has passed.
      for (const run of runs) {
        range.setStart(run.node, run.offset)
        range.setEnd(run.node, run.offset + run.text.length)
        const rect = range.getBoundingClientRect()
        ink.font = run.font
        run.x = rect.left - elementBounds.left
        run.baseline = rect.top - elementBounds.top + ink.measureText('Hg').fontBoundingBoxAscent
      }
      rowOffsets = rowStarts.map((start, row) => {
        const offset = totalSteps
        totalSteps += (rowStarts[row + 1] ?? glyphs.length) - start + bridgeAnimatingGlyphs - 1
        return offset
      })
      scales = new Float32Array(glyphs.length).fill(-1)
    },
    paint(
      context: CanvasRenderingContext2D,
      top: number,
      width: number,
      height: number,
      reduced: boolean,
    ) {
      let changed = false
      const progress = page ? -page.getBoundingClientRect().top / hold : 1
      active = reduced || !page || (progress >= 0 && top + height > 0)
      page?.toggleAttribute('data-active', active)
      const position = Math.max(0, Math.min(1, progress)) * totalSteps
      glyphs.forEach((glyph, index) => {
        // Rows have disjoint intervals; within a row the moving front spans
        // at most seven consecutive glyphs, independent of viewport width.
        const scale =
          !reduced && progress > 1 && glyph.lingering
            ? 0
            : reduced || !page
              ? 1
              : active
                ? bridgeGlyphScale(position - rowOffsets[glyph.row], index - rowStarts[glyph.row])
                : 0
        if (
          Math.abs(scales[index] - scale) > 0.0005 ||
          ((scale === 1 || scale === 0) && scales[index] !== scale)
        ) {
          scales[index] = scale
          changed = true
        }
      })
      if (!changed) return false
      bounds = null
      glyphs.forEach((glyph, index) => {
        const scale = scales[index]
        if (scale <= 0.01) return
        const top = glyph.origin + (glyph.y - glyph.origin) * scale
        const bottom = top + glyph.h * scale
        if (!bounds) bounds = { left: glyph.x, right: glyph.x + glyph.w, top, bottom }
        else {
          bounds.left = Math.min(bounds.left, glyph.x)
          bounds.right = Math.max(bounds.right, glyph.x + glyph.w)
          bounds.top = Math.min(bounds.top, top)
          bounds.bottom = Math.max(bounds.bottom, bottom)
        }
      })
      context.clearRect(0, 0, width, height)
      const completeRuns = runs.map((run) => scales[run.end - 1] === 1)
      context.fontKerning = 'normal'
      context.fillStyle = '#fff'
      runs.forEach((run, index) => {
        if (!completeRuns[index]) return
        context.font = run.font
        context.fillText(run.text, run.x, run.baseline)
      })
      glyphs.forEach((glyph, index) => {
        if (completeRuns[glyph.run]) return
        const scale = scales[index]
        if (scale <= 0 || !glyph.w || !glyph.h) return
        context.drawImage(
          atlas,
          glyph.sx * ratio,
          glyph.sy * ratio,
          glyph.w * ratio,
          glyph.h * ratio,
          glyph.x,
          glyph.origin + (glyph.y - glyph.origin) * scale,
          glyph.w,
          glyph.h * scale,
        )
      })
      return true
    },
    dispose() {
      runs = []
      glyphs = []
      scales = new Float32Array(0)
      atlas.width = atlas.height = 0
    },
  }
}
