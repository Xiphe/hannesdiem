type Trace = {
  start: number
  life: number
  origin: number
  direction: number
  speed: number
  persistence: number
  brightness: number
  shade: readonly [number, number, number]
}
export type TraceField = {
  time: number
  next: number
  traces: Trace[]
  random: () => number
}

export const traceHeadLength = (speed: number) => 4 + ((speed - 65) / 55) * 20
const shades = [
  [183, 211, 229],
  [207, 216, 225],
  [204, 204, 226],
  [221, 215, 203],
] as const
const smooth = (t: number) => {
  const x = Math.max(0, Math.min(1, t))
  return x * x * (3 - 2 * x)
}

export function createTraceField(random = Math.random): TraceField {
  return { time: 0, next: 0, traces: [], random }
}

export function advanceTraces(field: TraceField, seconds: number) {
  field.time += seconds
  field.traces = field.traces.filter((t) => field.time - t.start < t.life + t.persistence)
  const moving = field.traces.some((t) => field.time - t.start < t.life - 0.6)
  if (field.traces.length < 3 && (!moving || field.time >= field.next)) {
    const random = field.random
    const life = 2 + random() * 1.8
    const nextFree =
      field.traces.length === 2
        ? Math.min(...field.traces.map((t) => t.start + t.life + t.persistence))
        : field.time
    field.traces.push({
      // The first light is already emerging when the button comes into view.
      start: field.time - (field.traces.length === 0 ? 0.6 : 0),
      // When all three slots are occupied, keep the newest source travelling
      // until an older tail has cleared and its replacement can emerge.
      life: Math.max(life, nextFree - field.time + 0.65),
      origin: random(),
      direction: random() < 0.5 ? -1 : 1,
      speed: 65 + random() * 55,
      persistence: 1.8 + random() * 1.5,
      brightness: 0.75 + random() * 0.6,
      shade: shades[Math.floor(random() * shades.length)],
    })
    field.next = field.time + 0.4 + random() * 1.3
  }
}

/** Light left at one fixed point on the outline, after the source passes it. */
export function traceSample(field: TraceField, distance: number, perimeter: number) {
  let light = 0
  let red = 0,
    green = 0,
    blue = 0
  for (const trace of field.traces) {
    let contribution = 0
    const age = field.time - trace.start
    const travelled = Math.min(age, trace.life) * trace.speed
    let along =
      ((((distance - trace.origin * perimeter) * trace.direction) % perimeter) + perimeter) %
      perimeter
    // A later pass adds light without discarding an earlier, lingering deposit.
    if (travelled < along) continue
    for (; along <= travelled; along += perimeter) {
      const birth = along / trace.speed
      const since = age - birth
      const source = smooth(birth / 0.4) * smooth((trace.life - birth) / 1.1)
      const head = Math.exp((-since * trace.speed) / traceHeadLength(trace.speed))
      const tail = Math.max(0, 1 - since / trace.persistence) ** 2
      contribution += trace.brightness * source * tail * (head * 0.85 + 0.5)
    }
    light += contribution
    red += trace.shade[0] * contribution
    green += trace.shade[1] * contribution
    blue += trace.shade[2] * contribution
  }
  return {
    light,
    red: light ? red / light : 183,
    green: light ? green / light : 211,
    blue: light ? blue / light : 229,
  }
}

export function traceLight(field: TraceField, distance: number, perimeter: number) {
  return traceSample(field, distance, perimeter).light
}
