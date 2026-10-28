// THROWAWAY: broad, mixed-colour cloud field with bounded optical density.
export const mist = { hues: [4, 25, 52], intensity: 0.65 }
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
function noise(x: number, y: number) {
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
export function paintEdgeMist(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  seconds: number,
) {
  if (mist.intensity <= 0) return
  paintField(width, height, seconds)
  context.save()
  context.globalCompositeOperation = 'screen'
  context.globalAlpha = 1
  context.drawImage(field, 0, 0, field.width, field.height, 0, 0, width, height)
  context.restore()
}
