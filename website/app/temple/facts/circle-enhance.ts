import { circleRestSurface, DensitySurface } from './circle-surface.ts'
import { createCircleFluid, type CircleFluid, type CircleTarget } from './circle-fluid.ts'
import { createVisibleAnimation } from '../visible-animation.ts'

/** Actual particle liquid behind native controls; bounded to the visible island. */
export function mountCircle(
  root: HTMLFieldSetElement,
  signal: AbortSignal,
  membership?: {
    choose(spot: number): void
    owner(): number | undefined
    selected(): number | undefined
  },
) {
  const invite = root.querySelector<HTMLButtonElement>('.fact-circle-invite')
  if (!invite || signal.aborted) return
  const places = [...root.querySelectorAll<HTMLInputElement>('input[type="radio"]')]
  const surface = root.querySelector<SVGPathElement>('.fact-circle-surface path')!
  const rest = circleRestSurface
  const shape = (path: string) => {
    surface.setAttribute('d', path)
  }
  let target: HTMLInputElement | undefined
  let chosen: HTMLInputElement | undefined
  const heldSpot = () =>
    membership?.owner() ??
    membership?.selected() ??
    (chosen?.checked ? Number(chosen.value) : undefined)
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  // Allocate the numerical study only when visible and motion is allowed.
  let fluid: CircleFluid | undefined
  let contour: DensitySurface | undefined
  let wanted: CircleTarget | null = null
  let last = 0
  let accumulator = 0
  let idle = 0
  const coordinates = (x: number, y: number) => {
    const box = root.getBoundingClientRect()
    return {
      x: 40 + ((x - box.left) * 280) / box.width,
      y: 40 + ((y - box.top) * 280) / box.height,
    }
  }
  const syncDots = () => {
    if (!fluid) return
    const scale = 280 / root.getBoundingClientRect().width
    fluid.dots = places.map((input) => {
      const box = input.getBoundingClientRect()
      const dot = input.parentElement!.querySelector<HTMLElement>('.fact-circle-dot')!
      return {
        ...coordinates(box.x + box.width / 2, box.y + box.height / 2),
        r: (dot.offsetWidth * scale) / 2,
      }
    })
  }
  function draw(now: number) {
    if (reduced.matches) {
      shape(rest)
      return
    }
    if (!fluid) {
      fluid = createCircleFluid()
      contour = new DensitySurface()
      syncDots()
    }
    fluid.setTarget(wanted)
    accumulator += last ? Math.min((now - last) / 1000, 0.05) : 1 / 60
    last = now
    let steps = 0
    while (accumulator >= 1 / 120 && steps < 6) {
      fluid.step()
      accumulator -= 1 / 120
      steps++
    }
    shape(contour!.update(fluid))
    idle = wanted ? 0 : idle + steps / 120
    // Preserve the actual released material rather than substituting a pose.
    // Stop residual numerical motion once calm, with an eight-second ceiling.
    if (wanted || (idle < 8 && (idle < 2 || fluid.metrics().energy > 1))) animation.request()
    else animation.stop()
  }
  const animation = createVisibleAnimation(signal, {
    target: root,
    draw,
    resume: wake,
    reset() {
      last = 0
      accumulator = 0
    },
  })
  function wake() {
    if (!animation.active) return
    if (reduced.matches) {
      animation.stop()
      shape(rest)
    } else animation.request()
  }
  const pull = (next: CircleTarget | null) => {
    if (!reduced.matches) fluid?.setTarget(next)
    wanted = next
    idle = 0
    wake()
  }
  const ripples = new Set<Animation>()
  const cancelRipples = () => {
    for (const animation of ripples) animation.cancel()
    ripples.clear()
  }
  const reset = () => {
    const selected = heldSpot()
    if (selected && !signal.aborted) {
      const input = places.find((p) => Number(p.value) === selected)
      if (input) {
        point(input)
        return
      }
    }
    target = undefined
    delete root.dataset.pointing
    delete root.dataset.target
    pull(null)
    for (const input of places) delete input.parentElement!.dataset.aimed
  }
  const aim = (x: number, y: number) => {
    const free = places.filter((input) => !input.disabled && !input.checked)
    target = free.reduce<HTMLInputElement | undefined>((nearest, input) => {
      const distance = (node: HTMLInputElement) => {
        const box = node.getBoundingClientRect()
        return Math.hypot(box.x + box.width / 2 - x, box.y + box.height / 2 - y)
      }
      return !nearest || distance(input) < distance(nearest) ? input : nearest
    }, undefined)
    if (!target) {
      reset()
      return
    }
    point(target, x, y)
  }
  const point = (input: HTMLInputElement, mouseX?: number, mouseY?: number) => {
    target = input
    const box = target.getBoundingClientRect()
    const dot = input.parentElement!.querySelector<HTMLElement>('.fact-circle-dot')!
    const centre = coordinates(box.x + box.width / 2, box.y + box.height / 2)
    const radius = (dot.offsetWidth * 140) / root.getBoundingClientRect().width
    let next: CircleTarget | null = { ...centre, r: radius }
    if (mouseX !== undefined && mouseY !== undefined) {
      const mouse = coordinates(mouseX, mouseY)
      const distance = Math.hypot(mouse.x - centre.x, mouse.y - centre.y)
      const outward = Math.hypot(mouse.x - 180, mouse.y - 180)
      if (distance >= 27) next = outward > 38 && outward < 145 ? { ...mouse, r: 0 } : null
    }
    pull(next)
    root.dataset.pointing = ''
    root.dataset.target = target.value
    for (const input of places) {
      if (input === target) input.parentElement!.dataset.aimed = ''
      else delete input.parentElement!.dataset.aimed
    }
  }
  invite.addEventListener(
    'pointerenter',
    (event) => {
      if (event.pointerType === 'touch') return
      if (heldSpot()) return
      aim(event.clientX, event.clientY)
    },
    { signal },
  )
  root.addEventListener(
    'pointermove',
    (event) => {
      if (event.pointerType === 'touch') return
      if (heldSpot()) return
      const hoveredPlace = (event.target as Element)
        .closest('.fact-circle-place')
        ?.querySelector<HTMLInputElement>('input')
      if (hoveredPlace) {
        if (hoveredPlace.disabled || hoveredPlace.checked) {
          reset()
          return
        }
      }
      aim(event.clientX, event.clientY)
    },
    { signal },
  )
  root.addEventListener('pointerleave', reset, { signal })
  invite.addEventListener(
    'focus',
    () => {
      if (heldSpot()) return
      if (root.matches(':hover')) return
      const box = invite.getBoundingClientRect()
      aim(box.x + box.width / 2, box.y)
    },
    { signal },
  )
  invite.addEventListener(
    'click',
    () => {
      if (membership?.owner()) {
        membership.choose(membership.owner()!)
        return
      }
      if (membership && !places.some((p) => !p.disabled)) {
        membership.choose(1)
        return
      }
      if (membership?.selected()) {
        membership.choose(membership.selected()!)
        return
      }
      if (!target) {
        const box = invite.getBoundingClientRect()
        aim(box.x + box.width / 2, box.y)
      }
      const claimed = target
      if (claimed && !claimed.disabled) {
        if (membership) {
          membership.choose(Number(claimed.value))
          return
        }
        claimed.click()
        claimed.focus()
      }
    },
    { signal },
  )
  const ripple = (claimed: EventTarget | null) => {
    if (
      !(claimed instanceof HTMLInputElement) ||
      !claimed.checked ||
      claimed.disabled ||
      reduced.matches
    )
      return
    const ring = claimed.parentElement!.querySelector<HTMLElement>('.fact-circle-ripple')!
    for (const animation of ring.getAnimations()) animation.cancel()
    const animation = ring.animate(
      [
        { transform: 'scale(1.2)', opacity: 0.5 },
        { transform: 'scale(2.4)', opacity: 0 },
      ],
      { duration: 580, easing: 'cubic-bezier(.2,.65,.3,1)' },
    )
    ripples.add(animation)
    const finished = () => {
      ripples.delete(animation)
    }
    void animation.finished.then(finished, finished)
  }
  root.addEventListener('circle-selection', reset, { signal })
  if (membership) {
    root.addEventListener(
      'click',
      (event) => {
        if (!(event.target instanceof HTMLInputElement) || event.target.disabled) return
        event.preventDefault()
        const spot = Number(event.target.value)
        // Let the canceled radio activation restore its native state before rendering.
        setTimeout(() => {
          if (!signal.aborted) membership.choose(spot)
        }, 0)
      },
      { signal },
    )
  }
  root.addEventListener(
    'change',
    (event) => {
      if (!membership && event.target instanceof HTMLInputElement && !event.target.disabled)
        chosen = event.target
      reset()
      if (membership && event.target instanceof HTMLInputElement) {
        const spot = Number(event.target.value)
        event.target.checked = false
        const owner = places.find((p) => Number(p.value) === membership.owner())
        if (owner) owner.checked = true
        membership.choose(spot)
      } else ripple(event.target)
    },
    { signal },
  )
  root.addEventListener(
    'circle-claimed',
    (event) =>
      ripple(places.find((p) => Number(p.value) === (event as CustomEvent<number>).detail) ?? null),
    { signal },
  )
  reduced.addEventListener(
    'change',
    () => {
      if (reduced.matches) cancelRipples()
      wake()
    },
    { signal },
  )
  root.addEventListener(
    'focusout',
    (event) => {
      if (!root.contains(event.relatedTarget as Node | null)) reset()
    },
    { signal },
  )
  const size = new ResizeObserver(() => {
    syncDots()
    reset()
  })
  size.observe(root)
  root.addEventListener(
    'focusin',
    (event) => {
      if (heldSpot()) return
      if (event.target instanceof HTMLInputElement && !event.target.disabled) point(event.target)
    },
    { signal },
  )
  signal.addEventListener(
    'abort',
    () => {
      size.disconnect()
      shape(rest)
      cancelRipples()
    },
    { once: true },
  )
}
