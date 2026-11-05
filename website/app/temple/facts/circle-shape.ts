/** A round invitation flowing into one convex, directional silhouette. */
export function circleSurface(dx = 0, dy = 0, clearance = 24) {
  const radius = 50
  const length = Math.hypot(dx, dy)
  const direction = Math.atan2(dy, dx)
  const extension = Math.max(0, length - radius - clearance)
  const tipRadius = 6
  const tipCenter = radius + extension - tipRadius
  // Common tangents join the round back to a small rounded tip. The whole
  // outline stays convex instead of growing a bump with an inward waist.
  const tangentAngle = extension ? Math.acos((radius - tipRadius) / tipCenter) : 0
  const capAngle = Math.atan2(
    tipRadius * Math.sin(tangentAngle),
    tipCenter + tipRadius * Math.cos(tangentAngle),
  )
  const segments = 128
  const step = (Math.PI * 2) / segments
  const samples = Array.from({ length: segments }, (_, index) => {
    const angle = -Math.PI / 2 + index * step
    const delta = Math.atan2(Math.sin(angle - direction), Math.cos(angle - direction))
    let reach = radius
    let slope = 0
    if (extension && Math.abs(delta) < tangentAngle) {
      if (Math.abs(delta) <= capAngle) {
        const sin = Math.sin(delta),
          cos = Math.cos(delta)
        const root = Math.sqrt(tipRadius ** 2 - (tipCenter * sin) ** 2)
        reach = tipCenter * cos + root
        slope = -tipCenter * sin - (tipCenter ** 2 * sin * cos) / root
      } else {
        const normal = tangentAngle - Math.abs(delta)
        const cos = Math.cos(normal)
        reach = radius / cos
        slope = (-Math.sign(delta) * radius * Math.sin(normal)) / cos ** 2
      }
    }
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    return {
      point: [radius + reach * cos, radius + reach * sin],
      tangent: [slope * cos - reach * sin, slope * sin + reach * cos],
    }
  })
  const coordinate = (values: number[]) => values.map((value) => Number(value.toFixed(4))).join(' ')
  let path = `M${coordinate(samples[0].point)}`
  for (let index = 0; index < segments; index++) {
    const current = samples[index]
    const next = samples[(index + 1) % segments]
    const chord = next.point.map((value, axis) => value - current.point[axis])
    const cross = current.tangent[0] * next.tangent[1] - current.tangent[1] * next.tangent[0]
    let control1: number[], control2: number[]
    if (cross > 1e-8) {
      const distance = (chord[0] * next.tangent[1] - chord[1] * next.tangent[0]) / cross
      const join = current.point.map((value, axis) => value + current.tangent[axis] * distance)
      // Tangent-intersection curves stay convex even across arc/side joins;
      // unrestricted Hermite handles introduce a tiny inward shoulder there.
      control1 = current.point.map((value, axis) => value + ((join[axis] - value) * 2) / 3)
      control2 = next.point.map((value, axis) => value + ((join[axis] - value) * 2) / 3)
    } else {
      control1 = current.point.map((value, axis) => value + chord[axis] / 3)
      control2 = current.point.map((value, axis) => value + (chord[axis] * 2) / 3)
    }
    // Fixed angular correspondences keep every pose outside the circular
    // body, including native path interpolation between opposite targets.
    path += `C${coordinate([...control1, ...control2, ...next.point])}`
  }
  return path + 'Z'
}
