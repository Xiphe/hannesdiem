import { createGlimmerSprite } from './glimmer-sprite.ts'

// Crisp glimmers above the low-resolution vapor, on the same scene clock.
// Sample the live density directly so empty space never becomes a star field.
export function createBridgeDust(
  ground: HTMLElement,
  signal: AbortSignal,
  density: (u: number, v: number) => number,
  tone: (u: number, v: number, pick: number) => number,
) {
  const canvas = document.createElement('canvas')
  canvas.className = 'bridge-dust-canvas'
  canvas.ariaHidden = 'true'
  ground.appendChild(canvas)
  const ink = canvas.getContext('2d')!
  const palettes = [
    [
      ['#d7e7ff', '#9dbffff0', '#7195e780', '#628bd500'],
      ['#e9ddff', '#c1a4fff0', '#a180d780', '#926bc800'],
      ['#d2fff1', '#7ad7c6f0', '#56b3ab80', '#409e9e00'],
      ['#ffe0e6', '#d9a0aff0', '#bc7b9480', '#ae6b8100'],
    ],
    [
      ['#fbfdff', '#e9f2fff0', '#d7e5ff80', '#d7e5ff00'],
      ['#fefbff', '#f2eafff0', '#e9d9ff80', '#e9d9ff00'],
      ['#f9fffd', '#e7fff7f0', '#d4f5ec80', '#d4f5ec00'],
      ['#fffafb', '#fff0f4f0', '#f7dfe780', '#f7dfe700'],
    ],
  ] as const
  const sprites = palettes.map((palette) =>
    palette.map((colors) => createGlimmerSprite(false, colors)),
  )
  let seed = 53117
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0
    return (seed >>> 0) / 4294967296
  }
  const particles = Array.from({ length: 320 }, () => ({
    u: random(),
    v: random(),
    phase: random() * Math.PI * 2,
    speed: 0.0015 + random() * 0.003,
    size: 3 + random() ** 2 * 9,
    brightness: 0.09 + random() ** 3 * 0.72,
    tint: random(),
  }))
  let width = 0,
    height = 0,
    ratio = 0
  signal.addEventListener(
    'abort',
    () => {
      canvas.remove()
      canvas.width = canvas.height = 0
      sprites.flat().forEach((sprite) => {
        sprite.width = sprite.height = 0
      })
    },
    { once: true },
  )
  return {
    draw(now: number, reduced: boolean, light: boolean) {
      if (signal.aborted) return
      const nextRatio = Math.min(2, devicePixelRatio || 1)
      if (width !== innerWidth || height !== innerHeight || ratio !== nextRatio) {
        width = innerWidth
        height = innerHeight
        ratio = nextRatio
        canvas.width = Math.round(width * ratio)
        canvas.height = Math.round(height * ratio)
        ink.setTransform(ratio, 0, 0, ratio, 0, 0)
      }
      ink.clearRect(0, 0, width, height)
      ink.globalCompositeOperation = light ? 'source-over' : 'screen'
      const time = reduced ? 0 : now / 1000
      const count = Math.min(particles.length, Math.max(85, Math.round((width * height) / 3800)))
      for (let i = 0; i < count; i++) {
        const p = particles[i]
        const u = p.u + Math.sin(time * 0.15 + p.phase) * 0.016
        const v = (((p.v - time * p.speed) % 1) + 1) % 1
        if (u < 0 || u > 1) continue
        const vapor = Math.min(1, density(u, v) * 2.2)
        if (vapor < 0.025) continue
        const shimmer = reduced
          ? 0.55
          : 0.28 + 0.72 * Math.max(0, Math.sin(time * (0.8 + p.speed * 100) + p.phase)) ** 6
        const brightness = vapor * p.brightness * shimmer
        ink.globalAlpha = light ? Math.min(0.95, brightness * 3.2) : brightness
        const x = u * width,
          y = v * height
        ink.drawImage(
          sprites[light ? 1 : 0][tone(u, v, p.tint)],
          x - p.size / 2,
          y - p.size / 2,
          p.size,
          p.size,
        )
        if (light) {
          // A sharp white centre survives on pale paper; the existing sprite
          // provides the soft, cloud-tinted halo around it.
          ink.fillStyle = '#fff'
          ink.beginPath()
          ink.arc(x, y, 0.6 + p.size * 0.02, 0, Math.PI * 2)
          ink.fill()
        }
      }
      ink.globalAlpha = 1
      ink.globalCompositeOperation = 'source-over'
    },
  }
}
