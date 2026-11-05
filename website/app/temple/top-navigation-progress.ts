import { mountNavigationScrub } from './top-navigation-scrub.ts'
import { navigationScrollStart } from './top-navigation-position.ts'

/** Painted scene bounds, including raised images and clipped irregular material. */
function visualBounds(node: Element) {
  const rect = node.getBoundingClientRect()
  // The page is initially visibility:hidden behind its loader. Measure its
  // eventual paint now; display:none elements still have no geometry.
  if (!rect.width || !rect.height || rect.right <= 0 || rect.left >= innerWidth) return
  let top = rect.top,
    bottom = rect.bottom
  const shape =
    node instanceof SVGSVGElement
      ? node.querySelector('path')
      : node instanceof SVGUseElement
        ? document.getElementById(node.getAttribute('href')?.slice(1) ?? '')
        : null
  if (node instanceof SVGSVGElement && !shape) return
  if (shape instanceof SVGGeometryElement) {
    const matrix = shape.getScreenCTM()
    if (matrix) {
      const length = shape.getTotalLength()
      const style = getComputedStyle(shape)
      const radius = style.stroke === 'none' ? 0 : (parseFloat(style.strokeWidth) || 0) / 2
      const stroke = radius * Math.hypot(matrix.b, matrix.d)
      const strokeX = radius * Math.hypot(matrix.a, matrix.c)
      top = Infinity
      bottom = -Infinity
      let before = new DOMPoint(
        shape.getPointAtLength(0).x,
        shape.getPointAtLength(0).y,
      ).matrixTransform(matrix)
      // Clip the contour against the screen sides: an offscreen high corner
      // must not announce a scene before any of its paint is actually visible.
      for (let i = 1; i <= 128; i++) {
        const p = shape.getPointAtLength((length * i) / 128)
        const after = new DOMPoint(p.x, p.y).matrixTransform(matrix)
        const dx = after.x - before.x
        const a = dx ? (-strokeX - before.x) / dx : 0
        const b = dx ? (innerWidth + strokeX - before.x) / dx : 1
        const low = Math.max(0, Math.min(a, b)),
          high = Math.min(1, Math.max(a, b))
        if ((dx || (before.x >= -strokeX && before.x <= innerWidth + strokeX)) && low <= high) {
          const y1 = before.y + (after.y - before.y) * low
          const y2 = before.y + (after.y - before.y) * high
          top = Math.min(top, y1 - stroke, y2 - stroke)
          bottom = Math.max(bottom, y1 + stroke, y2 + stroke)
        }
        before = after
      }
    }
  }
  for (
    let clip = node.parentElement?.closest('[data-nav-clip]');
    clip;
    clip = clip.parentElement?.closest('[data-nav-clip]')
  ) {
    const bounds = clip.getBoundingClientRect()
    top = Math.max(top, bounds.top)
    bottom = Math.min(bottom, bounds.bottom)
  }
  return top < bottom ? { top, bottom } : undefined
}

/** Facts occupy their words; verses occupy the complete gaps between words. */
export function mountNavigationProgress(host: HTMLElement, signal: AbortSignal) {
  const header = host.querySelector<HTMLElement>('.temple-top-navigation')
  const nav = header?.querySelector<HTMLElement>('.temple-nav-items')
  const progress = header?.querySelector<HTMLElement>('.temple-nav-progress')
  const fill = progress?.querySelector<HTMLElement>('span')
  const stage = host.querySelector<HTMLElement>('.temple-stage')
  if (!header || !nav || !progress || !fill || signal.aborted) return
  let layoutFrame = 0
  let scrollFrame = 0
  let animation: Animation | undefined
  let points: { at: number; value: number }[] = []
  let observed = new Set<Element>()
  const root = document.documentElement
  const draw = () => {
    scrollFrame = 0
    const position = scrollY
    let value = points[0]?.value ?? 0
    for (let i = 1; i < points.length; i++) {
      const before = points[i - 1],
        after = points[i]
      if (position < before.at) break
      const t = Math.max(0, Math.min(1, (position - before.at) / (after.at - before.at || 1)))
      value = before.value + (after.value - before.value) * t
      if (position <= after.at) break
    }
    progress.style.setProperty('--nav-progress', String(value))
    scrubber.follow()
  }
  const scroll = () => {
    if ((!animation || scrubber.active) && !scrollFrame) scrollFrame = requestAnimationFrame(draw)
  }
  const schedule = () => {
    if (!layoutFrame) layoutFrame = requestAnimationFrame(layout)
  }
  const scrubber = mountNavigationScrub(nav, signal, schedule)
  const observer = new ResizeObserver(schedule)
  function layout() {
    layoutFrame = 0
    if (signal.aborted) return
    const stops = [...nav!.querySelectorAll<HTMLAnchorElement>('[data-nav-stop]')]
    if (!stops.length) return
    scrubber.measure(stops)
    const navBounds = nav!.getBoundingClientRect()
    const headerBounds = header!.getBoundingClientRect()
    const navLeft = navBounds.left
    const x = (node: HTMLElement) => {
      const rect = node.getBoundingClientRect()
      return rect.left - navLeft + nav!.scrollLeft
    }
    const left = x(stops[0])
    const last = stops[stops.length - 1]
    const width = Math.max(1, x(last) + last.getBoundingClientRect().width - left)
    progress!.style.left = scrubber.active ? '0px' : `${navLeft - headerBounds.left + left}px`
    progress!.style.width = scrubber.active ? '100%' : `${width}px`
    progress!.style.bottom = scrubber.active ? '0px' : `${headerBounds.bottom - navBounds.bottom}px`
    const known: { node: HTMLAnchorElement; target: HTMLElement; anchor: HTMLElement }[] = []
    for (const node of stops) {
      const hash = node.getAttribute('href')
      const id = node.dataset.navTarget ?? (hash?.startsWith('#') ? hash.slice(1) : undefined)
      const target = id ? document.getElementById(id) : null
      // Mobile also follows the connected poem pieces after unfinished facts.
      if (!target) continue
      known.push({
        node,
        target: target.closest<HTMLElement>('.temple-practical-section') ?? target,
        anchor: target,
      })
    }
    const allScenes = known.map(({ node, target }) => {
      const visuals = [...target.querySelectorAll('[data-nav-visual]')]
      const bounds = visuals.map(visualBounds).filter((b) => b !== undefined)
      const fallback = target.getBoundingClientRect()
      return {
        node,
        target,
        visuals,
        top: scrollY + (bounds.length ? Math.min(...bounds.map((b) => b.top)) : fallback.top),
        bottom:
          scrollY + (bounds.length ? Math.max(...bounds.map((b) => b.bottom)) : fallback.bottom),
      }
    })
    const nextObserved = new Set<Element>([
      root,
      document.body,
      header!,
      nav!,
      ...(stage ? [stage, stage.parentElement!] : []),
      ...allScenes.flatMap(({ target, visuals }) => [target, ...visuals]),
    ])
    for (const node of observed) if (!nextObserved.has(node)) observer.unobserve(node)
    for (const node of nextObserved) if (!observed.has(node)) observer.observe(node)
    observed = nextObserved
    const range = Math.max(0, root.scrollHeight - root.clientHeight)
    const clamp = (n: number) => Math.max(0, Math.min(range, n))
    const inside = host.dataset.templeView === 'inside'
    const first = known[0]?.anchor
    // The return to the poem sits before Visit and belongs to no practical
    // section. Hold progress at its start until the normal first arrival.
    const contentStart =
      inside && first
        ? Math.ceil(
            clamp(
              scrollY +
                first.getBoundingClientRect().top -
                (parseFloat(getComputedStyle(first).scrollMarginTop) || 0),
            ),
          )
        : 0
    const contentPosition = (position: number) => Math.max(contentStart, clamp(position))
    const firstCentre = x(stops[0]) + stops[0].getBoundingClientRect().width / 2
    const mobilePoints = [{ at: contentStart, value: firstCentre }]
    for (const { node, top, bottom } of allScenes) {
      mobilePoints.push({
        at: contentPosition((top + bottom - innerHeight) / 2),
        value: x(node) + node.getBoundingClientRect().width / 2,
      })
    }
    const lastStop =
      host.dataset.templeView === 'inside' ? (known.at(-1)?.node ?? stops.at(-1)!) : stops.at(-1)!
    mobilePoints.push({
      at: range,
      value: x(lastStop) + lastStop.getBoundingClientRect().width / 2,
    })
    scrubber.layout(mobilePoints, stage ? clamp(navigationScrollStart(stage)) : contentStart)
    // Desktop keeps its original progress boundary at the first unfinished fact.
    const boundary = stops.findIndex((node) => !known.some((scene) => scene.node === node))
    const scenes = allScenes.filter(({ node }) => boundary < 0 || stops.indexOf(node) < boundary)
    points = [{ at: 0, value: 0 }]
    let endValue = 0
    for (let i = 0; i < scenes.length; i++) {
      const { node } = scenes[i]
      const index = stops.indexOf(node as HTMLAnchorElement)
      const verse = node.classList.contains('temple-nav-separator-link')
      const previousWord = stops[index - 1]
      const nextWord = stops[index + 1]
      const from = verse ? x(previousWord) + previousWord.getBoundingClientRect().width : x(node)
      const to = verse ? x(nextWord) : x(node) + node.getBoundingClientRect().width
      // Decorative gaps belong half to each neighboring practical section.
      const leading =
        inside && previousWord ? (x(previousWord) + previousWord.offsetWidth + x(node)) / 2 : from
      const trailing = inside && nextWord ? (x(node) + node.offsetWidth + x(nextWord)) / 2 : to
      const start = contentPosition(scenes[i].top - innerHeight)
      const end = Math.max(
        start,
        contentPosition(
          i + 1 < scenes.length
            ? scenes[i + 1].top - innerHeight
            : scenes[i].bottom - header!.offsetHeight,
        ),
      )
      endValue = (trailing - left) / width
      points.push({ at: start, value: (leading - left) / width }, { at: end, value: endValue })
    }
    points.push({ at: range, value: endValue })
    cancelAnimationFrame(scrollFrame)
    scrollFrame = 0
    animation?.cancel()
    animation = undefined
    if (typeof ScrollTimeline !== 'undefined' && range > 0 && !scrubber.active) {
      animation = fill!.animate(
        points.map(({ at, value }) => ({ offset: at / range, transform: `scaleX(${value})` })),
        {
          timeline: new ScrollTimeline({ source: root, axis: 'block' }),
          duration: 'auto',
          fill: 'both',
        },
      )
    } else {
      draw()
    }
  }
  // Prototype/CMX sections may arrive after the island connects; resolve their
  // targets again without adding per-scroll geometry reads.
  const changes = new MutationObserver((records) => {
    if (
      records.some(
        (record) =>
          record.type === 'attributes' ||
          (record.target instanceof Element &&
            (record.target.matches('.poem-pairs,[id]') ||
              record.target.closest('[data-nav-visual]'))),
      )
    )
      schedule()
  })
  changes.observe(host, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: [
      'href',
      'id',
      'data-location-ready',
      'data-material-ready',
      'data-nav-visual',
      'data-nav-clip',
    ],
  })
  window.addEventListener('resize', schedule, { passive: true, signal })
  window.addEventListener('scroll', scroll, { passive: true, signal })
  window.addEventListener('pageshow', schedule, { passive: true, signal })
  void document.fonts.ready.then(() => {
    if (!signal.aborted) schedule()
  })
  layout()
  signal.addEventListener(
    'abort',
    () => {
      observer.disconnect()
      changes.disconnect()
      animation?.cancel()
      cancelAnimationFrame(layoutFrame)
      cancelAnimationFrame(scrollFrame)
      progress.style.removeProperty('--nav-progress')
      progress.style.removeProperty('left')
      progress.style.removeProperty('width')
      progress.style.removeProperty('bottom')
    },
    { once: true },
  )
}
