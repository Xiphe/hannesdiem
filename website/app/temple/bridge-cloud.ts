import { createBridgeDust } from './bridge-dust.ts'
import { noise } from './atmosphere.ts'

type Bounds = { left: number; top: number; right: number; bottom: number }
const clamp = (value: number) => Math.max(0, Math.min(1, value))
const smooth = (value: number) => {
  const t = clamp(value)
  return t * t * (3 - 2 * t)
}

// A persistent, screen-space vapor field. New density forms around revealed
// ink; diffusion and slight upward transport let older density disperse.
// The canvas never changes its position or scale to follow the text.
export function createBridgeCloud(
  body: HTMLElement | null,
  ground: HTMLElement,
  signal: AbortSignal,
) {
  const canvas = document.createElement('canvas')
  canvas.className = 'bridge-cloud-canvas'
  canvas.ariaHidden = 'true'
  const ink = canvas.getContext('2d')!
  if (body) ground.appendChild(canvas)
  let density = new Float32Array(0),
    next = new Float32Array(0),
    texture = new Float32Array(0),
    tealDensity = new Float32Array(0),
    tealNext = new Float32Array(0),
    tealTexture = new Float32Array(0),
    redDensity = new Float32Array(0),
    redNext = new Float32Array(0),
    redTexture = new Float32Array(0)
  let frame: ImageData,
    width = 0,
    height = 0,
    viewWidth = 0,
    viewHeight = 0
  let last = -Infinity,
    alive = false,
    previous = ''
  const dust = body
    ? createBridgeDust(
        ground,
        signal,
        (u, v) => {
          if (!width || !height) return 0
          const at =
            Math.min(height - 1, Math.floor(v * height)) * width +
            Math.min(width - 1, Math.floor(u * width))
          return density[at] + tealDensity[at] * 0.4 + redDensity[at] * 0.35
        },
        (u, v, pick) => {
          const at =
            Math.min(height - 1, Math.floor(v * height)) * width +
            Math.min(width - 1, Math.floor(u * width))
          const base = density[at],
            teal = tealDensity[at] * 0.4,
            red = redDensity[at] * 0.35
          const selected = pick * (base + teal + red)
          return selected < base ? (texture[at] > 0.5 ? 1 : 0) : selected < base + teal ? 2 : 3
        },
      )
    : undefined
  signal.addEventListener(
    'abort',
    () => {
      canvas.remove()
      canvas.width = canvas.height = 0
      density =
        next =
        texture =
        tealDensity =
        tealNext =
        tealTexture =
        redDensity =
        redNext =
        redTexture =
          new Float32Array(0)
    },
    { once: true },
  )

  function resize() {
    if (viewWidth === innerWidth && viewHeight === innerHeight) return
    viewWidth = innerWidth
    viewHeight = innerHeight
    width = Math.min(192, Math.max(112, Math.round(viewWidth / 7)))
    height = Math.max(1, Math.min(320, Math.round((width * viewHeight) / viewWidth)))
    canvas.width = width
    canvas.height = height
    density = new Float32Array(width * height)
    next = new Float32Array(density.length)
    texture = new Float32Array(density.length)
    tealDensity = new Float32Array(density.length)
    tealNext = new Float32Array(density.length)
    tealTexture = new Float32Array(density.length)
    redDensity = new Float32Array(density.length)
    redNext = new Float32Array(density.length)
    redTexture = new Float32Array(density.length)
    frame = ink.createImageData(width, height)
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const u = (x / width) * 6,
          v = (y / width) * 6
        const warp = (noise(u * 0.7 + 31, v * 0.7 + 17) - 0.5) * 0.8
        texture[y * width + x] =
          noise(u + warp, v - warp) * 0.5 +
          noise(u * 3.1 + 47, v * 3.1 + warp) * 0.34 +
          noise(u * 8.3 + warp, v * 8.3 + 73) * 0.16
        tealTexture[y * width + x] =
          noise(u * 0.9 + 83 - warp, v * 0.9 + 29) * 0.55 +
          noise(u * 2.8 + 13, v * 2.8 + 61 + warp) * 0.3 +
          noise(u * 6.7 + 57, v * 6.7 + 7) * 0.15
        redTexture[y * width + x] =
          noise(u * 1.1 + 117 + warp, v * 1.1 + 89) * 0.5 +
          noise(u * 3.4 + 153 - warp, v * 3.4 + 43) * 0.34 +
          noise(u * 8.7 + 79, v * 8.7 + 131) * 0.16
      }
    previous = ''
  }

  return {
    draw(now: number, reduced: boolean, bounds: Bounds | null, light: boolean) {
      if (!body || signal.aborted) return false
      resize()
      let strength = 1
      // A little vapor can form ahead of the first letters. This still deposits
      // density in local cells, rather than translating an incoming picture.
      if (!bounds) {
        const first = body.querySelector<HTMLElement>('.bridge-body-copy')
        const track = first?.closest('.bridge-page')?.getBoundingClientRect()
        if (first && track && track.top > 0 && track.top < viewHeight * 0.7) {
          const rect = first.getBoundingClientRect()
          bounds = {
            left: rect.left,
            right: rect.left + Math.min(320, rect.width),
            top: rect.top,
            bottom: rect.top + 25,
          }
          strength = 0.35 * (1 - track.top / (viewHeight * 0.7))
        }
      }
      const key = `${bounds?.left}/${bounds?.top}/${bounds?.right}/${bounds?.bottom}/${light}/${strength}`
      if (reduced && key === previous) return false
      if (!reduced && now - last < 50) {
        dust?.draw(now, reduced, light)
        return alive || !!bounds
      }
      if (!alive && !bounds && key === previous) return false
      const dt = Math.min(0.1, Math.max(0.016, (now - last) / 1000))
      last = now
      previous = key
      const form = 1 - Math.exp(-dt / 0.24),
        disperse = 1 - Math.exp(-dt / 0.46),
        tealForm = 1 - Math.exp(-dt / 0.28),
        tealDisperse = 1 - Math.exp(-dt / 0.5),
        redForm = 1 - Math.exp(-dt / 0.3),
        redDisperse = 1 - Math.exp(-dt / 0.55)
      const centreX = bounds ? (bounds.left + bounds.right) / 2 : 0
      const centreY = bounds ? (bounds.top + bounds.bottom) / 2 : 0
      const radiusX = bounds ? (bounds.right - bounds.left) / 2 + 165 : 1
      const radiusY = bounds ? (bounds.bottom - bounds.top) / 2 + 130 : 1
      const lightness = light ? 1.05 : 1.1025
      let mass = 0
      for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++) {
          const at = y * width + x,
            grain = texture[at]
          const px = (x / (width - 1)) * viewWidth,
            py = (y / (height - 1)) * viewHeight
          const radius = Math.hypot((px - centreX) / radiusX, (py - centreY) / radiusY)
          const lobes = smooth((1 - radius + (grain - 0.5) * 0.85) / 0.5)
          const fibres = smooth((grain - 0.25) / 0.5)
          const breath = reduced ? 1 : 0.92 + 0.08 * Math.sin(now * 0.00028 + grain * 14 + x * 0.06)
          const target = bounds ? lobes * (0.32 + fibres * 0.68) * strength * breath : 0
          const left = density[at - (x > 0 ? 1 : 0)]
          const right = density[at + (x < width - 1 ? 1 : 0)]
          const above = density[at - (y > 0 ? width : 0)]
          const below = density[at + (y < height - 1 ? width : 0)]
          const drift = density[at] * 0.86 + (left + right + above + below) * 0.025 + below * 0.04
          const value = reduced
            ? target
            : drift + (target - drift) * (target > drift ? form : disperse)
          next[at] = value
          // Independent density and drift let teal wisps cross the original
          // field rather than tinting every existing patch the same way.
          const tealGrain = tealTexture[at]
          const tealLobes = smooth((1 - radius / 1.35 + (tealGrain - 0.5)) / 0.55)
          const tealFibres = smooth((tealGrain - 0.3) / 0.45)
          const tealBreath = reduced
            ? 1
            : 0.9 + 0.1 * Math.sin(now * 0.00021 + tealGrain * 19 + y * 0.07)
          const tealTarget = bounds
            ? tealLobes * (0.2 + tealFibres * 0.8) * strength * tealBreath
            : 0
          const tealLeft = tealDensity[at - (x > 0 ? 1 : 0)]
          const tealRight = tealDensity[at + (x < width - 1 ? 1 : 0)]
          const tealAbove = tealDensity[at - (y > 0 ? width : 0)]
          const tealBelow = tealDensity[at + (y < height - 1 ? width : 0)]
          const tealDrift =
            tealDensity[at] * 0.86 +
            (tealLeft + tealRight + tealAbove + tealBelow) * 0.025 +
            tealLeft * 0.04
          const tealValue = reduced
            ? tealTarget
            : tealDrift +
              (tealTarget - tealDrift) * (tealTarget > tealDrift ? tealForm : tealDisperse)
          tealNext[at] = tealValue
          const redGrain = redTexture[at]
          const redLobes = smooth((1 - radius / 1.12 + (redGrain - 0.5) * 0.9) / 0.55)
          const redFibres = smooth((redGrain - 0.3) / 0.5)
          const redBreath = reduced
            ? 1
            : 0.91 + 0.09 * Math.sin(now * 0.00025 + redGrain * 23 - x * 0.05)
          const redTarget = bounds ? redLobes * (0.18 + redFibres * 0.82) * strength * redBreath : 0
          const redLeft = redDensity[at - (x > 0 ? 1 : 0)]
          const redRight = redDensity[at + (x < width - 1 ? 1 : 0)]
          const redAbove = redDensity[at - (y > 0 ? width : 0)]
          const redBelow = redDensity[at + (y < height - 1 ? width : 0)]
          const redDrift =
            redDensity[at] * 0.86 +
            (redLeft + redRight + redAbove + redBelow) * 0.025 +
            redRight * 0.04
          const redValue = reduced
            ? redTarget
            : redDrift + (redTarget - redDrift) * (redTarget > redDrift ? redForm : redDisperse)
          redNext[at] = redValue
          const baseAlpha = (value * (light ? 155 : 215)) / 255
          const tealAlpha = (tealValue * (light ? 70 : 90)) / 255
          const redAlpha = (redValue * (light ? 60 : 75)) / 255
          const opacity = redAlpha + (tealAlpha + baseAlpha * (1 - tealAlpha)) * (1 - redAlpha)
          const alpha = Math.round(opacity * 255)
          mass += alpha
          const pixel = at * 4
          const tint = clamp((grain - 0.25) * 2)
          const blueRed = light ? 174 + tint * 10 : 10 + tint * 5
          const blueGreen = light ? 186 - tint * 8 : 16 - tint * 4
          const blueBlue = light ? 206 - tint * 7 : 25 - tint
          const original = opacity ? (baseAlpha * (1 - tealAlpha) * (1 - redAlpha)) / opacity : 0
          const teal = opacity ? (tealAlpha * (1 - redAlpha)) / opacity : 0
          const red = opacity ? redAlpha / opacity : 0
          frame.data[pixel] =
            (blueRed * original + (light ? 153 : 6) * teal + (light ? 203 : 31) * red) * lightness
          frame.data[pixel + 1] =
            (blueGreen * original + (light ? 190 : 29) * teal + (light ? 161 : 10) * red) *
            lightness
          frame.data[pixel + 2] =
            (blueBlue * original + (light ? 181 : 29) * teal + (light ? 172 : 18) * red) * lightness
          frame.data[pixel + 3] = alpha
        }
      ;[density, next] = [next, density]
      ;[tealDensity, tealNext] = [tealNext, tealDensity]
      ;[redDensity, redNext] = [redNext, redDensity]
      ink.putImageData(frame, 0, 0)
      dust?.draw(now, reduced, light)
      alive = mass > 100
      return !reduced && (alive || !!bounds)
    },
  }
}
