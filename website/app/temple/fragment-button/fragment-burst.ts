import { randomFrom, type Piece } from './fragment-generator.ts'

type Flight = {
  from: Piece
  dx: number
  dy: number
  spin: number
  duration: number
  returnAt: number
  returnDuration: number
  zoom: boolean
}
export type FragmentBurst = {
  elapsed: number
  reduced: boolean
  flights: Flight[]
  flightEnd: number
  end: number
}
const clamp = (value: number) => Math.max(0, Math.min(1, value))
const smooth = (t: number) => t * t * (3 - 2 * t)

export function createFragmentBurst(
  pieces: Piece[],
  width: number,
  seed: string,
  reduced = false,
): FragmentBurst {
  const random = randomFrom(seed)
  // Associate spread-out directions with the pieces' current radial order.
  const order = pieces
    .map((piece, index) => ({ index, angle: Math.atan2(piece.y, piece.x) }))
    .sort((a, b) => a.angle - b.angle)
  const flights: Flight[] = []
  for (const [rank, item] of order.entries()) {
    const angle = -Math.PI + ((rank + 0.5 + (random() - 0.5) * 0.35) * Math.PI * 2) / pieces.length
    const distance = Math.max(360, width * 0.65) * (0.75 + random() * 0.5)
    flights[item.index] = {
      from: { ...pieces[item.index] },
      dx: reduced ? 0 : Math.cos(angle) * distance,
      dy: reduced ? 0 : Math.sin(angle) * distance,
      spin: reduced ? 0 : (70 + random() * 170) * (random() < 0.5 ? -1 : 1),
      duration: reduced ? 120 : 580 + random() * 200,
      returnAt: reduced ? 220 : 1500 + random() * 420,
      returnDuration: reduced ? 280 : 1100 + random() * 600,
      zoom: !reduced,
    }
  }
  return {
    elapsed: 0,
    reduced,
    flights,
    flightEnd: Math.max(0, ...flights.map((f) => f.duration)),
    end: Math.max(0, ...flights.map((f) => f.returnAt + f.returnDuration)),
  }
}

export function burstFragment(flight: Flight, elapsed: number, target: Piece) {
  if (elapsed < flight.duration) {
    const t = clamp(elapsed / flight.duration)
    const travel = 1 - (1 - t) ** 2
    return {
      piece: {
        ...flight.from,
        x: flight.from.x + flight.dx * travel,
        y: flight.from.y + flight.dy * travel,
        angle: flight.from.angle + flight.spin * travel,
      },
      opacity: 1 - smooth(clamp((t - 0.12) / 0.88)),
    }
  }
  // Grow into the live border without a reverse flight or an opacity ramp.
  const progress = smooth(clamp((elapsed - flight.returnAt) / flight.returnDuration))
  return flight.zoom
    ? { piece: { ...target, size: target.size * progress }, opacity: 1 }
    : { piece: target, opacity: progress }
}
