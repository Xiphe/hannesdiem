/** A circular invitation with a small, local pull in its perimeter. */
export function circleSurface(dx = 0, dy = 0, clearance = 24) {
  const width = 100
  const height = 100
  const radius = 50
  const length = Math.hypot(dx, dy)
  const ux = length ? dx / length : 0
  const uy = length ? dy / length : 0
  const reach = length ? radius : 0
  const tipX = width / 2 + ux * reach
  const tipY = height / 2 + uy * reach
  const points: [number, number][] = Array.from({ length: 64 }, (_, i) => {
    const angle = -Math.PI / 2 + (i * Math.PI) / 32
    return [radius + Math.cos(angle) * radius, radius + Math.sin(angle) * radius]
  })
  let apex = -1
  if (length) {
    apex = points.reduce(
      (nearest, point, index) =>
        Math.hypot(point[0] - tipX, point[1] - tipY) <
        Math.hypot(points[nearest][0] - tipX, points[nearest][1] - tipY)
          ? index
          : nearest,
      0,
    )
    // Anchor a real tip even when the direction falls between corner samples.
    points[apex] = [tipX, tipY]
    const extension = Math.max(0, length - reach - clearance)
    const endX = tipX + ux * extension
    const endY = tipY + uy * extension
    const alongSide = width / 2 / Math.abs(ux) <= height / 2 / Math.abs(uy) ? 1 : 0
    const anchor = alongSide ? tipY : tipX
    const end = alongSide ? endY : endX
    for (const point of extension ? points : []) {
      const distance = Math.hypot(point[0] - tipX, point[1] - tipY)
      const weight = Math.max(0, 1 - distance / 32) ** 2
      if (!weight) continue
      const original = point[alongSide]
      // Gather the nearby edge toward the tip. Shifting every point in parallel
      // lifts a second shoulder above an otherwise straight edge.
      point[0] += (endX - point[0]) * weight
      point[1] += (endY - point[1]) * weight
      // Preserve the order of the two flanks as they approach the moved tip.
      if (original < anchor) point[alongSide] = Math.min(point[alongSide], end)
      if (original > anchor) point[alongSide] = Math.max(point[alongSide], end)
    }
    if (extension) {
      // Replace the cusp with a small round nose whose front stays at the
      // same target position. The flanks retain their clean, ordered joins.
      const cap = Math.min(4, extension * 0.4)
      const cx = endX - ux * cap
      const cy = endY - uy * cap
      const index = (offset: number) => (apex + offset + points.length) % points.length
      const inFront = (offset: number) => {
        const point = points[index(offset)]
        return (point[0] - cx) * ux + (point[1] - cy) * uy > 0
      }
      let before = 2
      let after = 2
      while (before < points.length / 4 && inFront(-before)) before++
      while (after < points.length / 4 && inFront(after)) after++
      const forward = alongSide ? ux : -uy
      const capAngle = Math.atan2(Math.abs(forward), Math.abs(alongSide ? uy : ux)) * 0.8
      for (let offset = -before; offset <= after; offset++) {
        const angle = (offset / (offset < 0 ? before : after)) * capAngle
        points[index(offset)] = [
          cx + cap * (ux * Math.cos(angle) - uy * Math.sin(angle)),
          cy + cap * (uy * Math.cos(angle) + ux * Math.sin(angle)),
        ]
      }
      // Meet each flank in order: a full semicircle would turn past a shallow
      // diagonal flank, leaving a small notch behind the rounded nose.
      for (const [offset, direction] of [
        [-before, -1],
        [after, 1],
      ]) {
        const edge = points[index(offset)][alongSide]
        for (let step = 1; step < points.length / 4; step++) {
          const point = points[index(offset + step * direction)]
          if ((point[alongSide] - edge) * forward * direction >= 0) break
          point[alongSide] = edge
        }
      }
    }
  }
  const coordinate = (values: number[]) => values.map((value) => Number(value.toFixed(2))).join(' ')
  const interval = (a: number[], b: number[]) =>
    Math.max(0.001, Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1])))
  const tangent = (before: number, after: number, beforeTime: number, afterTime: number) => {
    const incoming = before / beforeTime
    const outgoing = after / afterTime
    if (incoming * outgoing <= 0) return 0
    const a = 2 * afterTime + beforeTime
    const b = afterTime + 2 * beforeTime
    return (a + b) / (a / incoming + b / outgoing)
  }
  let path = `M${coordinate(points[0])}`
  // Keep matching cubic segments in every pose so the outline interpolates smoothly.
  for (let i = 0; i < points.length; i++) {
    const prev = points[(i + points.length - 1) % points.length]
    const current = points[i]
    const next = points[(i + 1) % points.length]
    const after = points[(i + 2) % points.length]
    // Distance-aware, monotone tangents avoid overshooting a corner or a flat
    // shoulder while keeping the same tangent at each shared curve endpoint.
    const beforeTime = interval(prev, current)
    const time = interval(current, next)
    const afterTime = interval(next, after)
    const control1 = current.map(
      (value, axis) =>
        value + (time / 3) * tangent(value - prev[axis], next[axis] - value, beforeTime, time),
    )
    const control2 = next.map(
      (value, axis) =>
        value - (time / 3) * tangent(value - current[axis], after[axis] - value, time, afterTime),
    )
    path += `C${coordinate([...control1, ...control2, ...next])}`
  }
  return path + 'Z'
}
