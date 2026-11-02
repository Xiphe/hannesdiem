// THROWAWAY: the artist's Create material in the current photographic treatment.
import { createCopy as copy } from './material.js'

export const createContour =
  'M110 90C54 82 28 110 40 166L164 906Q176 966 238 950L920 790Q978 776 956 716C882 496 950 306 970 166Q980 98 912 114C620 180 402 58 110 90Z'

export function createSection() {
  const section = document.createElement('section')
  section.className = 'watch-study create-study'
  section.id = 'create'
  section.setAttribute('aria-labelledby', 'create-heading')
  section.innerHTML = `
    <div class="watch-pictures">
      <figure class="watch-daylight"><img src="/__watch/tos.jpg" alt="" width="1066" height="1600" loading="lazy"></figure>
      <figure class="watch-fire"><img src="/__watch/mixing-scene-one-week-retreat-1803-2fadbcefea805a0a.webp" alt="" width="1803" height="1200" loading="lazy"></figure>
    </div>
    <div class="watch-copy-tile">
      <h2 class="watch-heading" id="create-heading"></h2>
      <div class="watch-fragments">
        <p data-fragment="0"></p>
        <p class="create-musicians"></p>
        <p class="create-beyond-sound"></p>
      </div>
    </div>
    <div class="watch-action"><p></p><a href="mailto:sound@hannesdiem.de"></a></div>
  `
  section.querySelector('.watch-action p').textContent = copy.actionContext
  section.querySelector('.watch-action a').textContent = copy.actionLabel
  section.querySelector('#create-heading').textContent = copy.headline
  section.querySelector('[data-fragment="0"]').textContent = copy.invitation
  section.querySelector('.create-musicians').textContent = copy.musicians
  section.querySelector('.create-beyond-sound').textContent = copy.beyondSound
  return section
}
