import { createTypeSurface, type TypeFrame } from './typography.ts'
import type { Escapes } from './escapes.ts'

/** The wordmark shares the existing opener/chorus clock. Dates stay native text. */
export function createNavigationArtwork(
  host: HTMLElement,
  signal: AbortSignal,
  request: () => void,
  escapes: Escapes,
) {
  const title = host.querySelector<HTMLElement>('.temple-nav-title')
  if (!title) return
  const header = title.closest('header')!
  const visible = () =>
    !header.hasAttribute('data-nav-mounted') || header.hasAttribute('data-nav-visible')
  const canvas = title.querySelector('canvas')!
  const ink = createTypeSurface(
    canvas,
    [title.querySelector<HTMLElement>('.temple-nav-title-ink')!],
    signal,
    request,
    // Sampling the scene centre must not create portals at unrelated screen positions.
    { ...escapes, addPortal: () => {} },
  )
  const observer = new ResizeObserver(() => {
    ink.resize()
    request()
  })
  observer.observe(title)
  const visibility = new MutationObserver(request)
  visibility.observe(header, { attributes: true, attributeFilter: ['data-nav-visible'] })
  signal.addEventListener(
    'abort',
    () => {
      observer.disconnect()
      visibility.disconnect()
      title.removeAttribute('data-ink-ready')
    },
    { once: true },
  )
  return {
    resize: ink.resize,
    draw(now: number, frame: TypeFrame) {
      return visible() ? ink.draw(frame, now) : false
    },
    paint(frame: TypeFrame) {
      if (!visible()) return
      const bounds = canvas.getBoundingClientRect()
      const scale = Math.max(
        0.4,
        bounds.width / frame.bounds.width,
        bounds.height / frame.bounds.height,
      )
      ink.paint({
        ...frame,
        paintMaterial(context) {
          context.save()
          context.scale(scale, scale)
          frame.paintMaterial(
            context,
            new DOMRect(
              (frame.bounds.width - bounds.width / scale) / 2,
              (frame.bounds.height - bounds.height / scale) / 2,
              bounds.width / scale,
              bounds.height / scale,
            ),
          )
          context.restore()
        },
      })
      title.dataset.inkReady = ''
    },
  }
}
