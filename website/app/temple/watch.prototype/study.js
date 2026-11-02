// THROWAWAY: layout and copy selection only. No signup mutation or new artwork clock.
import { fragments, introduction } from './material.js'

const section = document.createElement('section')
section.className = 'watch-study'
section.id = 'watch'
section.setAttribute('aria-labelledby', 'watch-heading')
section.innerHTML = `
  <header class="watch-heading">
    <h2 id="watch-heading">Watch</h2>
    <p></p>
  </header>
  <div class="watch-pictures">
    <figure class="watch-daylight"><img src="/__watch/tos4.jpg" alt="" width="1920" height="1280" loading="lazy"></figure>
    <figure class="watch-fire"><img src="/__watch/tos2.jpg" alt="" width="1920" height="1280" loading="lazy"></figure>
  </div>
  <div class="watch-fragments"></div>
  <div class="watch-action"><button type="button" disabled>get notified</button></div>
`
section.querySelector('.watch-heading p').textContent = introduction
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
  <div class="watch-review-variants">
    <button data-step="-1" aria-label="Previous study">←</button>
    <output></output>
    <button data-step="1" aria-label="Next study">→</button>
  </div>
  <fieldset><legend>Fragments</legend>${fragments.map((_, i) => `<label><input type="checkbox" data-toggle="${i}" checked>${i + 1}</label>`).join('')}</fieldset>
  <button class="watch-review-jump">Watch ↓</button>
  <small>Layout study · images are placeholders · signup not connected</small>
`
const variants = ['A', 'B']
let variant = new URL(location.href).searchParams.get('variant') === 'B' ? 'B' : 'A'
const selection = new Set([0, 1, 2])
const update = () => {
  section.dataset.variant = variant
  controls.querySelector('output').textContent =
    variant === 'A' ? 'A · Alongside' : 'B · Media first'
  for (const paragraph of section.querySelectorAll('[data-fragment]')) {
    paragraph.hidden = !selection.has(Number(paragraph.dataset.fragment))
  }
  section.querySelector('.watch-fragments').dataset.count = String(selection.size)
  console.info('Watch study', { variant, visibleFragments: [...selection].map((i) => i + 1) })
}
const changeVariant = (step) => {
  variant = variants[(variants.indexOf(variant) + step + variants.length) % variants.length]
  const url = new URL(location.href)
  url.searchParams.set('variant', variant)
  history.replaceState(history.state, '', url)
  update()
  section.scrollIntoView({ block: 'start' })
}
controls.addEventListener('click', (event) => {
  const button = event.target.closest('[data-step]')
  if (button) changeVariant(Number(button.dataset.step))
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
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault()
    changeVariant(event.key === 'ArrowLeft' ? -1 : 1)
  }
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
  visit.after(section)
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
