import { borderEdge, randomFrom, type Piece } from './fragment-generator.ts'
import { createFragmentBurst, burstFragment, type FragmentBurst } from './fragment-burst.ts'
import {
  createBorderFlow,
  advanceBorderFlow,
  travellingBorderPoses,
  type BorderFlow,
} from './border-flow.ts'

type Bounds = { width: number; height: number }
type Point = { x: number; y: number }
export type BorderPose = {
  aligned: Piece
  pivot: Point
  localPivot: Point
  side: number
  tilt: number
  phase: number
  period: number
  idlePivot?: Point
  heading?: number
}
const radians = (degrees: number) => (degrees * Math.PI) / 180
const turn = (p: Point, degrees: number): Point => ({
  x: p.x * Math.cos(radians(degrees)) - p.y * Math.sin(radians(degrees)),
  y: p.x * Math.sin(radians(degrees)) + p.y * Math.cos(radians(degrees)),
})
const signed = (angle: number) => ((((angle + 180) % 360) + 360) % 360) - 180
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

// One piece, one nearest edge slot. No redistribution, scaling, or shape changes.
export function prepareBorderPose(piece: Piece, bounds: Bounds, seed: string): BorderPose {
  const [a, b] = borderEdge(piece)
  const localPivot = {
    x: (((a.x + b.x) / 2 + (piece.origin?.[0] ?? 0)) * piece.size) / 28,
    y: (((a.y + b.y) / 2 + (piece.origin?.[1] ?? 0)) * piece.size) / 28,
  }
  const old = turn(localPivot, piece.angle)
  const centre = { x: piece.x + old.x, y: piece.y + old.y }
  const w = bounds.width / 2,
    h = bounds.height / 2
  const targets = [
    { x: clamp(centre.x, -w, w), y: -h },
    { x: w, y: clamp(centre.y, -h, h) },
    { x: clamp(centre.x, -w, w), y: h },
    { x: -w, y: clamp(centre.y, -h, h) },
  ]
  let side = 0
  for (let i = 1; i < targets.length; i++)
    if (
      Math.hypot(targets[i].x - centre.x, targets[i].y - centre.y) <
      Math.hypot(targets[side].x - centre.x, targets[side].y - centre.y)
    )
      side = i
  const angle = signed(side * 90 - (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI)
  const pivot = targets[side]
  const rotated = turn(localPivot, angle)
  const random = randomFrom(seed)
  return {
    aligned: { ...piece, x: pivot.x - rotated.x, y: pivot.y - rotated.y, angle },
    pivot,
    localPivot,
    side,
    tilt: clamp(signed(piece.angle - angle), -22, 22),
    phase: random() * Math.PI * 2,
    period: 3700 + random() * 2900,
  }
}

export function floatingBorderPose(pose: BorderPose, time: number, still = false): Piece {
  const phase = still ? pose.phase : (time / pose.period) * Math.PI * 2 + pose.phase
  const heading = pose.heading ?? pose.side * 90
  const angle =
    pose.aligned.angle +
    signed(heading - pose.side * 90) +
    pose.tilt +
    (still ? 0 : Math.sin(phase) * 3)
  const rotated = turn(pose.localPivot, angle)
  const normal = radians(heading)
  const pivot = pose.idlePivot ?? pose.pivot
  const along = Math.sin(phase * 0.73) * 2.5
  const out = 3 + Math.cos(phase * 0.91) * 1.5
  return {
    ...pose.aligned,
    angle,
    x: pivot.x - rotated.x + Math.cos(normal) * along + Math.sin(normal) * out,
    y: pivot.y - rotated.y + Math.sin(normal) * along - Math.cos(normal) * out,
  }
}

export function mountBorderMotion(options: {
  stage: HTMLElement
  button: HTMLElement
  board: SVGSVGElement
  pieces: () => Piece[]
  bounds: () => Bounds
  paint: (node: SVGGElement, piece: Piece, index: number) => void
  signal: AbortSignal
}) {
  const { stage, button, board, signal } = options
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  let poses: BorderPose[] = []
  let nodes: SVGGElement[] = []
  let preview = false,
    hovered = false,
    pressed = false,
    focused = false,
    visible = false
  let frame = 0,
    last = 0
  let flow: BorderFlow | undefined
  let lastFlowTime = 0
  let burst: FragmentBurst | undefined
  let burstCount = 0
  let painted: Piece[] = []
  let wasAligned = false
  let transition: { from: Piece[]; start: number; duration: number } | undefined
  const active = () => hovered || pressed || focused
  const running = () =>
    preview &&
    !signal.aborted &&
    visible &&
    !document.hidden &&
    (Boolean(burst) || (!reduced.matches && (Boolean(transition) || !active())))
  function paint(time = performance.now()) {
    const aligned = active()
    const elapsed = clamp((time - lastFlowTime) / 1000, 0, 0.1)
    if (burst && visible && !document.hidden) burst.elapsed += elapsed * 1000
    if (
      flow &&
      !aligned &&
      !reduced.matches &&
      visible &&
      !document.hidden &&
      (!burst || burst.elapsed >= burst.flightEnd)
    )
      advanceBorderFlow(flow, elapsed)
    lastFlowTime = time
    const current = flow ? travellingBorderPoses(flow, poses) : poses
    board.toggleAttribute('data-border-aligned', preview && aligned)
    board.toggleAttribute('data-border-burst', Boolean(burst))
    const progress = transition ? clamp((time - transition.start) / transition.duration, 0, 1) : 1
    const blend = 1 - (1 - progress) ** 3
    painted = current.map((pose, i) => {
      nodes[i].dataset.borderSide = String(pose.side)
      const target = aligned ? pose.aligned : floatingBorderPose(pose, time, reduced.matches)
      const from = transition?.from[i]
      let piece =
        from && progress < 1
          ? {
              ...target,
              x: from.x + (target.x - from.x) * blend,
              y: from.y + (target.y - from.y) * blend,
              angle: from.angle + signed(target.angle - from.angle) * blend,
            }
          : target
      if (burst) {
        const sample = burstFragment(burst.flights[i], burst.elapsed, piece)
        piece = sample.piece
        nodes[i].style.opacity = String(sample.opacity)
      } else nodes[i].style.removeProperty('opacity')
      options.paint(nodes[i], piece, i)
      return piece
    })
    if (progress >= 1) transition = undefined
    if (burst && burst.elapsed >= burst.end) {
      burst = undefined
      board.removeAttribute('data-border-burst')
      for (const node of nodes) node.style.removeProperty('opacity')
    }
  }
  function tick(time: number) {
    frame = 0
    if (transition || burst || time - last >= 30) {
      paint(time)
      last = time
    }
    if (running()) frame = requestAnimationFrame(tick)
  }
  function update() {
    cancelAnimationFrame(frame)
    frame = 0
    if (!preview || signal.aborted) return
    const time = performance.now()
    if (reduced.matches && burst && !burst.reduced) burst = undefined
    const aligned = active()
    if (aligned !== wasAligned) {
      transition = burst ? undefined : { from: painted, start: time, duration: aligned ? 50 : 300 }
      wasAligned = aligned
    }
    if (reduced.matches || !visible || document.hidden) transition = undefined
    lastFlowTime = time
    paint(time)
    if (running()) frame = requestAnimationFrame(tick)
  }
  function refresh(enabled = preview) {
    preview = enabled
    transition = undefined
    burst = undefined
    painted = []
    wasAligned = active()
    if (preview) {
      const bounds = options.bounds()
      button.style.width = bounds.width + 'px'
      button.style.height = bounds.height + 'px'
      poses = options
        .pieces()
        .map((piece, i) => prepareBorderPose(piece, bounds, `${i}/${piece.d}`))
      flow = createBorderFlow(poses, bounds)
      lastFlowTime = performance.now()
      nodes = [...board.querySelectorAll<SVGGElement>('[data-piece]')]
      nodes.forEach((node, i) => (node.dataset.borderSide = String(poses[i].side)))
    } else {
      hovered = pressed = focused = false
      board.removeAttribute('data-border-aligned')
    }
    update()
  }
  button.addEventListener(
    'click',
    () => {
      if (!preview || burst || !painted.length) return
      burst = createFragmentBurst(
        painted,
        stage.clientWidth,
        `burst/${++burstCount}`,
        reduced.matches,
      )
      transition = undefined
      update()
    },
    { signal },
  )
  button.addEventListener(
    'pointerenter',
    (event) => {
      if (event.pointerType !== 'touch') {
        hovered = true
        update()
      }
    },
    { signal },
  )
  button.addEventListener(
    'pointerleave',
    () => {
      hovered = false
      update()
    },
    { signal },
  )
  button.addEventListener(
    'pointerdown',
    () => {
      pressed = true
      update()
    },
    { signal },
  )
  for (const event of ['pointerup', 'pointercancel', 'blur'])
    window.addEventListener(
      event,
      () => {
        pressed = false
        if (event === 'blur') hovered = focused = false
        update()
      },
      { signal },
    )
  button.addEventListener(
    'focus',
    () => {
      focused = button.matches(':focus-visible')
      update()
    },
    { signal },
  )
  button.addEventListener(
    'blur',
    () => {
      focused = false
      update()
    },
    { signal },
  )
  for (const event of ['keydown', 'keyup']) button.addEventListener(event, update, { signal })
  reduced.addEventListener('change', update, { signal })
  document.addEventListener('visibilitychange', update, { signal })
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting
    update()
  })
  observer.observe(stage)
  signal.addEventListener(
    'abort',
    () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    },
    { once: true },
  )
  return { refresh }
}
