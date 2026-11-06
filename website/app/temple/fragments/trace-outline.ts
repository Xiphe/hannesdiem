import { fragmentStroke } from '../../../../contracts/temple/fragments.ts'

type Point = { x: number; y: number }
const cross = (a: Point, b: Point) => a.x * b.y - a.y * b.x
const subtract = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y })
const number = (n: number) => String(Math.round(n * 10000) / 10000)
const coordinate = (p: Point) => `${number(p.x)} ${number(p.y)}`

/** The actual outer boundary of a filled fragment with its rounded body stroke.
 * Trace this boundary with a thin stroke, rather than animating a thick stroke
 * around the sharp original vertices (whose rounded joins have no path length).
 */
export function traceOutline(d: string, radius = fragmentStroke / 2): string {
  const points: Point[] = []
  let current: Point = { x: 0, y: 0 }
  const add = (p: Point) => {
    if (!points.length || Math.hypot(p.x - current.x, p.y - current.y) > 0.00001) points.push(p)
    current = p
  }
  const quadratic = (a: Point, control: Point, b: Point, depth = 0) => {
    const chord = subtract(b, a)
    const deviation =
      Math.abs(cross(subtract(control, a), chord)) / Math.max(0.00001, Math.hypot(chord.x, chord.y))
    if (deviation <= 0.002 || depth >= 12) return add(b)
    const left = { x: (a.x + control.x) / 2, y: (a.y + control.y) / 2 }
    const right = { x: (control.x + b.x) / 2, y: (control.y + b.y) / 2 }
    const middle = { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 }
    quadratic(a, left, middle, depth + 1)
    quadratic(middle, right, b, depth + 1)
  }
  // Fragment generation emits absolute M/L/Q/Z; H/V also support diagnostic shapes.
  for (const match of d.matchAll(/([MLHQVZ])([^MLHQVZ]*)/gi)) {
    const values = match[2].trim().split(/[ ,]+/).map(Number)
    switch (match[1].toUpperCase()) {
      case 'M':
      case 'L':
        add({ x: values[0], y: values[1] })
        break
      case 'H':
        add({ x: values[0], y: current.y })
        break
      case 'V':
        add({ x: current.x, y: values[0] })
        break
      case 'Q':
        quadratic(current, { x: values[0], y: values[1] }, { x: values[2], y: values[3] })
        break
    }
  }
  if (points.length < 3) return d
  if (Math.hypot(points[0].x - current.x, points[0].y - current.y) < 0.00001) points.pop()
  const winding =
    Math.sign(points.reduce((area, p, i) => area + cross(p, points[(i + 1) % points.length]), 0)) ||
    1
  const edges = points.map((p, i) => {
    const delta = subtract(points[(i + 1) % points.length], p)
    const length = Math.hypot(delta.x, delta.y)
    return {
      tangent: { x: delta.x / length, y: delta.y / length },
      normal: { x: (winding * delta.y) / length, y: (-winding * delta.x) / length },
    }
  })
  const joins = points.map((p, i) => {
    const before = edges[(i + edges.length - 1) % edges.length]
    const after = edges[i]
    const start = { x: p.x + before.normal.x * radius, y: p.y + before.normal.y * radius }
    const end = { x: p.x + after.normal.x * radius, y: p.y + after.normal.y * radius }
    const turn = cross(before.tangent, after.tangent)
    if (turn * winding > 0.000001) return { start, end, round: true }
    if (Math.abs(turn) < 0.000001) return { start: end, end, round: false }
    // Concave cuts meet at the intersection of their outward parallel edges.
    const distance = cross(subtract(end, start), after.tangent) / turn
    const intersection = {
      x: start.x + before.tangent.x * distance,
      y: start.y + before.tangent.y * distance,
    }
    return { start: intersection, end: intersection, round: false }
  })
  let path = `M${coordinate(joins[0].start)}`
  for (const [i, join] of joins.entries()) {
    if (i) path += `L${coordinate(join.start)}`
    if (join.round)
      path += `A${number(radius)} ${number(radius)} 0 0 ${winding > 0 ? 1 : 0} ${coordinate(join.end)}`
  }
  return path + 'Z'
}
