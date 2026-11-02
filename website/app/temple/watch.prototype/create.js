// THROWAWAY: the artist's Create material in the current photographic treatment.
import { createCopy as copy } from './material.js'

export const createContour =
  'M110 90C54 82 28 110 40 166L164 906Q176 966 238 950L920 790Q978 776 956 716C882 496 950 306 970 166Q980 98 912 114C620 180 402 58 110 90Z'

export function createSection() {
  const section = document.createElement('section')
  section.className = 'watch-study create-study'
  section.id = 'create'
  section.dataset.variant = 'A'
  section.setAttribute('aria-labelledby', 'create-heading')
  section.innerHTML = `
    <div class="watch-pictures">
      <figure class="watch-daylight"><img src="/__watch/tos.jpg" alt="" width="1066" height="1600" loading="lazy"></figure>
      <figure class="watch-fire"><img src="/__watch/mixing-scene-one-week-retreat-1803-2fadbcefea805a0a.webp" alt="" width="1803" height="1200" loading="lazy"></figure>
      <div class="create-section-label">Create</div>
    </div>
    <div class="watch-copy-tile">
      <h2 class="watch-heading" id="create-heading"></h2>
      <div class="watch-fragments">
        <p data-fragment="0"></p>
        <p class="create-musicians"></p>
        <p class="create-beyond-sound"></p>
      </div>
    </div>
    <div class="watch-action"><a href="mailto:sound@hannesdiem.de">let's talk</a></div>
    <div class="create-tooltip" id="create-steal-note" role="tooltip" popover="auto"><em></em></div>
  `
  section.querySelector('#create-heading').textContent = copy.headline
  section.querySelector('[data-fragment="0"]').textContent = copy.invitation
  const trigger = document.createElement('button')
  trigger.type = 'button'
  trigger.className = 'create-note-trigger'
  trigger.textContent = copy.musicians.word
  trigger.setAttribute('aria-describedby', 'create-steal-note')
  trigger.setAttribute('aria-expanded', 'false')
  section
    .querySelector('.create-musicians')
    .append(copy.musicians.before, trigger, copy.musicians.after)
  section.querySelector('.create-beyond-sound').textContent = copy.beyondSound
  const tooltip = section.querySelector('.create-tooltip')
  tooltip.querySelector('em').textContent = copy.musicians.note
  let pinned = false
  let hovering = false
  let focused = false
  let closing = 0
  const close = () => {
    clearTimeout(closing)
    tooltip.hidePopover()
    trigger.setAttribute('aria-expanded', 'false')
  }
  const position = () => {
    const anchor = trigger.getBoundingClientRect()
    const box = tooltip.getBoundingClientRect()
    tooltip.style.left = `${Math.max(12, Math.min(innerWidth - box.width - 12, anchor.left))}px`
    tooltip.style.top = `${
      anchor.bottom + 12 + box.height <= innerHeight - 12
        ? anchor.bottom + 12
        : Math.max(12, anchor.top - box.height - 12)
    }px`
  }
  const open = () => {
    clearTimeout(closing)
    tooltip.showPopover()
    trigger.setAttribute('aria-expanded', 'true')
    position()
  }
  const leave = () => {
    closing = setTimeout(() => {
      if (!pinned && !hovering && !focused) close()
    }, 150)
  }
  for (const element of [trigger, tooltip]) {
    element.addEventListener('pointerenter', (event) => {
      if (event.pointerType !== 'mouse') return
      hovering = true
      open()
    })
    element.addEventListener('pointerleave', () => {
      hovering = false
      leave()
    })
  }
  trigger.addEventListener('focus', () => {
    if (!trigger.matches(':focus-visible')) return
    focused = true
    open()
  })
  trigger.addEventListener('blur', () => {
    focused = false
    pinned = false
    close()
  })
  trigger.addEventListener('click', () => {
    pinned = !pinned
    if (pinned) open()
    else close()
  })
  tooltip.addEventListener('toggle', () => {
    const visible = tooltip.matches(':popover-open')
    trigger.setAttribute('aria-expanded', String(visible))
    if (!visible) pinned = false
  })
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      pinned = false
      close()
    }
  })
  addEventListener(
    'scroll',
    () => {
      if (tooltip.matches(':popover-open')) position()
    },
    { passive: true },
  )
  addEventListener('resize', close)
  return section
}
