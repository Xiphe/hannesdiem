import { createTypeSurface, type TypeFrame } from './typography.ts'
import type { Escapes } from './escapes.ts'
import { paintNavigationDate } from './navigation-date-material.ts'

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
  const appearance = matchMedia('(prefers-color-scheme: dark)')
  appearance.addEventListener('change', request, { signal })
  const visible = () =>
    !header.hasAttribute('data-nav-mounted') || header.hasAttribute('data-nav-visible')
  const layers = [title, header.querySelector<HTMLElement>('.temple-nav-date')]
    .filter((node): node is HTMLElement => !!node)
    .map((node) => {
      const canvas = node.querySelector('canvas')!
      const ink = createTypeSurface(
        canvas,
        [node.querySelector<HTMLElement>('.temple-nav-title-ink, .temple-nav-date-ink')!],
        signal,
        request,
        // Sampling the scene centre must not create portals at unrelated screen positions.
        { ...escapes, addPortal: () => {} },
      )
      return { node, canvas, ink }
    })
  const observer = new ResizeObserver(() => {
    for (const { ink } of layers) ink.resize()
    request()
  })
  for (const { node } of layers) observer.observe(node)
  const visibility = new MutationObserver(request)
  visibility.observe(header, { attributes: true, attributeFilter: ['data-nav-visible'] })
  signal.addEventListener(
    'abort',
    () => {
      observer.disconnect()
      visibility.disconnect()
      for (const { node } of layers) node.removeAttribute('data-ink-ready')
    },
    { once: true },
  )
  return {
    resize: () => {
      for (const { ink } of layers) ink.resize()
    },
    draw(now: number, frame: TypeFrame) {
      if (!visible()) return false
      let active = false
      for (const { ink } of layers) active = ink.draw(frame, now) || active
      return active
    },
    paint(frame: TypeFrame) {
      if (!visible()) return
      const bounds = layers.map(({ canvas }) => canvas.getBoundingClientRect())
      const left = Math.min(...bounds.map((rect) => rect.left))
      const top = Math.min(...bounds.map((rect) => rect.top))
      const width = Math.max(...bounds.map((rect) => rect.right)) - left
      const height = Math.max(...bounds.map((rect) => rect.bottom)) - top
      const scale = Math.max(0.4, width / frame.bounds.width, height / frame.bounds.height)
      for (const { node, ink } of layers) {
        ink.paint({
          ...frame,
          paintMaterial(context, bounds) {
            // The sun and travelling glimmers remain legible at wordmark size.
            // Reuse the same material and time instead of mounting another scene.
            context.save()
            context.scale(scale, scale)
            frame.paintMaterial(
              context,
              new DOMRect(
                (frame.bounds.width - width / scale) / 2 + (bounds.left - left) / scale,
                (frame.bounds.height - height / scale) / 2 + (bounds.top - top) / scale,
                bounds.width / scale,
                bounds.height / scale,
              ),
            )
            context.restore()
            if (node.classList.contains('temple-nav-date')) {
              paintNavigationDate(context, bounds.width, bounds.height, appearance.matches)
            }
          },
        })
        node.dataset.inkReady = ''
      }
    },
  }
}
