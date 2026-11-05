import { circleSurface } from './circle-shape.ts'
import { createCircleFluid } from './circle-fluid.ts'

/** Draw a pool around a free place, preserving native controls and the steady label. */
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
  const surface = invite.querySelector<SVGPathElement>('.fact-circle-surface path')!
  const artwork = surface.ownerSVGElement!
  const rest = circleSurface()
  const shape = (path: string) => {
    surface.setAttribute('d', path)
  }
  let target: HTMLInputElement | undefined
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const fluid = createCircleFluid()
  let frame = 0
  let last = 0
  let visible = true
  const stop = () => {
    cancelAnimationFrame(frame)
    frame = 0
    last = 0
  }
  const draw = (now: number) => {
    frame = 0
    if (signal.aborted || document.hidden || !visible) return
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60
    last = now
    shape(circleSurface(fluid.step(dt, reduced.matches)))
    if (fluid.active && !reduced.matches) frame = requestAnimationFrame(draw)
    else last = 0
  }
  const wake = () => {
    if (signal.aborted || document.hidden || !visible) return
    if (reduced.matches) {
      stop()
      draw(performance.now())
    } else if (!frame) frame = requestAnimationFrame(draw)
  }
  const visibility = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting
    if (visible) wake()
    else stop()
  })
  visibility.observe(root)
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden) stop()
      else wake()
    },
    { signal },
  )
  const ripples = new Set<Animation>()
  const cancelRipples = () => {
    for (const animation of ripples) animation.cancel()
    ripples.clear()
  }
  const reset = () => {
    const selected = membership?.selected()
    if (selected && !membership?.owner() && !signal.aborted) {
      const input = places.find((p) => Number(p.value) === selected)
      if (input) {
        point(input)
        return
      }
    }
    target = undefined
    delete root.dataset.pointing
    delete root.dataset.target
    fluid.release()
    wake()
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
    const centre = invite.getBoundingClientRect()
    const cx = centre.x + centre.width / 2,
      cy = centre.y + centre.height / 2
    const dx = box.x + box.width / 2 - cx
    const dy = box.y + box.height / 2 - cy
    const view = artwork.viewBox.baseVal
    const scale = view.width / centre.width
    let x = dx,
      y = dy,
      pull = 1
    if (mouseX !== undefined && mouseY !== undefined) {
      const mx = mouseX - cx,
        my = mouseY - cy
      const distance = Math.hypot(mx - dx, my - dy)
      const magnet = 0.35 + 0.65 * Math.exp(-((distance / 45) ** 2))
      x = mx + (dx - mx) * magnet
      y = my + (dy - my) * magnet
      // Continuous pull between places; the centre itself remains at rest.
      pull = Math.min(1, Math.max(0, (Math.hypot(mx, my) - 12) / 28))
    }
    const dot = input.parentElement!.querySelector<HTMLElement>('.fact-circle-dot')!
    fluid.aim(Number(input.value), x * scale, y * scale, (dot.offsetWidth * 0.6 + 9) * scale, pull)
    wake()
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
      if (membership?.owner() || membership?.selected()) return
      aim(event.clientX, event.clientY)
    },
    { signal },
  )
  root.addEventListener(
    'pointermove',
    (event) => {
      if (event.pointerType === 'touch') return
      if (membership?.owner() || membership?.selected()) return
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
      if (membership?.owner() || membership?.selected()) return
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
      if (claimed && !claimed.disabled && !claimed.checked) {
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
  addEventListener('resize', reset, { signal })
  signal.addEventListener(
    'abort',
    () => {
      stop()
      visibility.disconnect()
      shape(rest)
      cancelRipples()
    },
    { once: true },
  )
}
