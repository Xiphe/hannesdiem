// Canvas study of A's flight: pinned sun, uneven light, fade at viewport edges.
import type { Escapes } from './escapes.ts'
export function createForest(
  image: HTMLImageElement,
  lightSource: { x: number; y: number },
  { setGlimmerSprite, trackGlimmer }: Escapes,
  signal: AbortSignal,
) {
  const photograph = document.createElement('canvas')
  const photoInk = photograph.getContext('2d')!
  let seed = 8129
  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0
    return (seed >>> 0) / 4294967296
  }
  const particles = Array.from({ length: 980 }, (_, id) => {
    const angle = random() * Math.PI * 2
    return {
      id,
      angle: angle + 0.27 * Math.sin(angle * 3),
      phase: random(),
      speed: 0.045 + random() * 0.055,
      brightness: 0.04 + random() ** 3 * 1.9,
      size: 0.45 + random() ** 2 * 2.1,
    }
  })
  const sprite = document.createElement('canvas')
  sprite.width = sprite.height = 48
  const brush = sprite.getContext('2d')!
  const glow = brush.createRadialGradient(24, 24, 0, 24, 24, 24)
  glow.addColorStop(0, '#fff9df')
  glow.addColorStop(0.1, '#ffeac6e0')
  glow.addColorStop(0.3, '#ffd19365')
  glow.addColorStop(1, '#ffb45b00')
  brush.fillStyle = glow
  brush.fillRect(0, 0, 48, 48)
  setGlimmerSprite(sprite)
  signal.addEventListener(
    'abort',
    () => {
      photograph.width = photograph.height = sprite.width = sprite.height = 0
    },
    { once: true },
  )

  return (
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
    seconds: number,
    clip: DOMRect,
  ) => {
    // Image-space light source from the archived forest study, centred exactly.
    const x = lightSource.x / 100,
      y = lightSource.y / 100
    const scale = Math.max(
      width / (2 * Math.min(x, 1 - x) * image.naturalWidth),
      height / (2 * Math.min(y, 1 - y) * image.naturalHeight),
    )
    // The photograph never animates. Crop/rasterize it once per backing size,
    // including SVG fixture images, rather than resampling the source per frame.
    const ratio = context.getTransform().a
    const rasterWidth = Math.round(width * ratio),
      rasterHeight = Math.round(height * ratio)
    if (photograph.width !== rasterWidth || photograph.height !== rasterHeight) {
      photograph.width = rasterWidth
      photograph.height = rasterHeight
      photoInk.setTransform(photograph.width / width, 0, 0, photograph.height / height, 0, 0)
      photoInk.drawImage(
        image,
        width / 2 - image.naturalWidth * scale * x,
        height / 2 - image.naturalHeight * scale * y,
        image.naturalWidth * scale,
        image.naturalHeight * scale,
      )
    }
    context.drawImage(photograph, 0, 0, width, height)
    context.globalCompositeOperation = 'screen'
    for (const particle of particles) {
      const dx = Math.cos(particle.angle),
        dy = Math.sin(particle.angle)
      const edge = 1 / Math.max(Math.abs(dx) / (width / 2), Math.abs(dy) / (height / 2))
      const life = (particle.phase + seconds * particle.speed) % 1
      const distance = life * edge * 1.08
      const px = width / 2 + dx * distance,
        py = height / 2 + dy * distance
      const edgeDistance = Math.min(px, width - px, py, height - py)
      const fade = Math.max(0, Math.min(1, edgeDistance / (Math.min(width, height) * 0.085)))
      const pocket =
        0.16 +
        0.84 *
          Math.max(0, Math.sin(particle.angle * 4 + life * 5) * Math.cos(life * 8 - particle.angle))
      const shimmer = 0.68 + 0.32 * Math.sin(seconds * 0.4 + particle.phase * 24) ** 2
      const alpha = Math.min(1, particle.brightness * 1.25 * fade * pocket * shimmer)
      const size = particle.size * 8
      trackGlimmer(particle.id, px, py, alpha, size, seconds)
      if (
        px + size / 2 < clip.left ||
        px - size / 2 > clip.right ||
        py + size / 2 < clip.top ||
        py - size / 2 > clip.bottom
      )
        continue
      context.globalAlpha = alpha
      context.drawImage(sprite, px - size / 2, py - size / 2, size, size)
    }
    context.globalAlpha = 1
    context.globalCompositeOperation = 'source-over'
  }
}
