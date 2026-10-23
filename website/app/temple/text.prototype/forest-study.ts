// Canvas study of A's flight: pinned sun, uneven light, fade at viewport edges.
export function createForestStudy(image: HTMLImageElement, lightSource: { x: number; y: number }) {
  let seed = 8129
  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0
    return (seed >>> 0) / 4294967296
  }
  const particles = Array.from({ length: 980 }, () => {
    const angle = random() * Math.PI * 2
    return {
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

  return (
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
    seconds: number,
    influence?: (x: number, y: number) => { x: number; y: number; light: number },
    photograph = true,
  ) => {
    // Image-space light source from the archived forest study, centred exactly.
    const x = lightSource.x / 100,
      y = lightSource.y / 100
    const scale = Math.max(
      width / (2 * Math.min(x, 1 - x) * image.naturalWidth),
      height / (2 * Math.min(y, 1 - y) * image.naturalHeight),
    )
    if (photograph)
      context.drawImage(
        image,
        width / 2 - image.naturalWidth * scale * x,
        height / 2 - image.naturalHeight * scale * y,
        image.naturalWidth * scale,
        image.naturalHeight * scale,
      )
    context.globalCompositeOperation = 'screen'
    for (const particle of particles) {
      const dx = Math.cos(particle.angle),
        dy = Math.sin(particle.angle)
      const edge = 1 / Math.max(Math.abs(dx) / (width / 2), Math.abs(dy) / (height / 2))
      const life = (particle.phase + seconds * particle.speed) % 1
      const distance = life * edge * 1.08
      let px = width / 2 + dx * distance,
        py = height / 2 + dy * distance
      const field = influence?.(px, py)
      px += field?.x ?? 0
      py += field?.y ?? 0
      const edgeDistance = Math.min(px, width - px, py, height - py)
      const fade = Math.max(0, Math.min(1, edgeDistance / (Math.min(width, height) * 0.085)))
      const pocket =
        0.16 +
        0.84 *
          Math.max(0, Math.sin(particle.angle * 4 + life * 5) * Math.cos(life * 8 - particle.angle))
      const shimmer = 0.68 + 0.32 * Math.sin(seconds * 0.4 + particle.phase * 24) ** 2
      context.globalAlpha = Math.min(
        1,
        particle.brightness * fade * pocket * shimmer * (1 + (field?.light ?? 0)),
      )
      const size = particle.size * 8
      context.drawImage(sprite, px - size / 2, py - size / 2, size, size)
    }
    context.globalAlpha = 1
    context.globalCompositeOperation = 'source-over'
  }
}
