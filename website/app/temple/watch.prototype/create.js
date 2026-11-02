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
    <div class="create-tooltip" id="create-steal-note" role="tooltip" popover="auto">
      <svg class="create-tooltip-piece" viewBox="0 0 400 180" preserveAspectRatio="none" aria-hidden="true">
        <defs><linearGradient id="create-tooltip-material" x1="0" y1="0" x2="1" y2="1">
          <stop class="create-tooltip-top"/><stop class="create-tooltip-bottom" offset="1"/>
        </linearGradient></defs>
        <path fill="url(#create-tooltip-material)" d="M25 17C105 5 197 24 365 7Q390 5 387 29L397 141Q400 160 377 162C260 155 154 179 26 170Q7 169 10 149L3 40Q0 21 25 17Z"/>
      </svg>
      <em></em>
    </div>
  `
  section.querySelector('.watch-action p').textContent = copy.actionContext
  section.querySelector('.watch-action a').textContent = copy.actionLabel
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
  const tooltipOutline = tooltip.querySelector('path')
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
    const center = anchor.left + anchor.width / 2
    const left = Math.max(12, Math.min(innerWidth - box.width - 12, center - box.width / 2))
    const below = anchor.bottom + box.height <= innerHeight - 12
    const arrow = Math.max(28, Math.min(372, ((center - left) / box.width) * 400))
    tooltip.dataset.placement = below ? 'bottom' : 'top'
    tooltip.style.left = `${left}px`
    tooltip.style.top = `${below ? anchor.bottom : Math.max(12, anchor.top - box.height)}px`
    // Integrate the pointer into the fragment so it shares the same material.
    tooltipOutline.setAttribute(
      'd',
      `M25 17Q${arrow / 2} 9 ${arrow - 12} 14L${arrow} 0L${arrow + 12} 14Q${(arrow + 400) / 2} 19 365 7Q390 5 387 29L397 141Q400 160 377 162C260 155 154 179 26 170Q7 169 10 149L3 40Q0 21 25 17Z`,
    )
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
