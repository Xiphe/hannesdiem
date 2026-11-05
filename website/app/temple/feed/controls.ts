const volumeKey = 'hannesdiem.temple.volume'
const controlsTimeout = 10_000

/** Interaction visibility is shared across posts; scrolling never resets it. */
export function mountFeedControls(root: HTMLElement, video: HTMLVideoElement, signal: AbortSignal) {
  const cursor = matchMedia('(hover: hover) and (pointer: fine)')
  let preferred = 1
  try {
    const saved = localStorage.getItem(volumeKey)
    if (saved !== null && saved.trim() && Number.isFinite(Number(saved)))
      preferred = Math.min(1, Math.max(0, Number(saved)))
  } catch {}
  let lastAudible = preferred || 1
  let timer: ReturnType<typeof setTimeout> | undefined
  let adjusting: HTMLInputElement | undefined
  let resumeAfterSeek = false
  let keyboard = false
  let pointer: { x: number; y: number } | undefined
  const options = { signal }
  const saveVolume = () => {
    preferred = video.volume
    if (preferred > 0) lastAudible = preferred
    if (cursor.matches) {
      try {
        localStorage.setItem(volumeKey, String(preferred))
      } catch {}
    }
  }
  const reflect = () => {
    const muted = video.muted || video.volume === 0
    for (const button of root.querySelectorAll<HTMLButtonElement>('[data-sound]')) {
      button.setAttribute('aria-label', muted ? 'Unmute sound' : 'Mute sound')
      button.setAttribute('aria-pressed', String(!muted))
      button.querySelector<HTMLElement>('[data-sound-on]')!.hidden = muted
      button.querySelector<HTMLElement>('[data-sound-off]')!.hidden = !muted
    }
    for (const input of root.querySelectorAll<HTMLInputElement>('[data-volume]')) {
      input.value = String(Math.round(video.volume * 100))
      input.style.setProperty('--progress', `${video.volume * 100}%`)
    }
  }
  const scheduleHide = () => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      if (adjusting || (keyboard && document.activeElement?.closest('.feed-summary'))) return
      delete root.dataset.transportPeek
    }, controlsTimeout)
  }
  const reveal = () => {
    root.dataset.transportPeek = ''
    scheduleHide()
  }
  const applyVolume = () => {
    video.volume = cursor.matches ? preferred : 1
    reflect()
  }
  applyVolume()
  cursor.addEventListener('change', applyVolume, options)
  video.addEventListener('volumechange', reflect, options)

  root.addEventListener(
    'pointermove',
    (event) => {
      if (event.pointerType !== 'mouse' || !cursor.matches) return
      if (pointer?.x === event.clientX && pointer.y === event.clientY) return
      pointer = { x: event.clientX, y: event.clientY }
      reveal()
    },
    { passive: true, signal },
  )
  root.addEventListener(
    'click',
    (event) => {
      reveal()
      const button = (event.target as Element).closest('[data-sound]')
      if (!button) return
      if (video.muted || video.volume === 0) {
        if (video.volume === 0) {
          video.volume = lastAudible
          saveVolume()
        }
        video.muted = false
      } else video.muted = true
      reflect()
    },
    options,
  )
  root.addEventListener(
    'input',
    (event) => {
      const input = event.target as HTMLInputElement
      if (!input.matches('[data-volume]')) return
      video.volume = Number(input.value) / 100
      if (video.volume > 0) video.muted = false
      saveVolume()
      reflect()
      reveal()
    },
    options,
  )
  root.addEventListener(
    'pointerdown',
    (event) => {
      keyboard = false
      const input = event.target as HTMLInputElement
      if (!input.matches('.feed-seek, [data-volume]')) return
      adjusting = input
      root.dataset.rangeDragging = input.matches('[data-volume]') ? 'vertical' : 'horizontal'
      input.setPointerCapture(event.pointerId)
      reveal()
      if (input.matches('.feed-seek')) {
        resumeAfterSeek = !video.paused
        video.pause()
      }
    },
    options,
  )
  const finishAdjustment = () => {
    if (!adjusting) return
    adjusting = undefined
    delete root.dataset.rangeDragging
    const resume = resumeAfterSeek
    resumeAfterSeek = false
    reveal()
    if (resume && !signal.aborted) void video.play().catch(() => {})
  }
  window.addEventListener('pointerup', finishAdjustment, options)
  window.addEventListener('pointercancel', finishAdjustment, options)
  root.addEventListener(
    'keydown',
    (event) => {
      const target = event.target as HTMLElement
      if (target.closest('.feed-summary, .feed-corners') || target.matches('[data-toggle]')) {
        keyboard = true
        reveal()
      }
    },
    options,
  )
  root.addEventListener(
    'focusin',
    (event) => {
      if ((event.target as HTMLElement).closest('.feed-summary, .feed-corners')) reveal()
    },
    options,
  )
  root.addEventListener(
    'focusout',
    (event) => {
      if ((event.target as HTMLElement).closest('.feed-summary, .feed-corners')) scheduleHide()
    },
    options,
  )
  signal.addEventListener(
    'abort',
    () => {
      clearTimeout(timer)
      delete root.dataset.rangeDragging
    },
    { once: true },
  )
  return {
    reveal,
    get seeking() {
      return !!adjusting?.matches('.feed-seek')
    },
    isAdjusting: (input: HTMLInputElement) => input === adjusting,
    cancelAdjustment() {
      delete root.dataset.rangeDragging
      adjusting = undefined
      resumeAfterSeek = false
    },
  }
}
