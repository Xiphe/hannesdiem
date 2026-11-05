import { randomFrom, type Piece } from '../../../../contracts/temple/fragments.ts'
export {
  generateFragments,
  randomFrom,
  type Piece,
} from '../../../../contracts/temple/fragments.ts'

const rounded = (n: number) => Math.round(n * 1000) / 1000

type Point = { x: number; y: number }

function outline(piece: Piece): Point[] {
  const points: Point[] = []
  let x = 0,
    y = 0
  for (const match of (piece.d ?? 'M-14 0L14 0L14 -8L-14 -8Z').matchAll(
    /([MLHVQZ])([^MLHVQZ]*)/gi,
  )) {
    const values = match[2].trim().split(/[ ,]+/).map(Number)
    switch (match[1].toUpperCase()) {
      case 'M':
      case 'L':
        ;[x, y] = values
        points.push({ x, y })
        break
      case 'H':
        x = values[0]
        points.push({ x, y })
        break
      case 'V':
        y = values[0]
        points.push({ x, y })
        break
      case 'Q': {
        const [cx, cy, endX, endY] = values
        const startX = x,
          startY = y
        for (let step = 1; step <= 12; step++) {
          const t = step / 12
          points.push({
            x: (1 - t) ** 2 * startX + 2 * (1 - t) * t * cx + t * t * endX,
            y: (1 - t) ** 2 * startY + 2 * (1 - t) * t * cy + t * t * endY,
          })
        }
        x = endX
        y = endY
        break
      }
    }
  }
  return points
}
// Find the longest genuinely straight run, including the spinner's subdivided
// square edges. Quadratic samples are only candidates if collinear.
export function borderEdge(piece: Piece): [Point, Point] {
  const points = outline(piece)
  let edge: [Point, Point] = [points[0], points[1]]
  let longest = 0
  for (let i = 0; i < points.length; i++) {
    const a = points[i]
    let b = points[(i + 1) % points.length]
    for (let step = 2; step < points.length; step++) {
      const c = points[(i + step) % points.length]
      const length = Math.hypot(b.x - a.x, b.y - a.y)
      if (
        Math.abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) > length * 0.002 ||
        (b.x - a.x) * (c.x - b.x) + (b.y - a.y) * (c.y - b.y) < 0
      )
        break
      b = c
    }
    const length = Math.hypot(b.x - a.x, b.y - a.y)
    if (length > longest) {
      longest = length
      edge = [a, b]
    }
  }
  return edge
}

function worldOutline(piece: Piece, local = outline(piece)): Point[] {
  const angle = (piece.angle * Math.PI) / 180,
    scale = piece.size / 28
  return local.map((p) => {
    const x = (p.x + (piece.origin?.[0] ?? 0)) * scale,
      y = (p.y + (piece.origin?.[1] ?? 0)) * scale
    return {
      x: piece.x + x * Math.cos(angle) - y * Math.sin(angle),
      y: piece.y + x * Math.sin(angle) + y * Math.cos(angle),
    }
  })
}
const cross = (a: Point, b: Point, c: Point) =>
  (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
function contains(polygon: Point[], point: Point) {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i],
      b = polygon[j]
    if (
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    )
      inside = !inside
  }
  return inside
}
function contact(a: Point[], b: Point[]) {
  // Test slightly inset silhouettes so a one-pixel/tangent contact is not a join.
  const inset = (p: Point[]) => {
    const c = p.reduce((sum, v) => ({ x: sum.x + v.x / p.length, y: sum.y + v.y / p.length }), {
      x: 0,
      y: 0,
    })
    return p.map((v) => ({ x: c.x + (v.x - c.x) * 0.96, y: c.y + (v.y - c.y) * 0.96 }))
  }
  a = inset(a)
  b = inset(b)
  if (
    Math.max(...a.map((p) => p.x)) < Math.min(...b.map((p) => p.x)) ||
    Math.max(...b.map((p) => p.x)) < Math.min(...a.map((p) => p.x)) ||
    Math.max(...a.map((p) => p.y)) < Math.min(...b.map((p) => p.y)) ||
    Math.max(...b.map((p) => p.y)) < Math.min(...a.map((p) => p.y))
  )
    return false
  for (let i = 0; i < a.length; i++)
    for (let j = 0; j < b.length; j++) {
      const p = a[i],
        q = a[(i + 1) % a.length],
        r = b[j],
        s = b[(j + 1) % b.length]
      if (cross(p, q, r) * cross(p, q, s) < 0 && cross(r, s, p) * cross(r, s, q) < 0) return true
    }
  return a.some((p) => contains(b, p)) || b.some((p) => contains(a, p))
}
export const piecesOverlap = (a: Piece, b: Piece) => contact(worldOutline(a), worldOutline(b))

export function assembleBorder(
  pieces: readonly Piece[],
  options: { width: number; height: number; overlap: number; seed: string },
): Piece[] {
  if (!pieces.length) return []
  const { width, height } = options
  const random = randomFrom(options.seed + '/broken-border')
  const overlap = Math.max(0.1, Math.min(0.6, options.overlap))
  const corner = Math.min(16, height / 4)
  const vertices = [
    { x: -width / 2 + corner, y: -height / 2 },
    { x: width / 2 - corner, y: -height / 2 },
    { x: width / 2, y: -height / 2 + corner },
    { x: width / 2, y: height / 2 - corner },
    { x: width / 2 - corner, y: height / 2 },
    { x: -width / 2 + corner, y: height / 2 },
    { x: -width / 2, y: height / 2 - corner },
    { x: -width / 2, y: -height / 2 + corner },
  ]
  let perimeter = 0
  const guide = vertices.map((from, i) => {
    const to = vertices[(i + 1) % vertices.length]
    const length = Math.hypot(to.x - from.x, to.y - from.y)
    const segment = {
      from,
      to,
      length,
      start: perimeter,
      angle: (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI,
    }
    perimeter += length
    return segment
  })
  const local = pieces.map(outline)
  // A few joins among independent pieces, rather than one mandatory chain.
  // Keep runs short so a pair reads as a shared edge, not another pile.
  const joins = new Set<number>()
  const candidates = pieces.slice(1).map((_, i) => i + 1)
  while (candidates.length && joins.size < Math.max(1, Math.floor(pieces.length * 0.3))) {
    const index = candidates.splice(Math.floor(random() * candidates.length), 1)[0]
    if (
      !(joins.has(index - 1) && joins.has(index - 2)) &&
      !(joins.has(index - 1) && joins.has(index + 1)) &&
      !(joins.has(index + 1) && joins.has(index + 2))
    )
      joins.add(index)
  }
  const groups: number[][] = []
  for (let i = 0; i < pieces.length; i++) {
    if (joins.has(i)) groups.at(-1)!.push(i)
    else groups.push([i])
  }
  const tilts = pieces.map(() => (random() - 0.5) * 44)
  const lifts = pieces.map(() => random() * 9)
  const phase = random() * perimeter
  // Unequal gaps and group spans occupy the whole perimeter, rather than leaving
  // a single opening at the tail of a continuous strip.
  const spans = groups.map((group) =>
    group.reduce(
      (sum, i, n) =>
        sum + (n ? ((pieces[group[n - 1]].size + pieces[i].size) / 2) * (1 - overlap) : 0),
      0,
    ),
  )
  const weights = groups.map(
    (group, i) =>
      spans[i] +
      (pieces[group[0]].size + pieces[group.at(-1)!].size) / 2 +
      24 +
      random() ** 2 * 110,
  )
  const totalWeight = weights.reduce((sum, n) => sum + n, 0)
  function place(index: number, distance: number, tilt = tilts[index]): Piece {
    const d = ((distance % perimeter) + perimeter) % perimeter
    const segment = guide.find((s) => d < s.start + s.length) ?? guide[0]
    const t = (d - segment.start) / segment.length
    const angle = segment.angle + tilt
    const normal = (segment.angle * Math.PI) / 180
    // Turning the pieces must not turn their inward tips across the label.
    const lift =
      lifts[index] + (Math.abs(Math.sin((tilt * Math.PI) / 180)) * pieces[index].size) / 2
    return {
      ...pieces[index],
      x: rounded(segment.from.x + (segment.to.x - segment.from.x) * t + Math.sin(normal) * lift),
      y: rounded(segment.from.y + (segment.to.y - segment.from.y) * t - Math.cos(normal) * lift),
      angle: rounded(((((angle + 180) % 360) + 360) % 360) - 180),
    }
  }
  const result: Piece[] = []
  let cursor = phase
  for (let g = 0; g < groups.length; g++) {
    const slot = (weights[g] / totalWeight) * perimeter
    let distance = cursor + slot / 2 - spans[g] / 2
    for (const [n, index] of groups[g].entries()) {
      if (!n) result.push(place(index, distance))
      else {
        const previous = result.at(-1)!
        const previousInk = worldOutline(previous, local[index - 1])
        const target =
          ((previous.size + pieces[index].size) / 2) * (1 - overlap) * (0.8 + random() * 0.3)
        let candidate = place(index, distance + target)
        let best: { piece: Piece; step: number } | undefined
        for (let step = target; step >= 4; step -= 0.75) {
          candidate = place(index, distance + step)
          if (contact(previousInk, worldOutline(candidate, local[index]))) {
            best = { piece: candidate, step }
            break
          }
        }
        // If these particular cuts don't meet, keep the break instead of piling
        // their centres on top of one another to force contact.
        result.push(best?.piece ?? place(index, distance + target))
        distance += best?.step ?? target
      }
    }
    cursor += slot
  }
  return result
}
