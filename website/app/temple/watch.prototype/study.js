// THROWAWAY: layout and copy selection only. No signup mutation or new artwork clock.
import { fragments, actionContext, introduction } from './material.js'
import { createSection, createContour } from './create.js'
import { mountReadingMaterial } from './reading-material.js'

const section = document.createElement('section')
section.className = 'watch-study'
section.id = 'watch'
section.dataset.variant = 'A'
section.setAttribute('aria-label', 'Watch')
section.innerHTML = `
  <div class="watch-pictures">
    <figure class="watch-daylight"><img src="/__watch/tos4.jpg" alt="" width="1920" height="1280" loading="lazy"></figure>
    <figure class="watch-fire"><img src="/__watch/tos2.jpg" alt="" width="1920" height="1280" loading="lazy"></figure>
  </div>
  <div class="watch-copy-tile">
    <h2 class="watch-heading">Watch</h2>
    <h3 class="watch-introduction"></h3>
    <div class="watch-fragments"></div>
  </div>
  <div class="watch-action"><p></p><button type="button" disabled>get notified</button></div>
`
section.querySelector('.watch-action p').textContent = actionContext
section.querySelector('.watch-introduction').textContent = introduction
for (const [index, fragment] of fragments.entries()) {
  const paragraph = document.createElement('p')
  paragraph.dataset.fragment = String(index)
  paragraph.textContent = fragment
  section.querySelector('.watch-fragments').append(paragraph)
}

// Let the real Remix island connect before inserting a temporary, unowned study.
const mount = () => {
  const host = document.querySelector('.temple-artwork')
  const visit = host?.querySelector('.facts-grid')
  if (!visit || !['ready', 'fallback'].includes(host.dataset.state)) {
    requestAnimationFrame(mount)
    return
  }
  host.querySelector('.first-pair').after(section)
  const sourceMaterial = visit.querySelector('.text-solid .tile-material')
  mountReadingMaterial(section, sourceMaterial)
  const create = createSection()
  host.querySelectorAll('.first-pair')[1].after(create)
  mountReadingMaterial(create, sourceMaterial, createContour)
  const mapFlight = visit.querySelector('.map-slot .fact-flight')
  const visitHeading = document.createElement('h2')
  visitHeading.className = 'watch-visit-heading'
  visitHeading.textContent = 'Visit'
  mapFlight.append(visitHeading)
  const layout = () => {
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
  for (const node of [visitHeading, visit.querySelector('.location-map')]) {
    materialObserver.observe(node)
  }
  layout()
  for (const fact of [section, create]) {
    const nav = [...document.querySelectorAll('.temple-nav-items a')].find(
      (link) => link.textContent.trim().toLowerCase() === fact.id,
    )
    nav?.setAttribute('href', `#${fact.id}`)
    nav?.removeAttribute('aria-disabled')
  }
  for (const fact of [section, create]) {
    if (location.hash === `#${fact.id}`) fact.scrollIntoView({ block: 'start' })
  }
}
mount()
