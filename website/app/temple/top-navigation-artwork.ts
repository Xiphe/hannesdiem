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
  const canvas = title.querySelector('canvas')!
  const appearance = matchMedia('(prefers-color-scheme: dark)')
  const style = getComputedStyle(host)
  const lightInk = style.getPropertyValue('--copy-ink-light').trim()
  const darkInk = style.getPropertyValue('--copy-ink-dark').trim()
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
  signal.addEventListener(
    'abort',
    () => {
      observer.disconnect()
      title.removeAttribute('data-ink-ready')
    },
    { once: true },
  )
  return {
    resize: () => ink.resize(),
    draw: (now: number, frame: TypeFrame) => ink.draw(frame, now),
    paint(frame: TypeFrame) {
      const rect = canvas.getBoundingClientRect()
      if (rect.top >= innerHeight || rect.bottom <= 0) return
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
          // Keep the photographic detail readable in a small navigation label.
          context.save()
          context.globalCompositeOperation = appearance.matches ? 'screen' : 'multiply'
          context.globalAlpha = 0.65
          context.fillStyle = appearance.matches ? darkInk : lightInk
          context.fillRect(0, 0, bounds.width, bounds.height)
          context.restore()
        },
      })
      title.dataset.inkReady = ''
    },
  }
}
