import { createTypeSurface, type TypeFrame } from './typography.ts'
import type { Escapes } from './escapes.ts'

/** A small native text mask, painted by the existing opener/chorus clock. */
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
    resize: () => ink.resize(),
    draw: (now: number, frame: TypeFrame) => visible() && ink.draw(frame, now),
    paint(frame: TypeFrame) {
      const rect = canvas.getBoundingClientRect()
      if (!visible() || rect.top >= innerHeight || rect.bottom <= 0) return
      ink.paint({
        ...frame,
        paintMaterial(context, bounds) {
          // The sun and travelling glimmers remain legible at wordmark size.
          // Reuse the same material and time instead of mounting another scene.
          const scale = 0.4
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
