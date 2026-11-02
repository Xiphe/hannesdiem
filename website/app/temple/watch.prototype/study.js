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
  // Reuse Visit's exact material and its fitted clear reading area. Uniformly
  // scale that material around the new text, without inventing a new silhouette.
  const copyTile = section.querySelector('.watch-copy-tile')
  const sourceFace = visit.querySelector('.text-face')
  const sourceMaterial = visit.querySelector('.text-solid .tile-material')
  const material = sourceMaterial.cloneNode(true)
  material.classList.add('watch-material')
  const gradient = material.querySelector('linearGradient')
  const oldId = gradient.id
  gradient.id = 'watch-text-material'
  material.innerHTML = material.innerHTML.replaceAll(`url(#${oldId})`, 'url(#watch-text-material)')
  copyTile.prepend(material)
  const mapFlight = visit.querySelector('.map-slot .fact-flight')
  const visitHeading = document.createElement('h2')
  visitHeading.className = 'watch-visit-heading'
  visitHeading.textContent = 'Visit'
  mapFlight.append(visitHeading)
  const layout = () => {
    const width = copyTile.clientWidth
    const height = copyTile.clientHeight
    const scale = Math.max(width / sourceFace.clientWidth, height / sourceFace.clientHeight)
    for (const property of ['width', 'height']) {
      material.style[property] = `${parseFloat(sourceMaterial.style[property]) * scale}px`
    }
    material.style.left = `${width / 2 + (parseFloat(sourceMaterial.style.left) - sourceFace.clientWidth / 2) * scale}px`
    material.style.top = `${height / 2 + (parseFloat(sourceMaterial.style.top) - sourceFace.clientHeight / 2) * scale}px`
    const mapBounds = visit.querySelector('.map-water').getBoundingClientRect()
    const flightBounds = mapFlight.getBoundingClientRect()
    visitHeading.style.top = `${mapBounds.top - flightBounds.top - visitHeading.offsetHeight - 28}px`
    visitHeading.style.left = `${Math.max(24, innerWidth * 0.05) - flightBounds.left}px`
  }
  const materialObserver = new ResizeObserver(layout)
  for (const node of [copyTile, sourceFace, sourceMaterial, visit.querySelector('.location-map')]) {
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
