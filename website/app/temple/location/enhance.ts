import type { LocationProps } from '../types.ts'
import { fragmentStroke } from '../fragment-button/material.ts'
import { copyInkColour } from '../copy-palette.ts'
import { defaults } from '../defaults.ts'
import { mapPiece, textPiece } from './material.ts'
import { mapLink, projectVenue } from './maps.ts'

/** The location owns only its material layout and scroll-driven map camera. */
export function mountLocation(host: HTMLElement, props: LocationProps, signal: AbortSignal) {
  const section = host.querySelector<HTMLElement>('.facts-grid')
  if (!section || signal.aborted) return
  const root = section
  root.querySelector('[data-map-link]')!.setAttribute('href', mapLink(props.venue, navigator))
  const point = projectVenue(props.venue)
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const gradient = root.querySelector(`#${props.id}-ink`)!
  gradient.setAttribute('gradientUnits', 'userSpaceOnUse')
  for (const [key, value] of Object.entries({ x1: '-1000', y1: '-400', x2: '2300', y2: '1000' }))
    gradient.setAttribute(key, value)
  const style = getComputedStyle(host)
  const rgb = (value: string) =>
    [1, 3, 5].map((index) => parseInt(value.trim().slice(index, index + 2), 16))
  const lightInk = rgb(style.getPropertyValue('--copy-ink-light'))
  const darkInk = rgb(style.getPropertyValue('--copy-ink-dark'))
  gradient.innerHTML = [-defaults.copyVariance * 0.6, 0, defaults.copyVariance * 0.6]
    .map(
      (shade, index) =>
        `<stop offset="${index / 2}" style="stop-color:light-dark(${copyInkColour(lightInk, shade, true)},${copyInkColour(darkInk, shade, false)})"/>`,
    )
    .join('')
  const slots = [...root.querySelectorAll<HTMLElement>('.fact-slot')]
  const mapSlot = root.querySelector<HTMLElement>('.map-slot')!
  const camera = root.querySelector<SVGGElement>('[data-map-camera]')!
  const marker = root.querySelector<SVGGElement>('[data-pin-scale]')!
  const mapSurface = root.querySelector<SVGUseElement>('.map-water')!
  let parallax: Animation | undefined
  function layoutParallax() {
    parallax?.cancel()
    parallax = undefined
    if (reduced.matches || typeof ViewTimeline === 'undefined') return
    const distance = Math.min(80, innerHeight * 0.075)
    parallax = mapSlot
      .querySelector<HTMLElement>('.fact-flight')!
      .animate(
        [{ transform: `translateY(${-distance}px)` }, { transform: `translateY(${distance}px)` }],
        {
          timeline: new ViewTimeline({ subject: mapSlot, axis: 'block' }),
          duration: 'auto',
          fill: 'both',
          easing: 'linear',
        },
      )
  }
  let cameraFrame = 0
  function updateMap() {
    cameraFrame = 0
    const rect = mapSurface.getBoundingClientRect()
    const progress = (innerHeight - rect.top) / (innerHeight + rect.height)
    const raw = reduced.matches ? 0 : Math.max(0, Math.min(1, (progress - 0.2) / 0.8))
    const t = raw * raw
    // Begin with regional context and move closer without carrying the pin
    // toward the edge of the fragment.
    const zoom = 0.55 + 4.65 * t
    // Zoom around the venue, keeping its pin planted in the right-hand lobe.
    const x = 500 - point.x * zoom
    const y = 500 - point.y * zoom
    // Set SVG transforms directly: WebKit can leave scroll-timeline SVG transforms
    // stale. Only these two nodes update, once per scroll frame; no idle map loop.
    camera.style.transform = `translate(${x}px, ${y}px) scale(${zoom})`
    marker.style.transform = `scale(${(1.04 + 0.208 * t) / zoom})`
  }
  function scheduleMap() {
    if (!cameraFrame) cameraFrame = requestAnimationFrame(updateMap)
  }
  addEventListener('scroll', scheduleMap, { passive: true, signal: signal })
  const materials = [...root.querySelectorAll<HTMLElement>('.fact-solid')].map((solid, i) => ({
    solid,
    face: solid.querySelector<HTMLElement>('.tile-face')!,
    svg: solid.querySelector<SVGSVGElement>('.tile-material')!,
    piece: i === 0 ? mapPiece : textPiece,
    index: [3, 2][i],
    angle: [0, 8][i],
  }))
  const samples = document.createElement('canvas').getContext('2d')!
  for (const material of materials) {
    const tone = 10 + material.index
    const id = `${props.id}-material-${material.index}`
    const isMap = material.face.classList.contains('map-face')
    const colour = (n: number) =>
      isMap
        ? `light-dark(rgb(${211 + n} ${207 + n} ${201 + n}),rgb(${40 + n} ${38 + n} ${36 + n}))`
        : `light-dark(rgb(${237 - tone + n} ${226 - tone + n} ${213 - tone + n}),rgb(${tone + 7 + n} ${tone + 8 + n} ${tone + 7 + n}))`
    if (isMap) root.querySelector('.map-water')!.setAttribute('fill', `url(#${id})`)
    material.svg.innerHTML = `<defs><linearGradient id="${id}" x1="0%" y1="0%" x2="100%" y2="100%"><stop style="stop-color:${colour(2)}"/><stop offset="1" style="stop-color:${colour(-2)}"/></linearGradient></defs><g transform="rotate(${material.angle})"><path d="${material.piece.d}" fill="url(#${id})" stroke="${isMap ? 'none' : `url(#${id})`}" stroke-width="${fragmentStroke}" stroke-linejoin="round" stroke-linecap="round"/></g>`
  }
  function fitMaterials() {
    for (const { face, svg, piece, angle } of materials) {
      const path = new Path2D()
      path.addPath(new Path2D(piece.d!), new DOMMatrix().rotate(angle))
      const source = svg.querySelector('path')!
      const length = source.getTotalLength()
      const points = Array.from({ length: 100 }, (_, i) => {
        const p = source.getPointAtLength((i * length) / 100)
        return new DOMPoint(p.x, p.y).matrixTransform(new DOMMatrix().rotate(angle))
      })
      const isMap = face.classList.contains('map-face')
      const exactMap = isMap ? source.getBBox() : undefined
      const left = exactMap?.x ?? Math.min(...points.map((p) => p.x)),
        top = exactMap?.y ?? Math.min(...points.map((p) => p.y))
      const width = exactMap?.width ?? Math.max(...points.map((p) => p.x)) - left,
        height = exactMap?.height ?? Math.max(...points.map((p) => p.y)) - top
      const desktop = matchMedia('(min-width: 761px)').matches
      const mapScale =
        Math.min(face.clientWidth / (width + 4), face.clientHeight / (height + 4)) *
        (desktop ? 1.7 : 1.4)
      const overflow = (width + 4) * mapScale - face.clientWidth
      const copy = root.querySelector<HTMLElement>('.tile-copy')!
      const textLeft =
        copy.getBoundingClientRect().left + parseFloat(getComputedStyle(copy).paddingLeft)
      // Anchor the visible contour, not the SVG's invisible viewBox padding.
      const mapLeft = desktop
        ? textLeft - 70 - face.getBoundingClientRect().left - (width + 2) * mapScale
        : -overflow
      const visibleLeft =
        left - 2 + Math.max(0, -face.getBoundingClientRect().left - mapLeft) / mapScale
      const ratio = (face.clientWidth + 16) / (face.clientHeight + 16)
      let best = { x: 0, y: 0, h: 0 }
      // Find a clear reading region inside the unchanged irregular silhouette.
      // This sizes the material uniformly; it never makes its contour a rectangle.
      for (let iy = 1; iy < 18; iy++)
        for (let ix = 1; ix < 18; ix++) {
          const x = left + (width * ix) / 18,
            y = top + (height * iy) / 18
          if (!samples.isPointInPath(path, x, y)) continue
          let low = 0,
            high = Math.min(height, width / ratio)
          for (let step = 0; step < 9; step++) {
            const h = (low + high) / 2,
              w = h * ratio
            let inside = true
            for (let edge = 0; edge <= 8 && inside; edge++) {
              const t = edge / 8
              for (const [px, py] of [
                [x - w / 2 + w * t, y - h / 2],
                [x - w / 2 + w * t, y + h / 2],
                [x - w / 2, y - h / 2 + h * t],
                [x + w / 2, y - h / 2 + h * t],
              ]) {
                if (!samples.isPointInPath(path, px, py) || (isMap && px < visibleLeft)) {
                  inside = false
                  break
                }
              }
            }
            if (inside) low = h
            else high = h
          }
          if (low > best.h) best = { x, y, h: low }
        }
      const scale = isMap ? mapScale : (face.clientHeight + 16) / best.h
      const minX = left - 2,
        minY = top - 2
      svg.setAttribute('viewBox', `${minX} ${minY} ${width + 4} ${height + 4}`)
      svg.style.width = `${(width + 4) * scale}px`
      svg.style.height = `${(height + 4) * scale}px`
      svg.style.left = `${face.clientWidth / 2 - (best.x - minX) * scale}px`
      svg.style.top = `${face.clientHeight / 2 - (best.y - minY) * scale}px`
      if (isMap) {
        svg.style.left = `${mapLeft}px`
        if (desktop) {
          // Align the visible contour with the prose, rather than the map slot's
          // invisible box. Native parallax can still drift gently around this.
          const textSlot = root.querySelector<HTMLElement>('.text-slot')!
          const textSolid = textSlot.querySelector<HTMLElement>('.text-solid')!
          const proseBottom =
            textSlot.offsetTop +
            textSolid.offsetTop +
            copy.offsetHeight -
            parseFloat(getComputedStyle(copy).paddingBottom)
          svg.style.top = `${proseBottom - mapSlot.offsetTop - (height + 2) * scale}px`
        } else {
          // Put the visible contour near the opener, rather than centring it in
          // a tall empty slot. The SVG itself includes two units of padding.
          svg.style.top = `${16 - 2 * scale}px`
        }
        const map = face.querySelector<SVGSVGElement>('.location-map')!
        map.setAttribute('viewBox', svg.getAttribute('viewBox')!)
        for (const property of ['width', 'height', 'left', 'top'] as const)
          map.style[property] = svg.style[property]
        const contour = map.querySelector('[data-map-contour]')!
        contour.setAttribute('d', piece.d!)
        contour.setAttribute('transform', `rotate(${angle})`)
        const unit = (Math.min(best.h, best.h * ratio) * 1.65) / 1000
        // The concave left half narrows; the broad right lobe holds the pin.
        const focusX = left + width * 0.76
        const focusY = top + height * 0.46
        map
          .querySelector('[data-map-frame]')!
          .setAttribute(
            'transform',
            `translate(${focusX - 500 * unit} ${focusY - 500 * unit}) scale(${unit})`,
          )
      }
    }
  }
  const observer = new ResizeObserver(() => {
    fitMaterials()
    layoutParallax()
    scheduleMap()
    root.dataset.locationReady = ''
  })

  slots.forEach((slot) => observer.observe(slot))
  materials.forEach(({ face }) => observer.observe(face))
  reduced.addEventListener(
    'change',
    () => {
      layoutParallax()
      scheduleMap()
    },
    { signal: signal },
  )
  signal.addEventListener(
    'abort',
    () => {
      delete root.dataset.locationReady
      observer.disconnect()
      cancelAnimationFrame(cameraFrame)
      parallax?.cancel()
    },
    { once: true },
  )
}
