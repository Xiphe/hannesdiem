// THROWAWAY: layout and copy selection only. No signup mutation or new artwork clock.
import { fragments, actionContext, introduction } from './material.js'
import { createSection, createContour } from './create.js'
import { mountReadingMaterial } from './reading-material.js'

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
    <h2 class="watch-introduction" id="watch-heading"></h2>
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
