// THROWAWAY: moving, textured warm mist inside the shared forest material.
export const mist = { hue: 22, intensity: 0.45 }
const texture = document.createElement('canvas')
texture.width = texture.height = 192
const ink = texture.getContext('2d')!
const field = document.createElement('canvas')
const fieldInk = field.getContext('2d')!
let paintedHue = -1
const hash = (x: number, y: number) => {
  const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return value - Math.floor(value)
}
function noise(x: number, y: number) {
  const ix = Math.floor(x),
    iy = Math.floor(y)
  const fx = x - ix,
    fy = y - iy
  const sx = fx * fx * (3 - 2 * fx),
    sy = fy * fy * (3 - 2 * fy)
  const a = hash(ix, iy) * (1 - sx) + hash(ix + 1, iy) * sx
  const b = hash(ix, iy + 1) * (1 - sx) + hash(ix + 1, iy + 1) * sx
  return a * (1 - sy) + b * sy
}
function makeTexture() {
  paintedHue = mist.hue
  const data = ink.createImageData(192, 192)
  for (let y = 0; y < 192; y++)
    for (let x = 0; x < 192; x++) {
      const u = x / 192,
        v = y / 192
      const n =
        noise(u * 5, v * 5) * 0.6 +
        noise(u * 13 + 12, v * 13) * 0.28 +
        noise(u * 31, v * 31 + 17) * 0.12
      const envelope = Math.exp(-(((u - 0.5) ** 2 + (v - 0.5) ** 2) * 13))
      const density = Math.max(0, n - 0.16) ** 1.35 * envelope
      const hue = Math.max(0, Math.min(60, mist.hue + (noise(u * 7 + 31, v * 7) - 0.5) * 24))
      // Warm gamut only: red -> orange -> yellow, with no white pigment wash.
      const at = (y * 192 + x) * 4
      data.data[at] = 255
      data.data[at + 1] = Math.round((255 * hue) / 60)
      data.data[at + 2] = 8
      data.data[at + 3] = Math.round(Math.min(1, density * 3.8) * 255)
    }
  ink.putImageData(data, 0, 0)
}
export function paintEdgeMist(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  seconds: number,
) {
  if (mist.intensity <= 0) return
  if (paintedHue !== mist.hue) makeTexture()
  const w = Math.min(640, Math.round(width)),
    h = Math.round((w * height) / width)
  if (field.width !== w || field.height !== h) {
    field.width = w
    field.height = h
  }
  fieldInk.clearRect(0, 0, w, h)
  fieldInk.globalCompositeOperation = 'source-over'
  for (let side = 0; side < 2; side++)
    for (let i = 0; i < 9; i++) {
      const seed = i + side * 29
      const x = (side === 0 ? -0.04 : 1.04) * w + Math.sin(seconds * 0.045 + seed * 2.3) * w * 0.11
      const y = (hash(seed, 5) * 1.4 - 0.2 + Math.sin(seconds * 0.035 + seed) * 0.13) * h
      const cw = w * (0.42 + hash(seed, 7) * 0.35),
        ch = h * (0.4 + hash(seed, 11) * 0.5)
      fieldInk.globalAlpha = 0.34 + hash(seed, 19) * 0.38
      fieldInk.drawImage(texture, x - cw / 2, y - ch / 2, cw, ch)
    }
  fieldInk.globalAlpha = 1
  fieldInk.globalCompositeOperation = 'destination-in'
  const edge = fieldInk.createLinearGradient(0, 0, w, 0)
  edge.addColorStop(0, '#fff')
  edge.addColorStop(0.15, '#fffc')
  edge.addColorStop(0.42, '#fff0')
  edge.addColorStop(0.58, '#fff0')
  edge.addColorStop(0.85, '#fffc')
  edge.addColorStop(1, '#fff')
  fieldInk.fillStyle = edge
  fieldInk.fillRect(0, 0, w, h)
  context.save()
  context.globalCompositeOperation = 'screen'
  context.globalAlpha = mist.intensity
  context.drawImage(field, 0, 0, w, h, 0, 0, width, height)
  context.restore()
}
