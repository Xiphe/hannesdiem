import type { CirclePool } from './circle-shape.ts'

/** Independent, overdamped pools: a released stretch drains as the next grows. */
export function createCircleFluid() {
  const pools = new Map<
    number,
    {
      x: number
      y: number
      radius: number
      amount: number
      neck: number
      wantedX: number
      wantedY: number
      wantedRadius: number
    }
  >()
  let target: number | undefined
  let strength = 0
  let time = 0
  const approach = (from: number, to: number, dt: number, lag: number) =>
    to + (from - to) * Math.exp(-dt / lag)
  return {
    aim(index: number, x: number, y: number, radius: number, pull = 1) {
      target = index
      strength = pull
      const pool = pools.get(index)
      if (pool) Object.assign(pool, { wantedX: x, wantedY: y, wantedRadius: radius })
      else
        pools.set(index, {
          x,
          y,
          radius,
          amount: 0,
          neck: 0,
          wantedX: x,
          wantedY: y,
          wantedRadius: radius,
        })
    },
    release() {
      target = undefined
    },
    step(dt: number, immediate = false): CirclePool[] {
      time += dt
      const result: CirclePool[] = []
      for (const [index, pool] of pools) {
        const wanted = index === target ? strength : 0
        const lag = 0.22 + 0.035 * Math.sin(index * 2.4)
        pool.amount = immediate ? wanted : approach(pool.amount, wanted, dt, wanted ? lag : 0.34)
        pool.neck = immediate ? wanted : approach(pool.neck, wanted, dt, lag * 1.6)
        pool.x = immediate ? pool.wantedX : approach(pool.x, pool.wantedX, dt, 0.16)
        pool.y = immediate ? pool.wantedY : approach(pool.y, pool.wantedY, dt, 0.2)
        pool.radius = immediate
          ? pool.wantedRadius
          : approach(pool.radius, pool.wantedRadius, dt, 0.25)
        if (!wanted && pool.amount < 0.002) {
          pools.delete(index)
          continue
        }
        const float = immediate ? 0 : pool.amount ** 4
        result.push({
          x: pool.x * pool.amount + Math.sin(time * 1.35 + index) * 1.7 * float,
          y: pool.y * pool.amount + Math.cos(time * 1.1 + index * 1.7) * 1.7 * float,
          radius: pool.radius * Math.sqrt(pool.amount) + Math.sin(time * 1.6 + index) * 0.6 * float,
          neck: 0.65 + pool.neck * 0.35,
        })
      }
      return result
    },
    get active() {
      return pools.size > 0
    },
  }
}
