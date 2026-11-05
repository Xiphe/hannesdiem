/** A circular body with a smooth, localized point toward an available place. */
export function circleSurface(dx = 0, dy = 0, clearance = 24) {
  const radius = 50
  const length = Math.hypot(dx, dy)
  const direction = Math.atan2(dy, dx)
  const extension = Math.max(0, length - radius - clearance)
  const shoulder = Math.PI / 5
  const segments = 64
  const step = (Math.PI * 2) / segments
  const samples = Array.from({ length: segments }, (_, index) => {
    const angle = -Math.PI / 2 + index * step
    const delta = Math.atan2(Math.sin(angle - direction), Math.cos(angle - direction))
    const position = delta / shoulder
    const core = Math.max(0, 1 - position * position)
    // The bulge and its first two derivatives meet the untouched circle at
    // zero. Its rounded nose needs no separate cap or axis-dependent flanks.
    const reach = radius + extension * core ** 3
    const slope = (-6 * extension * position * core ** 2) / shoulder
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    return {
      point: [radius + reach * cos, radius + reach * sin],
      tangent: [slope * cos - reach * sin, slope * sin + reach * cos],
    }
  })
  const coordinate = (values: number[]) => values.map((value) => Number(value.toFixed(2))).join(' ')
  let path = `M${coordinate(samples[0].point)}`
  for (let index = 0; index < segments; index++) {
    const current = samples[index]
    const next = samples[(index + 1) % segments]
    const control1 = current.point.map((value, axis) => value + (current.tangent[axis] * step) / 3)
    const control2 = next.point.map((value, axis) => value - (next.tangent[axis] * step) / 3)
    // Fixed angular correspondences keep every pose outside the circular
    // body, including native path interpolation between opposite targets.
    path += `C${coordinate([...control1, ...control2, ...next.point])}`
  }
  return path + 'Z'
}
