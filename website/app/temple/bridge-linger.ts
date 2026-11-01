import { bridgeTextRange } from './bridge-text-dom.ts'

export const bridgeLingerTiming = { start: 0.12, end: 0.9 } as const

// A visual copy takes over at sticky release. The authored inline text stays
// in its paragraph for selection, fallback and assistive technology.
export function createBridgeLinger(root: HTMLElement, signal: AbortSignal) {
  const body = root.querySelector<HTMLElement>('.bridge-body')
  const ghost = document.createElement('span')
  ghost.className = 'bridge-linger'
  ghost.ariaHidden = 'true'
  let page: HTMLElement | null = null
  let hold = 0,
    viewport = 0,
    opacity = -1
  signal.addEventListener('abort', () => ghost.remove(), { once: true })
  return {
    resize(reduced: boolean) {
      ghost.removeAttribute('data-active')
      opacity = -1
      page = null
      const source = body?.querySelector<HTMLElement>(
        '.bridge-page[data-final] [data-bridge-linger]',
      )
      if (!body || !source || reduced) {
        ghost.remove()
        return
      }
      page = source.closest('.bridge-page')
      hold = parseFloat(page!.style.getPropertyValue('--bridge-hold'))
      viewport = page!.firstElementChild!.getBoundingClientRect().height
      const stageTop = page!.firstElementChild!.getBoundingClientRect().top
      const range = bridgeTextRange(source)(0, source.textContent!.length)
      const target = range.getBoundingClientRect()
      ghost.replaceChildren(range.cloneContents())
      ghost.style.font = getComputedStyle(source).font
      ghost.style.letterSpacing = getComputedStyle(source).letterSpacing
      ghost.style.left = '0px'
      ghost.style.top = '0px'
      body.appendChild(ghost)
      // Measure the inline baseline inside the fixed copy instead of guessing
      // from its line-height; taking over must not move the final words.
      const own = bridgeTextRange(ghost)(0, ghost.textContent!.length).getBoundingClientRect()
      ghost.style.left = `${target.left - own.left}px`
      ghost.style.top = `${target.top - stageTop - own.top}px`
    },
    draw(reduced: boolean) {
      if (!page || reduced) {
        ghost.removeAttribute('data-active')
        return
      }
      const release = -page.getBoundingClientRect().top - hold
      const { start, end } = bridgeLingerTiming
      const t = Math.max(0, Math.min(1, (release / viewport - start) / (end - start)))
      const next = release > 0 ? 1 - t * t * (3 - 2 * t) : 0
      if (next === opacity) return
      opacity = next
      ghost.style.opacity = String(next)
      ghost.toggleAttribute('data-active', next > 0.001)
    },
  }
}
