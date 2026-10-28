// THROWAWAY: broad, mixed-colour cloud field with bounded optical density.
import { defaults } from './defaults.ts'
export const mist = {
  hues: [...defaults.mistHues],
  intensity: defaults.mistIntensity,
  highlights: 0.65,
}
const field = document.createElement('canvas')
const ink = field.getContext('2d')!
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
let frame: ImageData,
  last = -Infinity,
  signature = ''
function paintField(width: number, height: number, seconds: number) {
  const w = Math.min(384, Math.round(width)),
    h = Math.max(1, Math.min(512, Math.round((w * height) / width)))
  const key = `${w}/${h}/${mist.hues.join('/')}/${mist.intensity}`
  if (key === signature && Math.abs(seconds - last) < 1 / 15) return
  signature = key
  last = seconds
  if (!frame || field.width !== w || field.height !== h) {
    field.width = w
    field.height = h
    frame = ink.createImageData(w, h)
  }
  const colours = mist.hues.map((hue) => [255, (255 * hue) / 60, 10 + (30 * hue) / 60])
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const u = x / w,
        v = y / h
      // Domain-warped folds, with smaller filaments across broad cloud banks.
      const wx = (noise(u * 1.1 + 7 + seconds * 0.018, v * 0.9 + 3) - 0.5) * 0.85
      const wy = (noise(u * 0.9 + 19, v * 1.2 + seconds * 0.014) - 0.5) * 0.65
      const broad = noise(u * 2.4 + wx + seconds * 0.012, v * 2.1 + wy + 11)
      const detail = noise(u * 13 + wx * 3 - seconds * 0.009, v * 11 + wy * 3 + 29)
      const fine = noise(u * 38 + wx * 4, v * 29 + wy * 4 + 53)
      const cloud = smooth((broad * 0.58 + detail * 0.3 + fine * 0.12 - 0.2) / 0.56)
      const billows = smooth((detail - 0.25) / 0.55)
      const wisps = (1 - Math.abs((detail * 0.6 + fine * 0.4) * 2 - 1)) ** 5
      const density = smooth((cloud * (0.35 + 0.65 * billows) * (0.55 + 0.45 * wisps) - 0.12) / 0.4)
      // Reach across the interior, preserving the photographic light source.
      const reach = 0.75 + 0.25 * Math.abs(u * 2 - 1) ** 0.6
      const sun = 1 - 0.6 * Math.exp(-((u - 0.5) ** 2 + (v - 0.5) ** 2) * 36)
      const palette = Math.max(
        0,
        Math.min(2, (noise(u * 2 + wx + 43 + seconds * 0.008, v * 1.8 + wy + 61) - 0.2) * 3.4),
      )
      const index = Math.min(1, Math.floor(palette)),
        mix = smooth(palette - index)
      const at = (y * w + x) * 4
      for (let c = 0; c < 3; c++)
        frame.data[at + c] = Math.round(colours[index][c] * (1 - mix) + colours[index + 1][c] * mix)
      // Even the maximum setting retains at least64% of image contrast.
      frame.data[at + 3] = Math.round(255 * mist.intensity * (0.12 + 0.24 * density) * reach * sun)
    }
  ink.putImageData(frame, 0, 0)
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
export function paintEdgeMist(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  seconds: number,
) {
  if (mist.intensity > 0) {
    paintField(width, height, seconds)
    context.save()
    context.globalCompositeOperation = 'screen'
    context.globalAlpha = 1
    context.drawImage(field, 0, 0, field.width, field.height, 0, 0, width, height)
    context.restore()
  }
  paintHighlights(context, width, height, seconds)
}
