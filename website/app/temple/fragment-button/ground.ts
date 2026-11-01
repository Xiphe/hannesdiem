import { createGroundMotion } from './ground-motion.ts'
import { groundMaterialEvent } from './material.ts'

/** One page-length sculpture. Its negative spaces follow the actual choruses. */
export function mountFragmentGround(
  host: HTMLElement,
  refrains: readonly { refrain: HTMLElement; refrainStage: HTMLElement }[],
  signal: AbortSignal,
) {
  const ground = document.createElement('div')
  ground.className = 'fragment-ground fragment-ground-ink'
  ground.setAttribute('aria-hidden', 'true')
  const field = document.createElement('div')
  field.className = 'fragment-ground-field'
  field.setAttribute('aria-hidden', 'true')
  for (let layer = 0; layer < 3; layer++) {
    const plane = document.createElement('div')
    plane.className = 'fragment-ground-plane'
    plane.dataset.layer = String(layer)
    field.appendChild(plane)
  }
  ground.appendChild(field)
  host.insertBefore(ground, host.firstChild)
  const motion = createGroundMotion(host, field, refrains, signal)
  // Fitted text and arriving styles can settle after the initial asset-ready
  // frame. Observe real layout inputs; our absolute layers cannot resize them.
  host.addEventListener(groundMaterialEvent, motion.resize, { signal })
  const observer = new ResizeObserver(motion.resize)
  observer.observe(host)
  for (const bridge of host.querySelectorAll('.bridge-copy, .bridge-body')) observer.observe(bridge)
  for (const { refrain, refrainStage } of refrains) {
    observer.observe(refrain)
    observer.observe(refrainStage)
  }
  signal.addEventListener(
    'abort',
    () => {
      observer.disconnect()
      ground.remove()
    },
    { once: true },
  )
}
