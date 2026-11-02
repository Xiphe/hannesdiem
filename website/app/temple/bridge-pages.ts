import { bridgeTextNodes, bridgeTextRange } from './bridge-text-dom.ts'
import { bridgeAnimatingGlyphs, bridgeScrollPerGlyph } from './bridge-reveal.ts'
import { bridgeLingerTiming } from './bridge-linger.ts'

// Break only at native line boundaries. Original paragraphs own the source;
// viewport-sized pages are a reversible presentation, never authored copy.
export function createBridgePages(root: HTMLElement, signal: AbortSignal) {
  const body = root.querySelector<HTMLElement>('.bridge-body')
  const originals = body ? [...body.children] : []
  let key = ''
  const restore = () => {
    body?.replaceChildren(...originals)
    body?.removeAttribute('data-paged')
    body?.style.removeProperty('--bridge-linger-runway')
  }
  signal.addEventListener('abort', restore, { once: true })
  return {
    resize(reduced: boolean) {
      if (!body || signal.aborted) return
      const next = `${body.clientWidth}/${innerHeight}/${reduced}`
      if (key === next) return
      key = next
      if (reduced) {
        restore()
        return
      }
      const fragment = document.createDocumentFragment()
      const probe = document.createElement('p')
      probe.className = 'bridge-body-copy bridge-layout-probe'
      probe.style.width = `${body.clientWidth}px`
      body.appendChild(probe)
      for (const original of originals) {
        const clone = original.cloneNode(true) as HTMLElement
        clone.querySelectorAll('canvas').forEach((canvas) => canvas.remove())
        probe.replaceChildren(...clone.childNodes)
        if (!probe.textContent) continue
        if (innerWidth >= 900 && original instanceof HTMLElement && original.dataset.wideBreaks) {
          for (const after of JSON.parse(original.dataset.wideBreaks) as string[]) {
            const at = probe.textContent!.indexOf(after + ' ')
            if (at < 0) continue
            let offset = at + after.length
            for (const node of bridgeTextNodes(probe)) {
              if (offset < node.length) {
                node.replaceData(offset, 1, '\n')
                break
              }
              offset -= node.length
            }
          }
        }
        const text = probe.textContent!
        if (
          original instanceof HTMLElement &&
          original.dataset.linger &&
          text.endsWith(original.dataset.linger)
        ) {
          const tail = original.dataset.linger
          const range = bridgeTextRange(probe)(text.length - tail.length, text.length)
          const span = document.createElement('span')
          span.dataset.bridgeLinger = ''
          span.appendChild(range.extractContents())
          range.insertNode(span)
        }
        const rangeFor = bridgeTextRange(probe)
        const lineHeight = parseFloat(getComputedStyle(probe).lineHeight)
        const perPage = Math.max(1, Math.floor(Math.min(innerHeight * 0.62, 560) / lineHeight))
        const starts = [0]
        const tops: number[] = []
        let top = -Infinity
        for (const word of text.matchAll(/\S+/g)) {
          const y = rangeFor(word.index, word.index + word[0].length).getBoundingClientRect().top
          if (top !== -Infinity && Math.abs(y - top) > 2) starts.push(word.index)
          if (!tops.length || Math.abs(y - top) > 2) tops.push(y)
          top = y
        }
        const paragraph = document.createElement('div')
        paragraph.className = 'bridge-paragraph'
        for (let line = 0; line < starts.length;) {
          let nextLine = line + 1
          while (nextLine < starts.length && tops[nextLine] - tops[line] < perPage * lineHeight - 2)
            nextLine++
          const end = starts[nextLine] ?? text.length
          const page = document.createElement('section')
          page.className = 'bridge-page'
          const rows = nextLine - line
          const visibleLetters = text.slice(starts[line], end).replace(/\s/g, '').length
          const hold = (visibleLetters + rows * (bridgeAnimatingGlyphs - 1)) * bridgeScrollPerGlyph
          page.style.setProperty('--bridge-hold', `${hold}px`)
          page.dataset.rows = String(rows)
          const stage = document.createElement('div')
          stage.className = 'bridge-page-stage'
          const copy = document.createElement('p')
          copy.className = 'bridge-body-copy'
          copy.appendChild(rangeFor(starts[line], end).cloneContents())
          stage.appendChild(copy)
          page.appendChild(stage)
          paragraph.appendChild(page)
          line = nextLine
        }
        fragment.appendChild(paragraph)
      }
      probe.remove()
      const pages = fragment.querySelectorAll<HTMLElement>('.bridge-page')
      pages[pages.length - 1]?.setAttribute('data-final', '')
      body.replaceChildren(fragment)
      body.dataset.paged = ''
      // Clear the next centred reading area, while the previous surface can
      // still be travelling through the upper part of the viewport.
      const measured = [...body.querySelectorAll<HTMLElement>('.bridge-page')].map((page) => ({
        page,
        height: page.querySelector('p')!.getBoundingClientRect().height,
      }))
      body.style.removeProperty('--bridge-linger-runway')
      measured.forEach(({ page, height }, index) => {
        const nextHeight = measured[index + 1]?.height ?? height
        const exit = (height + nextHeight) / 2 + 16
        page.style.setProperty('--bridge-exit', `${exit}px`)
        if (page.hasAttribute('data-final') && page.querySelector('[data-bridge-linger]')) {
          body.style.setProperty(
            '--bridge-linger-runway',
            `${Math.max(0, page.firstElementChild!.getBoundingClientRect().height * bridgeLingerTiming.end - exit)}px`,
          )
        }
      })
    },
  }
}
