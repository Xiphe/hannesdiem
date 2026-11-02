// THROWAWAY: layout and copy selection only. No signup mutation or new artwork clock.
import { fragments, actionContext } from './material.js'

const section = document.createElement('section')
section.className = 'watch-study'
section.id = 'watch'
section.setAttribute('aria-label', 'Watch')
section.innerHTML = `
  <div class="watch-pictures">
    <figure class="watch-daylight"><img src="/__watch/tos4.jpg" alt="" width="1920" height="1280" loading="lazy"></figure>
    <figure class="watch-fire"><img src="/__watch/tos2.jpg" alt="" width="1920" height="1280" loading="lazy"></figure>
  </div>
  <div class="watch-copy-tile">
    <h2 class="watch-heading">Watch</h2>
    <div class="watch-fragments"></div>
  </div>
  <div class="watch-action"><p></p><button type="button" disabled>get notified</button></div>
`
section.querySelector('.watch-action p').textContent = actionContext
for (const [index, fragment] of fragments.entries()) {
  const paragraph = document.createElement('p')
  paragraph.dataset.fragment = String(index)
  paragraph.textContent = fragment
  section.querySelector('.watch-fragments').append(paragraph)
}

const controls = document.createElement('aside')
controls.className = 'watch-review'
controls.setAttribute('aria-label', 'Watch prototype controls')
controls.innerHTML = `
  <output>Alongside</output>
  <fieldset><legend>Fragments</legend>${fragments.map((_, i) => `<label><input type="checkbox" data-toggle="${i}" checked>${i + 1}</label>`).join('')}</fieldset>
  <button class="watch-review-jump">Watch ↓</button>
  <small>Layout study · images are placeholders · signup not connected</small>
`
const selection = new Set([0, 1, 2])
const update = () => {
  section.dataset.variant = 'A'
  for (const paragraph of section.querySelectorAll('[data-fragment]')) {
    paragraph.hidden = !selection.has(Number(paragraph.dataset.fragment))
  }
  section.querySelector('.watch-fragments').dataset.count = String(selection.size)
  console.info('Watch study', { variant: 'A', visibleFragments: [...selection].map((i) => i + 1) })
}
controls.addEventListener('click', (event) => {
  if (event.target.closest('.watch-review-jump')) section.scrollIntoView({ block: 'start' })
})
controls.addEventListener('change', (event) => {
  const input = event.target.closest('[data-toggle]')
  if (!input) return
  if (input.checked) selection.add(Number(input.dataset.toggle))
  else selection.delete(Number(input.dataset.toggle))
  update()
})
document.addEventListener('keydown', (event) => {
  if (event.target.closest('input, textarea, select, [contenteditable]')) return
  if (event.key.toLowerCase() === 'h') controls.hidden = !controls.hidden
})
// Let the real Remix island connect before inserting a temporary, unowned study.
const mount = () => {
  const host = document.querySelector('.temple-artwork')
  const visit = host?.querySelector('.facts-grid')
  if (!visit || !['ready', 'fallback'].includes(host.dataset.state)) {
    requestAnimationFrame(mount)
    return
  }
  host.querySelector('.first-pair').after(section)
  // Keep Visit's colours, but give this reading surface a broader, softer
  // fragment contour. Round the geometry itself, not just the outline stroke.
  const copyTile = section.querySelector('.watch-copy-tile')
  const sourceMaterial = visit.querySelector('.text-solid .tile-material')
  const material = sourceMaterial.cloneNode(true)
  material.classList.add('watch-material')
  material.setAttribute('preserveAspectRatio', 'none')
  material.setAttribute('viewBox', '-100 -100 1250 1300')
  material
    .querySelector('path')
    .setAttribute(
      'd',
      'M135 70C80 44 38 64 36 124C18 370 40 626 18 858Q12 925 80 935C350 958 580 972 854 986Q922 994 930 926C950 686 966 418 984 166Q991 95 920 108C648 162 400 164 135 70Z',
    )
  const gradient = material.querySelector('linearGradient')
  const oldId = gradient.id
  gradient.id = 'watch-text-material'
  material.innerHTML = material.innerHTML.replaceAll(`url(#${oldId})`, 'url(#watch-text-material)')
  const materialBoundary = document.createElement('div')
  materialBoundary.className = 'watch-material-boundary'
  materialBoundary.setAttribute('aria-hidden', 'true')
  materialBoundary.append(material)
  section.prepend(materialBoundary)
  // Find the largest clear rectangle in the actual concave silhouette once.
  // Map that interior onto the padded text, so every line has ground behind it.
  const view = material.viewBox.baseVal
  const group = material.querySelector('g')
  const shape = new Path2D()
  shape.addPath(
    new Path2D(material.querySelector('path').getAttribute('d')),
    DOMMatrix.fromMatrix(group.transform.baseVal.consolidate().matrix),
  )
  const probe = document.createElement('canvas').getContext('2d')
  const cells = 64
  const cellWidth = view.width / cells
  const cellHeight = view.height / cells
  const heights = Array(cells).fill(0)
  let clear = { x: 0, y: 0, width: 0, height: 0 }
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      const inside = [
        [x, y],
        [x + 1, y],
        [x, y + 1],
        [x + 1, y + 1],
      ].every(([cx, cy]) =>
        probe.isPointInPath(shape, view.x + cx * cellWidth, view.y + cy * cellHeight),
      )
      heights[x] = inside ? heights[x] + 1 : 0
      let height = heights[x]
      for (let left = x; left >= 0 && height; left--) {
        height = Math.min(height, heights[left])
        const width = x - left + 1
        if (width * height > clear.width * clear.height) {
          clear = { x: left, y: y + 1 - height, width, height }
        }
      }
    }
  }
  const mapFlight = visit.querySelector('.map-slot .fact-flight')
  const visitHeading = document.createElement('h2')
  visitHeading.className = 'watch-visit-heading'
  visitHeading.textContent = 'Visit'
  mapFlight.append(visitHeading)
  const photograph = section.querySelector('.watch-daylight')
  const layout = () => {
    const photoRight =
      photograph.getBoundingClientRect().right - section.getBoundingClientRect().left
    const reach = innerWidth > 760 ? Math.max(0, copyTile.offsetLeft - photoRight + 24) : 0
    const scaleX = (copyTile.offsetWidth + reach) / (clear.width * cellWidth)
    const scaleY = copyTile.offsetHeight / (clear.height * cellHeight)
    material.style.width = `${view.width * scaleX}px`
    material.style.height = `${view.height * scaleY}px`
    material.style.left = `${copyTile.offsetLeft - reach - clear.x * cellWidth * scaleX}px`
    material.style.top = `${copyTile.offsetTop - clear.y * cellHeight * scaleY}px`
    const mapBounds = visit.querySelector('.map-water').getBoundingClientRect()
    const flightBounds = mapFlight.getBoundingClientRect()
    visitHeading.style.top = `${mapBounds.top - flightBounds.top - visitHeading.offsetHeight - 28}px`
    visitHeading.style.left = `${
      innerWidth > 760
        ? mapBounds.right - flightBounds.left - visitHeading.offsetWidth
        : Math.max(24, innerWidth * 0.05) - flightBounds.left
    }px`
  }
  const materialObserver = new ResizeObserver(layout)
  for (const node of [copyTile, photograph, visitHeading, visit.querySelector('.location-map')]) {
    materialObserver.observe(node)
  }
  layout()
  const nav = [...document.querySelectorAll('.temple-nav-items a')].find(
    (link) => link.textContent.trim() === 'Watch',
  )
  nav?.setAttribute('href', '#watch')
  nav?.removeAttribute('aria-disabled')
  document.body.append(controls)
  update()
  if (location.hash === '#watch') section.scrollIntoView({ block: 'start' })
}
mount()
