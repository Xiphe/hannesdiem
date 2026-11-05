import { circleSurface } from './circle-shape.ts'

/** Gently pull the button's edge toward a free place, preserving its body and label. */
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
    surface.style.setProperty('d', `path("${path}")`)
    surface.setAttribute('d', path)
  }
  let target: HTMLInputElement | undefined
  let active = false
  let heading: number | undefined
  const signed = (angle: number) => ((((angle + 180) % 360) + 360) % 360) - 180
  const orient = (angle: number) => {
    if (heading !== undefined && Math.abs(signed(angle - heading)) < 0.001) return
    const moving = root.hasAttribute('data-pointing') || surface.getAnimations().length > 0
    // Read the displayed angle when interrupted, then take the shortest turn.
    // Repeated events for the same dot must not restart the native easing.
    const current = parseFloat(getComputedStyle(artwork).rotate) || 0
    artwork.style.rotate = `${current + signed(angle - current)}deg`
    heading = angle
    // A resting circle has no direction. Orient it before extending its point;
    // carry the existing point smoothly when a turn or retraction is underway.
    if (!moving) for (const animation of artwork.getAnimations()) animation.finish()
  }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
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
    active = false
    target = undefined
    delete root.dataset.pointing
    delete root.dataset.target
    shape(rest)
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
    point(target)
  }
  const point = (input: HTMLInputElement) => {
    target = input
    const box = target.getBoundingClientRect()
    const centre = invite.getBoundingClientRect()
    const dx = box.x + box.width / 2 - (centre.x + centre.width / 2)
    const dy = box.y + box.height / 2 - (centre.y + centre.height / 2)
    const view = artwork.viewBox.baseVal
    const localX = (dx * view.width) / centre.width
    const localY = (dy * view.height) / centre.height
    const scale = Math.hypot(localX, localY) / Math.hypot(dx, dy)
    orient((Math.atan2(localY, localX) * 180) / Math.PI)
    // Morph only the reach of one aligned outline. Its heading belongs to the
    // SVG's native rotation, avoiding overlapping old and new arms.
    shape(circleSurface(Math.hypot(localX, localY), 0, 24 * scale))
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
      active = true
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
        active = true
      }
      if (invite.contains(event.target as Node)) active = true
      if (active) aim(event.clientX, event.clientY)
    },
    { signal },
  )
  root.addEventListener('pointerleave', reset, { signal })
  invite.addEventListener(
    'focus',
    () => {
      if (membership?.owner() || membership?.selected()) return
      if (active) return
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
      reset()
      cancelRipples()
    },
    { once: true },
  )
}
