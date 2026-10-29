// THROWAWAY: existing solar particles can cross the lettering into the foreground.
// Only static, small coverage maps are read, once per font/size build, never per frame.
export const escapeLight = { intensity: 0.85 }
type Coverage = { data: Uint8ClampedArray; width: number; height: number }
const coverage = new WeakMap<HTMLCanvasElement, Coverage>()
const portals: { map: Coverage; x: number; y: number; width: number; height: number }[] = []
export function cachePortal(source: HTMLCanvasElement) {
  let map = coverage.get(source)
  if (!map) {
    const canvas = document.createElement('canvas')
    canvas.width = Math.min(256, source.width)
    canvas.height = Math.max(1, Math.round((source.height * canvas.width) / source.width))
    const ink = canvas.getContext('2d', { willReadFrequently: true })!
    ink.drawImage(source, 0, 0, canvas.width, canvas.height)
    map = {
      data: ink.getImageData(0, 0, canvas.width, canvas.height).data,
      width: canvas.width,
      height: canvas.height,
    }
    coverage.set(source, map)
  }
  return map
}
export function beginPortals() {
  portals.length = 0
}
export function addPortal(
  source: HTMLCanvasElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const map = coverage.get(source)
  if (map) portals.push({ map, x, y, width, height })
}
function inside(x: number, y: number) {
  return portals.some((p) => {
    const u = (x - p.x) / p.width,
      v = (y - p.y) / p.height
    if (u < 0 || u >= 1 || v < 0 || v >= 1) return false
    return (
      p.map.data[
        (Math.floor(v * p.map.height) * p.map.width + Math.floor(u * p.map.width)) * 4 + 3
      ] > 100
    )
  })
}
type Track = { x: number; y: number; time: number; inside: boolean; escaped: number }
const tracks = new Map<number, Track>()
const sparks: {
  x: number
  y: number
  vx: number
  vy: number
  start: number
  life: number
  size: number
  alpha: number
  lean: number
}[] = []
let sprite: HTMLCanvasElement,
  next = 0
export function setGlimmerSprite(value: HTMLCanvasElement) {
  sprite = value
}
export function trackGlimmer(
  id: number,
  x: number,
  y: number,
  alpha: number,
  size: number,
  time: number,
) {
  // A subset of the actual forest system, not a second unrelated emitter.
  if (id % 5 || alpha < 0.12 || escapeLight.intensity <= 0) return
  const hit = inside(x, y),
    previous = tracks.get(id)
  let escaped = previous?.escaped ?? -Infinity
  if (previous) {
    const dt = time - previous.time
    const distance = Math.hypot(x - previous.x, y - previous.y)
    if (
      previous.inside &&
      !hit &&
      dt > 0 &&
      dt < 0.15 &&
      distance < 40 &&
      time > next &&
      time - escaped > 3 &&
      sparks.length < 18
    ) {
      sparks.push({
        x,
        y,
        vx: (x - previous.x) / dt,
        vy: (y - previous.y) / dt,
        start: time,
        life: 1.3 + Math.random() * 1.3,
        size,
        alpha: Math.min(0.9, alpha * 1.2),
        lean: (Math.random() - 0.5) * 24,
      })
      escaped = time
      next = time + 0.1
    }
  }
  tracks.set(id, { x, y, time, inside: hit, escaped })
}
export function drawEscapes(context: CanvasRenderingContext2D, time: number, reduced: boolean) {
  if (reduced || escapeLight.intensity <= 0) {
    tracks.clear()
    sparks.length = 0
    return
  }
  if (!sprite) return
  context.save()
  context.globalCompositeOperation = 'screen'
  for (let i = sparks.length - 1; i >= 0; i--) {
    const p = sparks[i],
      age = time - p.start,
      life = age / p.life
    if (life >= 1) {
      sparks.splice(i, 1)
      continue
    }
    const depth = 1 + age * 0.85
    const x = p.x + p.vx * age * (1 + age * 0.25) + p.lean * age * age
    const y = p.y + p.vy * age * (1 + age * 0.25) - 12 * age * age
    const size = p.size * depth
    context.globalAlpha = p.alpha * (1 - life) ** 0.7 * escapeLight.intensity
    context.drawImage(sprite, x - size / 2, y - size / 2, size, size)
  }
  context.restore()
}
