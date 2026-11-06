import { createPassage } from './passage-3d.ts'
import { assembleTiles, paintTile, type Tile } from './tiles.ts'

// Accepted rounded rest face; a new spatial opening made from those fragments.
// Every cut travels with its own plane in the shared perspective scene.
const state = {
  manual: false,
  opening: 0,
  gap: 18,
  fold: 68,
  depth: 170,
  perspective: 420,
  inspect: false,
}
const refresh: (() => void)[] = []
const controls = document.createElement('details')
controls.id = 'button-study-controls'
controls.open = innerWidth > 600
controls.innerHTML = `<summary>Passage aus Fragmenten</summary>
  <p>Die Teile öffnen sich räumlich. Vorn aufgefächert, hinten kleiner und tiefer. Hover öffnet die Passage.</p>
  <label>Öffnung<input aria-label="Öffnung" data-setting="opening" type="range" min="0" max="1" step="0.01" value="0"></label>
  <label>Abstand<input aria-label="Abstand" data-setting="gap" type="range" min="6" max="40" step="1" value="18"></label>
  <label>Neigung<input aria-label="Neigung" data-setting="fold" type="range" min="0" max="100" step="1" value="68"></label>
  <label>Tiefe<input aria-label="Tiefe" data-setting="depth" type="range" min="40" max="300" step="5" value="170"></label>
  <label>Perspektive<input aria-label="Perspektive" data-setting="perspective" type="range" min="220" max="900" step="10" value="420"></label>
  <label class="preview-toggle"><input type="checkbox" data-setting="inspect">Teile einfärben</label>
  <button type="button" data-action="find">Zum Button</button>
  <button type="button" data-action="close">Zusammenlegen</button>
  <button type="button" data-action="open">Passage öffnen</button>
  <button type="button" data-action="follow">Hover folgen</button>`
document.body.appendChild(controls)
function findButton() {
  document
    .querySelector('.temple-entry-welcome .magic-study')
    ?.scrollIntoView({ block: 'center', behavior: 'instant' })
}
controls.addEventListener('input', (event) => {
  const input = event.target as HTMLInputElement
  if (input.dataset.setting === 'opening') {
    state.manual = true
    state.opening = Number(input.value)
  }
  if (input.dataset.setting === 'gap') state.gap = Number(input.value)
  if (input.dataset.setting === 'fold') state.fold = Number(input.value)
  if (input.dataset.setting === 'depth') state.depth = Number(input.value)
  if (input.dataset.setting === 'perspective') state.perspective = Number(input.value)
  if (input.dataset.setting === 'inspect') state.inspect = input.checked
  refresh.forEach((update) => update())
})
controls.addEventListener('click', (event) => {
  const action = (event.target as HTMLElement).dataset.action
  if (action === 'find') findButton()
  if (action === 'close' || action === 'open') {
    state.manual = true
    state.opening = action === 'open' ? 1 : 0
  }
  if (action === 'follow') state.manual = false
  refresh.forEach((update) => update())
})

function mountFragments(button: HTMLElement) {
  button.classList.add('magic-study')
  const lifecycle = new AbortController()
  const options = { passive: true, signal: lifecycle.signal }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const canvas = document.createElement('canvas')
  canvas.className = 'button-study-surface'
  canvas.setAttribute('aria-hidden', 'true')
  button.appendChild(canvas)
  const ctx = canvas.getContext('2d')!
  const depthSurface = document.createElement('div')
  depthSurface.className = 'button-study-surface button-study-depth'
  depthSurface.setAttribute('aria-hidden', 'true')
  button.appendChild(depthSurface)
  let passage: ReturnType<typeof createPassage> | undefined
  let width = 0,
    height = 0
  let hovered = false,
    focused = false,
    visible = false
  let progress = 0,
    target = 0,
    raf = 0,
    last = 0
  let tiles: Tile[] = []
  const ratio = Math.min(devicePixelRatio || 1, 2)
  const pad = 100
  let sidePad = pad
  const reportsOpening = !!button.closest('.temple-entry-welcome')
  function wake() {
    if (!raf && visible && !document.hidden && !lifecycle.signal.aborted)
      raf = requestAnimationFrame(frame)
  }
  function update() {
    target = state.manual ? state.opening : hovered || focused ? 1 : 0
    wake()
  }
  function measure() {
    width = button.offsetWidth
    height = button.offsetHeight
    const bounds = button.getBoundingClientRect()
    sidePad = Math.max(0, Math.min(pad, bounds.left, innerWidth - bounds.right) - 2)
    canvas.width = Math.ceil((width + 2 * sidePad) * ratio)
    canvas.height = Math.ceil((height + 2 * pad) * ratio)
    canvas.style.width = `${width + 2 * sidePad}px`
    canvas.style.height = `${height + 2 * pad}px`
    canvas.style.left = `${-sidePad - 1}px`
    canvas.style.top = `${-pad - 1}px`
    depthSurface.style.cssText = canvas.style.cssText
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
    if (canvas.dataset.size !== `${width}/${height}`) {
      tiles = assembleTiles(width, height)
      passage = createPassage(tiles, width, height)
      depthSurface.replaceChildren(passage.element)
      canvas.dataset.size = `${width}/${height}`
    }
    if (passage) {
      passage.element.style.left = `${sidePad}px`
      passage.element.style.top = `${pad}px`
    }
    update()
  }
  function frame(now: number) {
    raf = 0
    if (!visible || document.hidden || lifecycle.signal.aborted) {
      last = 0
      return
    }
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60
    last = now
    if (state.manual || reduced.matches) progress = target
    else progress += (target - progress) * (1 - Math.exp(-dt * (target > progress ? 5.4 : 7.5)))
    if (Math.abs(progress - target) < 0.001) progress = target
    const isClosed = progress === 0
    canvas.style.visibility = isClosed ? 'visible' : 'hidden'
    depthSurface.style.visibility = isClosed ? 'hidden' : 'visible'
    if (isClosed) {
      ctx.clearRect(0, 0, width + 2 * sidePad, height + 2 * pad)
      ctx.save()
      ctx.translate(sidePad, pad)
      tiles.forEach((tile, i) =>
        paintTile(
          ctx,
          tile,
          0,
          0,
          state.inspect
            ? ['#77736e', '#47443f', '#96928b', '#5c5a55', '#b0aca5', '#373532', '#85837e'][i % 7]
            : '#373532',
        ),
      )
      ctx.restore()
    } else passage?.update(progress, state)
    // The open passage exposes the pale page: keep the native words legible.
    const ink = Math.max(0, Math.min(1, (progress - 0.58) / 0.12))
    const colour = [255 + (55 - 255) * ink, 255 + (53 - 255) * ink, 255 + (50 - 255) * ink].map(
      Math.round,
    )
    button.style.setProperty('color', `rgb(${colour.join(' ')})`)
    button.dataset.material = ''
    button.dataset.opening = progress.toFixed(3)
    button.dataset.pieces = String(tiles.length)
    if (reportsOpening)
      controls.querySelector<HTMLInputElement>('[data-setting="opening"]')!.value = String(progress)
    if (progress !== target) wake()
    else last = 0
  }
  refresh.push(update)
  button.addEventListener(
    'pointerenter',
    () => {
      hovered = true
      update()
    },
    options,
  )
  button.addEventListener(
    'pointerleave',
    () => {
      hovered = false
      update()
    },
    options,
  )
  button.addEventListener(
    'focus',
    () => {
      focused = true
      update()
    },
    options,
  )
  button.addEventListener(
    'blur',
    () => {
      focused = false
      update()
    },
    options,
  )
  document.documentElement.addEventListener(
    'pointerleave',
    () => {
      hovered = false
      update()
    },
    options,
  )
  window.addEventListener('resize', measure, options)
  reduced.addEventListener('change', update, { signal: lifecycle.signal })
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden) {
        cancelAnimationFrame(raf)
        raf = 0
        last = 0
      } else wake()
    },
    options,
  )
  const observer = new ResizeObserver(measure)
  observer.observe(button)
  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting
    if (!visible) {
      cancelAnimationFrame(raf)
      raf = 0
      last = 0
    } else wake()
  })
  intersection.observe(button)
  window.addEventListener(
    'pagehide',
    () => {
      lifecycle.abort()
      observer.disconnect()
      intersection.disconnect()
      cancelAnimationFrame(raf)
      canvas.width = canvas.height = 0
      tiles = []
      passage = undefined
      depthSurface.replaceChildren()
    },
    { once: true },
  )
}
async function start() {
  for (let i = 0; i < 120; i++) {
    if (
      document.querySelector(
        '.temple-artwork[data-state="ready"],.temple-artwork[data-state="fallback"]',
      )
    )
      break
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  document
    .querySelectorAll<HTMLElement>(
      '.temple-entry-welcome .fact-action a,.temple-entry-closing a,.temple-nav-enter a',
    )
    .forEach(mountFragments)
  if (new URL(location.href).searchParams.has('button-study')) findButton()
}
start()
