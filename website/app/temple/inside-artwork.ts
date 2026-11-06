import type { OpeningProps } from './types.ts'
import { createEscapes } from './escapes.ts'
import { createForest } from './forest.ts'
import { createAtmosphere } from './atmosphere.ts'
import { createNavigationArtwork } from './top-navigation-artwork.ts'
import { colourCopy } from './copy-colour.ts'
import type { TypeFrame } from './typography.ts'
import { mountFragmentGround } from './fragments/ground.ts'
import { createVisibleAnimation } from './visible-animation.ts'

/** Share the header material and fragment ground without mounting a poem scene. */
export async function mountInsideArtwork(
  host: HTMLElement,
  props: OpeningProps,
  signal: AbortSignal,
  ready: () => void,
) {
  const image = new Image()
  image.src = props.image.src
  await Promise.all([
    image.decode(),
    document.fonts.load('800 30px Bricolage'),
    document.fonts.load('350 14px UnboundedCopy'),
    document.fonts.load('700 48px CinzelDecorative'),
  ])
  if (signal.aborted) return
  mountFragmentGround(host, [], signal)
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const appearance = matchMedia('(prefers-color-scheme: dark)')
  const escapes = createEscapes(signal)
  const forest = createForest(image, props.lightSource, escapes, signal)
  const mist = createAtmosphere(signal)
  let last = 0
  let elapsed = 0
  const { request } = createVisibleAnimation(signal, {
    draw,
    reset() {
      last = 0
    },
  })
  const navigation = createNavigationArtwork(host, signal, request, escapes)
  const copy = colourCopy(host, signal, request)
  const resize = () => {
    navigation?.resize()
    copy.resize()
    request()
  }
  const sync = () => {
    copy.setBase(
      getComputedStyle(host)
        .getPropertyValue(appearance.matches ? '--copy-ink-dark' : '--copy-ink-light')
        .trim(),
      !appearance.matches,
    )
    resize()
  }
  function draw(now: number) {
    if (!reduced.matches && last) elapsed += Math.min(0.05, (now - last) / 1000)
    last = now
    const frame: TypeFrame = {
      bounds: new DOMRect(0, 0, innerWidth, innerHeight),
      paintMaterial(ink, bounds) {
        ink.save()
        ink.translate(-bounds.left, -bounds.top)
        forest(ink, innerWidth, innerHeight, elapsed, bounds)
        mist(ink, innerWidth, innerHeight, elapsed)
        ink.restore()
      },
    }
    copy.draw(now, reduced.matches)
    navigation?.draw(now, frame)
    navigation?.paint(frame)
    if (!reduced.matches) request()
  }
  window.addEventListener('resize', resize, { passive: true, signal })
  window.addEventListener('scroll', request, { passive: true, signal })
  appearance.addEventListener('change', sync, { signal })
  reduced.addEventListener('change', request, { signal })
  sync()
  ready()
}
