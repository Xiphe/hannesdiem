// Fit a widening pyramid of native Cinzel lines. Motion belongs to CSS.
export function fitVerseRise(root: HTMLElement, signal: AbortSignal) {
  const rise = root.querySelector<HTMLElement>('.verse-rise')
  const calls = [...(rise?.querySelectorAll<HTMLElement>('.rise-call') ?? [])]
  const finale = rise?.closest<HTMLElement>('.verse-finale')
  const stage = finale?.querySelector<HTMLElement>('.verse-finale-stage')
  // Entry subjects stay in normal flow coordinates while the visible stack pins.
  const markers =
    finale && CSS.supports('timeline-scope: --rise-call')
      ? calls.map((call, index) => {
          const marker = document.createElement('div')
          marker.className = 'rise-entry-marker'
          marker.ariaHidden = 'true'
          marker.style.viewTimelineName = `--rise-call-${index}`
          call.style.setProperty('--rise-timeline', `--rise-call-${index}`)
          finale.appendChild(marker)
          return marker
        })
      : []
  if (markers.length)
    finale!.style.timelineScope = markers.map((marker) => marker.style.viewTimelineName).join(', ')
  const measure = document.createElement('canvas').getContext('2d')!
  signal.addEventListener(
    'abort',
    () => {
      rise?.style.removeProperty('--rise-width')
      finale?.style.removeProperty('timeline-scope')
      for (const marker of markers) marker.remove()
      for (const call of calls) call.style.removeProperty('--rise-timeline')
      for (const call of calls) call.style.removeProperty('--rise-font-size')
    },
    { once: true },
  )
  return () => {
    if (!rise || !calls.length || signal.aborted) return
    // Break the final call out of the reading column without stretching glyphs.
    const fullWidth = document.documentElement.clientWidth - 32
    rise.style.setProperty('--rise-width', `${fullWidth}px`)
    // Keep the small end legible on phones while still widening each row.
    const narrow = rise.clientWidth < 600
    const tip = narrow ? 0.58 : 0.38
    let nextSize = Infinity,
      nextWidth = Infinity
    for (let index = calls.length - 1; index >= 0; index--) {
      const call = calls[index]
      const style = getComputedStyle(call)
      measure.font = `${style.fontWeight} 100px ${style.fontFamily}`
      measure.fontKerning = 'normal'
      const metrics = measure.measureText(call.textContent!)
      const extent = Math.max(
        metrics.width,
        metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight,
      )
      const fraction = calls.length === 1 ? 1 : tip + ((1 - tip) * index) / (calls.length - 1)
      const available = index === calls.length - 1 ? fullWidth * 0.9 : call.clientWidth
      const width = Math.min((available - 2) * fraction, nextWidth * (narrow ? 0.9 : 0.82))
      const size = Math.min((width * 100) / extent, nextSize * (narrow ? 0.9 : 0.85))
      call.style.setProperty('--rise-font-size', `${size}px`)
      nextSize = size
      nextWidth = (size * extent) / 100
    }
    if (stage)
      markers.forEach((marker, index) => {
        const call = calls[index]
        const transform = new DOMMatrix(getComputedStyle(call).transform).m42
        const offset =
          call.getBoundingClientRect().top - stage.getBoundingClientRect().top - transform
        marker.style.top = `${offset}px`
        marker.style.height = `${call.getBoundingClientRect().height}px`
      })
  }
}
