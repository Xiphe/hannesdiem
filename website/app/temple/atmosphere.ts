// Broad, mixed-colour cloud field with bounded optical density.
import { defaults } from './defaults.ts'
const size = 128
const values = new Float32Array(size * size)
let state = 97231
for (let i = 0; i < values.length; i++) {
  state = (Math.imul(state, 1664525) + 1013904223) | 0
  values[i] = (state >>> 0) / 4294967296
}
const smooth = (n: number) => {
  const t = Math.max(0, Math.min(1, n))
  return t * t * (3 - 2 * t)
}
export function noise(x: number, y: number) {
  const ix = Math.floor(x),
    iy = Math.floor(y),
    sx = smooth(x - ix),
    sy = smooth(y - iy)
  const a =
    values[(iy & 127) * size + (ix & 127)] * (1 - sx) +
    values[(iy & 127) * size + ((ix + 1) & 127)] * sx
  const b =
    values[((iy + 1) & 127) * size + (ix & 127)] * (1 - sx) +
    values[((iy + 1) & 127) * size + ((ix + 1) & 127)] * sx
  return a * (1 - sy) + b * sy
}
export function createAtmosphere(signal: AbortSignal) {
  const mist = {
    hues: [...defaults.mistHues],
    intensity: defaults.mistIntensity,
    highlights: defaults.mistHighlights,
  }
  const field = document.createElement('canvas')
  const ink = field.getContext('2d')!
  // Prepare cloud structure once. Animation only moves/blends these small textures;
  // no per-pixel noise calculation in the scroll/render loop.
  const clouds = mist.hues.map(() => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 256
    const context = canvas.getContext('2d')!
    const pixels = context.createImageData(256, 256)
    const ox = Math.random() * 100,
      oy = Math.random() * 100
    for (let y = 0; y < 256; y++)
      for (let x = 0; x < 256; x++) {
        const u = x / 256,
          v = y / 256
        const wx = (noise(u * 1.1 + ox, v * 0.9 + oy) - 0.5) * 0.85
        const wy = (noise(u * 0.9 + ox + 19, v * 1.2 + oy) - 0.5) * 0.65
        const broad = noise(u * 4.8 + wx + ox, v * 4.2 + wy + oy + 11)
        const detail = noise(u * 26 + wx * 3 + ox, v * 22 + wy * 3 + oy + 29)
        const fine = noise(u * 76 + wx * 4 + ox, v * 58 + wy * 4 + oy + 53)
        const cloud = smooth((broad * 0.58 + detail * 0.3 + fine * 0.12 - 0.2) / 0.56)
        const billows = smooth((detail - 0.25) / 0.55)
        const wisps = (1 - Math.abs((detail * 0.6 + fine * 0.4) * 2 - 1)) ** 5
        const density = smooth(
          (cloud * (0.35 + 0.65 * billows) * (0.55 + 0.45 * wisps) - 0.12) / 0.4,
        )
        pixels.data[(y * 256 + x) * 4 + 3] = Math.round(255 * (0.04 + 0.095 * density))
      }
    return { canvas, context, pixels, hue: -1, x: ox, y: oy }
  })
  function paintField(width: number, height: number, seconds: number) {
    const w = Math.min(256, Math.round(width)),
      h = Math.max(1, Math.min(512, Math.round((w * height) / width)))
    if (field.width !== w || field.height !== h) {
      field.width = w
      field.height = h
    }
    ink.clearRect(0, 0, w, h)
    clouds.forEach((cloud, i) => {
      const hue = mist.hues[i]
      if (cloud.hue !== hue) {
        cloud.hue = hue
        const colour = [255, (255 * hue) / 60, 10 + (30 * hue) / 60]
        for (let at = 0; at < cloud.pixels.data.length; at += 4)
          for (let c = 0; c < 3; c++) cloud.pixels.data[at + c] = Math.round(colour[c])
        cloud.context.putImageData(cloud.pixels, 0, 0)
      }
      // Each colour follows its own non-repeating route; no colour owns a side.
      const x = (noise(cloud.x + seconds * 0.1, cloud.y) - 0.5) * w
      const y = (noise(cloud.x + 31, cloud.y + seconds * 0.085) - 0.5) * h
      ink.drawImage(cloud.canvas, -w / 2 + x, -h / 2 + y, w * 2, h * 2)
    })
    // Three overlapping layers stay below36% opacity; protect the photographic sun.
    ink.save()
    ink.globalCompositeOperation = 'destination-out'
    const sun = ink.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.min(w, h) * 0.32)
    sun.addColorStop(0, '#0009')
    sun.addColorStop(1, '#0000')
    ink.fillStyle = sun
    ink.fillRect(0, 0, w, h)
    ink.restore()
  }
  // Local light flecks drift inside the outer fog instead of radiating from the sun.
  const light = document.createElement('canvas')
  light.width = light.height = 96
  const lightInk = light.getContext('2d')!
  const lightPixels = lightInk.createImageData(96, 96)
  for (let y = 0; y < 96; y++)
    for (let x = 0; x < 96; x++) {
      const u = x / 48 - 1,
        v = y / 48 - 1
      const radius = u * u + v * v
      const broken = smooth((noise(x * 0.13 + 31, y * 0.13 + 17) - 0.26) / 0.5)
      const core = Math.exp(-radius * 35)
      const glow = Math.exp(-radius * 4.5) * (0.15 + 0.85 * broken)
      const at = (y * 96 + x) * 4
      lightPixels.data[at] = 255
      lightPixels.data[at + 1] = 248
      lightPixels.data[at + 2] = 230
      lightPixels.data[at + 3] = Math.round(Math.min(1, core * 0.8 + glow * 0.65) * 255)
    }
  lightInk.putImageData(lightPixels, 0, 0)
  const flecks = Array.from({ length: 180 }, (_, i) => {
    const random = (n: number) => values[(i * 47 + n * 191) % values.length]
    const side = i % 2
    return {
      u: side === 0 ? random(0) * 0.42 : 0.58 + random(0) * 0.42,
      v: random(1),
      phase: random(2) * Math.PI * 2,
      scale: i % 3 === 0 ? 20 + random(3) * 56 : 4 + random(3) ** 2 * 16,
      brightness: 0.65 + random(4) ** 2 * 0.35,
    }
  })
  function paintHighlights(
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
    seconds: number,
  ) {
    if (mist.highlights <= 0) return
    context.save()
    context.globalCompositeOperation = 'screen'
    for (const fleck of flecks) {
      const x = (fleck.u + Math.sin(seconds * 0.07 + fleck.phase) * 0.025) * width
      const y = (fleck.v + Math.sin(seconds * 0.05 + fleck.phase * 2) * 0.035) * height
      const breath = 0.8 + 0.2 * Math.sin(seconds * 0.3 + fleck.phase) ** 2
      const size = fleck.scale * Math.max(0.7, Math.min(width, height) / 850)
      context.globalAlpha = Math.min(1, mist.highlights * 1.7 * fleck.brightness * breath)
      context.drawImage(light, x - size / 2, y - size / 2, size, size)
    }
    context.restore()
  }
  function paintEdgeMist(
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
    seconds: number,
  ) {
    if (mist.intensity > 0) {
      paintField(width, height, seconds * 0.7)
      context.save()
      context.globalCompositeOperation = 'screen'
      context.globalAlpha = mist.intensity
      context.drawImage(field, 0, 0, field.width, field.height, 0, 0, width, height)
      context.restore()
    }
    paintHighlights(context, width, height, seconds)
  }

  signal.addEventListener(
    'abort',
    () => {
      field.width = field.height = light.width = light.height = 0
      for (const cloud of clouds) cloud.canvas.width = cloud.canvas.height = 0
    },
    { once: true },
  )
  return paintEdgeMist
}
