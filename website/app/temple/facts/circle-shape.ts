export type CirclePool = { x: number; y: number; radius: number; neck: number }

const number = (value: number) => Number(value.toFixed(3))
const point = (x: number, y: number) => `${number(x)} ${number(y)}`

function circle(x: number, y: number, radius: number) {
  const k = radius * 0.55228475
  return (
    `M${point(x, y - radius)}` +
    `C${point(x + k, y - radius)} ${point(x + radius, y - k)} ${point(x + radius, y)}` +
    `C${point(x + radius, y + k)} ${point(x + k, y + radius)} ${point(x, y + radius)}` +
    `C${point(x - k, y + radius)} ${point(x - radius, y + k)} ${point(x - radius, y)}` +
    `C${point(x - radius, y - k)} ${point(x - k, y - radius)} ${point(x, y - radius)}Z`
  )
}

/** Round pools with concave, tangent necks; overlapping subpaths share one fill. */
export function circleSurface(pools: readonly CirclePool[] = []) {
  let path = circle(50, 50, 50)
  for (const pool of pools) {
    const length = Math.hypot(pool.x, pool.y)
    if (length + pool.radius <= 50 || pool.radius < 0.1) continue
    path += circle(50 + pool.x, 50 + pool.y, pool.radius)
    const ux = pool.x / length,
      uy = pool.y / length
    const xy = (x: number, y: number) => point(50 + ux * x - uy * y, 50 + uy * x + ux * y)
    const bodyAngle = (62 * Math.PI) / 180
    const poolAngle = (115 * Math.PI) / 180
    const bx = 50 * Math.cos(bodyAngle),
      by = 50 * Math.sin(bodyAngle)
    const px = length + pool.radius * Math.cos(poolAngle),
      py = pool.radius * Math.sin(poolAngle)
    if (px <= bx) continue
    const nx = bx + (px - bx) * 0.62
    const ny = Math.min(9, pool.radius * 0.4) * pool.neck
    const bodyHandle = (nx - bx) * 0.55
    const poolHandle = (px - nx) * 0.45
    // Curves meet both circles tangentially; the neck can lag behind its pool.
    path +=
      `M${xy(bx, -by)}` +
      `C${xy(bx + bodyHandle * Math.sin(bodyAngle), -by + bodyHandle * Math.cos(bodyAngle))} ${xy(nx - bodyHandle, -ny)} ${xy(nx, -ny)}` +
      `C${xy(nx + poolHandle, -ny)} ${xy(px - poolHandle * Math.sin(poolAngle), -py - poolHandle * Math.cos(poolAngle))} ${xy(px, -py)}` +
      `L${xy(px, py)}` +
      `C${xy(px - poolHandle * Math.sin(poolAngle), py + poolHandle * Math.cos(poolAngle))} ${xy(nx + poolHandle, ny)} ${xy(nx, ny)}` +
      `C${xy(nx - bodyHandle, ny)} ${xy(bx + bodyHandle * Math.sin(bodyAngle), by - bodyHandle * Math.cos(bodyAngle))} ${xy(bx, by)}Z`
  }
  return path
}
