export type TooltipStage = 'clock' | 'range' | 'name'

export function captureTooltip(tooltip?: HTMLElement, panel?: HTMLElement) {
  if (!tooltip || !panel || getComputedStyle(tooltip).visibility === 'hidden') return
  return {
    box: tooltip.getBoundingClientRect(),
    panelWidth: panel.getBoundingClientRect().width,
    arrowX: parseFloat(getComputedStyle(tooltip, '::before').left),
  }
}

/** Animate this player's popover only; playback and the page keep rendering live. */
export async function animateTooltip(
  tooltip: HTMLElement,
  incoming: HTMLElement,
  outgoing: HTMLElement | undefined,
  from: TooltipStage,
  to: TooltipStage,
  before: ReturnType<typeof captureTooltip>,
  signal: AbortSignal,
) {
  if (signal.aborted || matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const animations: Animation[] = []
  const easing = 'cubic-bezier(.22,.8,.24,1)'
  const run = (
    node: Element | null | undefined,
    frames: Keyframe[],
    duration: number,
    delay = 0,
  ) => {
    if (node) animations.push(node.animate(frames, { duration, delay, easing, fill: 'both' }))
  }
  const cancel = () => animations.forEach((animation) => animation.cancel())
  signal.addEventListener('abort', cancel, { once: true })
  const preference = matchMedia('(prefers-reduced-motion: reduce)')
  const reduce = () => {
    if (preference.matches) cancel()
  }
  preference.addEventListener('change', reduce)
  try {
    if (from === 'clock') {
      if (before) {
        const after = tooltip.getBoundingClientRect()
        const parent = (tooltip.offsetParent as HTMLElement).getBoundingClientRect()
        const frame = (box: DOMRect): Keyframe => ({
          left: `${box.left - parent.left}px`,
          top: `${box.top - parent.top}px`,
          bottom: 'auto',
          transform: 'none',
          width: `${box.width}px`,
          height: `${box.height}px`,
        })
        run(tooltip, [frame(before.box), frame(after)], 320)
      }
      run(outgoing, [{ opacity: 1 }, { opacity: 0 }], 120)
      run(
        incoming,
        [
          { opacity: 0, transform: 'translateY(4px)' },
          { opacity: 1, transform: 'none' },
        ],
        220,
        80,
      )
      run(tooltip.querySelector('.ec-clip-actions'), [{ opacity: 0 }, { opacity: 1 }], 220, 80)
      run(tooltip.querySelector('.ec-morph-pointer'), [{ opacity: 1 }, { opacity: 0 }], 100)
      run(tooltip.querySelector('.ec-range-arrow'), [{ opacity: 0 }, { opacity: 1 }], 160, 160)
      run(
        tooltip.parentElement?.querySelector(':scope > .ec-main-trim'),
        [{ opacity: 0 }, { opacity: 1 }],
        200,
        80,
      )
    } else {
      const direction = to === 'name' ? 1 : -1
      const duration = to === 'name' ? 360 : 280
      run(
        outgoing,
        [
          { transform: 'translateX(0)', opacity: 1 },
          { transform: `translateX(${-direction * 100}%)`, opacity: 0 },
        ],
        duration,
      )
      run(
        incoming,
        [
          { transform: `translateX(${direction * 100}%)`, opacity: 0 },
          { transform: 'translateX(0)', opacity: 1 },
        ],
        duration,
      )
    }
    await Promise.allSettled(animations.map((animation) => animation.finished))
  } finally {
    cancel()
    signal.removeEventListener('abort', cancel)
    preference.removeEventListener('change', reduce)
  }
}
