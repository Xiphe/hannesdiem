export type PacePoint = { scroll: number; scene: number; ground: number }
export type ClosingPace = ReturnType<typeof createClosingPace>
const plans = new WeakMap<HTMLElement, ClosingPace>()

export function closingPace(host: HTMLElement) {
  return plans.get(host)
}
export function provideClosingPace(host: HTMLElement, pace?: ClosingPace) {
  if (pace) plans.set(host, pace)
  else plans.delete(host)
}

/** Keep choreography time independent of the scene's slowing travel. */
export function createClosingPace(
  onset: number,
  complete: number,
  viewport: number,
  stretch: number,
  settled: number,
) {
  const ramp = Math.min(viewport * 0.15, (complete - onset) / 2)
  const positions = Array.from({ length: 17 }, (_, index) => onset + (ramp * index) / 16)
  positions.push(complete)
  const points: PacePoint[] = positions.map((scene) => {
    const t = Math.min(1, (scene - onset) / ramp)
    const extra = (stretch - 1) * (ramp * (t ** 3 - t ** 4 / 2) + Math.max(0, scene - onset - ramp))
    return { scene, scroll: scene + extra, ground: scene - extra * 0.25 }
  })
  function interpolate(
    value: number,
    from: 'scroll' | 'scene',
    to: 'scroll' | 'scene' | 'ground',
    samples = points,
  ) {
    if (value <= onset) return value
    const last = samples.at(-1)!
    if (value >= last[from]) return last[to] + value - last[from]
    const index = samples.findIndex((point) => point[from] >= value)
    const a = samples[index - 1],
      b = samples[index]
    return a[to] + ((b[to] - a[to]) * (value - a[from])) / (b[from] - a[from])
  }
  const rampEnd = points.at(-2)!
  const release = points.at(-1)!.scroll
  const groundStop = rampEnd.scroll + (release - rampEnd.scroll) * 0.95
  const braking = groundStop - rampEnd.scroll
  const initialRate = Math.max(0, 1 - (1 - 1 / stretch) * 1.25)
  const groundPoints = points.slice(0, -1)
  for (let index = 1; index <= 32; index++) {
    const elapsed = (braking * index) / 32
    const scroll = rampEnd.scroll + elapsed
    groundPoints.push({
      scroll,
      scene: interpolate(scroll, 'scroll', 'scene'),
      ground: rampEnd.ground + initialRate * (elapsed - elapsed ** 2 / (2 * braking)),
    })
  }
  groundPoints.push({ scene: complete, scroll: release, ground: groundPoints.at(-1)!.ground })
  // Finish the calls' own approach by joining the ground's scroll velocity.
  // The assembling copy is held independently of this continued scene travel.
  const settleScroll = Math.max(
    rampEnd.scroll,
    Math.min(release, interpolate(settled, 'scene', 'scroll')),
  )
  const brakeStart = Math.max(rampEnd.scroll, settleScroll - viewport * 0.15)
  const motionPoints = points.filter(({ scroll }) => scroll <= brakeStart)
  const origin = interpolate(brakeStart, 'scroll', 'scene')
  if (motionPoints.at(-1)!.scroll < brakeStart)
    motionPoints.push({
      scroll: brakeStart,
      scene: origin,
      ground: interpolate(brakeStart, 'scroll', 'ground', groundPoints),
    })
  const brakingLength = settleScroll - brakeStart
  let travel = origin
  let previous = brakeStart
  for (let index = 1; index <= 32 && brakingLength > 0; index++) {
    const t = index / 32
    const scroll = brakeStart + brakingLength * t
    const midpoint = (index - 0.5) / 32
    const mix = midpoint * midpoint * (3 - 2 * midpoint)
    travel +=
      (interpolate(scroll, 'scroll', 'scene') - interpolate(previous, 'scroll', 'scene')) *
        (1 - mix) +
      (interpolate(scroll, 'scroll', 'ground', groundPoints) -
        interpolate(previous, 'scroll', 'ground', groundPoints)) *
        mix
    motionPoints.push({
      scroll,
      scene: travel,
      ground: interpolate(scroll, 'scroll', 'ground', groundPoints),
    })
    previous = scroll
  }
  const groundOrigin = interpolate(settleScroll, 'scroll', 'ground', groundPoints)
  for (const point of groundPoints.filter(({ scroll }) => scroll > settleScroll))
    motionPoints.push({ ...point, scene: travel + point.ground - groundOrigin })
  const extra = release - motionPoints.at(-1)!.scene
  return {
    points,
    motionPoints,
    groundPoints,
    groundStop,
    onset,
    extra,
    complete: points.at(-1)!.scroll,
    map: (scene: number) => interpolate(scene, 'scene', 'scroll'),
    sceneAt: (scroll: number) => interpolate(scroll, 'scroll', 'scene'),
    travelAt: (scroll: number) => interpolate(scroll, 'scroll', 'scene', motionPoints),
    groundAt: (scroll: number) => interpolate(scroll, 'scroll', 'ground', groundPoints),
    groundRateAt(scroll: number) {
      if (scroll <= onset || scroll >= release) return 1
      if (scroll >= groundStop) return 0
      const index = groundPoints.findIndex((point) => point.scroll >= scroll)
      const a = groundPoints[index - 1],
        b = groundPoints[index]
      return (b.ground - a.ground) / (b.scroll - a.scroll)
    },
  }
}
