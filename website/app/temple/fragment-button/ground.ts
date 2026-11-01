import { createGroundMotion } from './ground-motion.ts'
import { groundMaterialEvent } from './material.ts'

/** Native sticky layers pause one shared background through successive refrain holds. */
export function mountFragmentGround(
  host: HTMLElement,
  refrains: readonly { refrain: HTMLElement; refrainStage: HTMLElement }[],
  signal: AbortSignal,
) {
  const ground = document.createElement('div')
  ground.className = 'fragment-ground'
  ground.setAttribute('aria-hidden', 'true')
  let parent = ground
  const layers = refrains.map(() => {
    const layer = document.createElement('div')
    layer.className = 'fragment-ground-hold'
    parent.appendChild(layer)
    parent = layer
    return layer
  })
  parent.classList.add('fragment-ground-ink')
  host.insertBefore(ground, host.firstChild)
  const field = document.createElement('div')
  field.className = 'fragment-ground-field'
  field.setAttribute('aria-hidden', 'true')
  for (let layer = 0; layer < 3; layer++) {
    const plane = document.createElement('div')
    plane.className = 'fragment-ground-plane'
    plane.dataset.layer = String(layer)
    field.appendChild(plane)
  }
  parent.insertBefore(field, parent.firstChild)
  const motion = createGroundMotion(host, field, refrains, signal)
  // Layout/startup only. Scrolling never writes positions or toggles a mode.
  function resize() {
    const origin = host.getBoundingClientRect().top
    let previousHolds = 0
    for (const [i, { refrain, refrainStage }] of refrains.entries()) {
      const section = refrain.getBoundingClientRect()
      const hold = Math.max(0, section.height - refrainStage.offsetHeight)
      const stickyTop = parseFloat(getComputedStyle(refrainStage).top)
      const start = section.top - origin - stickyTop
      layers[i].style.height = `calc(100% - ${hold}px)`
      layers[i].style.top = `${previousHolds - start}px`
      previousHolds += hold
    }
    motion.resize()
  }
  // Fitted text and arriving styles can settle after the initial asset-ready
  // frame. Observe real layout inputs; our absolute layers cannot resize them.
  host.addEventListener(groundMaterialEvent, resize, { signal })
  const observer = new ResizeObserver(resize)
  observer.observe(host)
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
