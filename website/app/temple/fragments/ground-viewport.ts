import type { ClosingPace } from '../closing-pace.ts'

type Placement = {
  node: SVGSVGElement
  top: number
  height: number
  animation?: Animation
}

/** Keep document coordinates offscreen; only nearby SVGs acquire render layers. */
export function createGroundViewport(
  host: HTMLElement,
  field: HTMLElement,
  planes: readonly HTMLElement[],
  timeline: ScrollTimeline,
  signal: AbortSignal,
) {
  const ground = field.parentElement!
  let layers: Placement[][] = []
  let destinations: number[] = []
  let frame = 0
  let pace: ClosingPace | undefined

  function setPosition(
    node: HTMLElement | SVGSVGElement,
    name: 'top' | 'left' | 'width' | 'height',
    value: number,
  ) {
    const text = `${value}px`
    if (node.style[name] !== text) node.style[name] = text
  }

  function clear() {
    for (const layer of layers) for (const piece of layer) piece.animation?.cancel()
    for (const plane of planes) plane.replaceChildren()
    layers = []
  }

  function draw() {
    frame = 0
    const bounds = host.getBoundingClientRect()
    const top = Math.max(0, bounds.top)
    const height = Math.max(0, Math.min(innerHeight, bounds.bottom) - top)
    setPosition(ground, 'top', top)
    setPosition(ground, 'left', bounds.left)
    setPosition(ground, 'width', bounds.width)
    setPosition(ground, 'height', height)
    const origin = bounds.top + scrollY
    const range = Math.max(1, document.documentElement.scrollHeight - innerHeight)
    const scroll = Math.max(0, Math.min(range, scrollY))
    const progress = (pace?.groundAt(scroll) ?? scroll) / range
    const driftRate = pace?.groundRateAt(scroll) ?? 1
    for (const plane of planes)
      for (const animation of plane.getAnimations()) {
        if (animation.playbackRate !== driftRate) animation.updatePlaybackRate(driftRate)
      }
    // Native scrolling and the small ambient drift have breathing room before
    // the next scroll frame updates membership. Every plane still clips paint
    // to its viewport-sized box, including during a jump across the document.
    const margin = 320
    for (const [index, layer] of layers.entries()) {
      const plane = planes[index]
      const destination = destinations[index]
      let visibleIndex = 0
      for (const piece of layer) {
        const local = piece.top + origin - top
        const position = local + destination * progress
        if (height === 0 || position + piece.height < -margin || position > height + margin) {
          piece.animation?.cancel()
          piece.animation = undefined
          if (piece.node.parentElement === plane) piece.node.remove()
          continue
        }
        setPosition(piece.node, 'top', local)
        if (plane.children[visibleIndex] !== piece.node)
          plane.insertBefore(piece.node, plane.children[visibleIndex] ?? null)
        visibleIndex++
        // A fixed viewport removes the document's natural -scrollY movement.
        // Include it in each small SVG's native timeline alongside its depth.
        piece.animation ??= piece.node.animate(
          pace
            ? [
                { translate: '0px 0px', offset: 0 },
                ...pace.groundPoints.map(({ scroll, ground }) => ({
                  translate: `0px ${(destination * ground) / range}px`,
                  offset: scroll / range,
                })),
                { translate: `0px ${(destination * pace.groundAt(range)) / range}px`, offset: 1 },
              ]
            : [{ translate: '0px 0px' }, { translate: `0px ${destination}px` }],
          { timeline, duration: 'auto', fill: 'both' },
        )
      }
    }
  }

  function request() {
    if (!frame && !signal.aborted && !document.hidden) frame = requestAnimationFrame(draw)
  }
  window.addEventListener('scroll', request, { passive: true, signal })
  window.addEventListener('resize', request, { passive: true, signal })
  window.addEventListener('pageshow', request, { signal })
  document.addEventListener('visibilitychange', request, { signal })
  signal.addEventListener(
    'abort',
    () => {
      cancelAnimationFrame(frame)
      clear()
    },
    { once: true },
  )

  return {
    layout(
      staging: readonly HTMLElement[],
      distance: number,
      depths: readonly number[],
      clock?: ClosingPace,
    ) {
      clear()
      pace = clock
      layers = staging.map((plane) =>
        [...plane.children].map((node) => ({
          node: node as SVGSVGElement,
          top: parseFloat((node as SVGSVGElement).style.top),
          height: Number(node.getAttribute('height')),
        })),
      )
      destinations = depths.map((depth) => distance * (depth - 1))
      draw()
    },
  }
}
