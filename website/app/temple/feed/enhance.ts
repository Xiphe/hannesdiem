import type { FeedProps, FeedPost } from './view.tsx'
import { postPath, templePath, watchPath } from './model.ts'
import { hasEnteredTemple } from '../entry-state.ts'
import { createPlayback } from './playback.ts'
import { audioPeaks, drawWaveform } from './waveform.ts'
import { dateLabel } from '../../date.tsx'
import { mountFeedControls } from './controls.ts'

export function mountFeed(root: HTMLElement, props: FeedProps, signal: AbortSignal) {
  const articles = [...root.querySelectorAll<HTMLElement>('.feed-post')]
  const video = root.querySelector<HTMLVideoElement>('.feed-player')!
  const home = root.querySelector<HTMLElement>('.feed-player-home')!
  let index = Math.max(
    0,
    props.posts.findIndex((post) => post.id === props.selected),
  )
  let active: HTMLElement | undefined
  let intent: 'autoplay' | 'playing' | 'paused' = 'autoplay'
  let ready = false
  let loading = 0
  let resumeVisible = false
  let frame = 0
  const positions = new Map<string, number>()
  const peaks = new Map<string, readonly number[]>()
  let waveformTask: AbortController | undefined
  const options = { signal }
  const post = () => props.posts[index]
  const controls = mountFeedControls(root, video, signal)
  const measurePanel = (article: HTMLElement) => {
    const details = article.querySelector<HTMLElement>('.feed-details')!
    article.style.setProperty('--caption-height', `${details.getBoundingClientRect().height}px`)
  }
  const panelSize = new ResizeObserver((entries) => {
    for (const entry of entries) measurePanel(entry.target.closest<HTMLElement>('.feed-post')!)
  })
  for (const article of articles) panelSize.observe(article.querySelector('.feed-details')!)
  signal.addEventListener('abort', () => panelSize.disconnect(), { once: true })
  const reflectOverlay = () => {
    active?.toggleAttribute('data-overlay', post().kind !== 'video' || intent === 'paused')
  }
  const blocked = () => {
    if (!active) return
    intent = 'paused'
    delete active.dataset.playing
    active.dataset.blocked = ''
    active.querySelector<HTMLButtonElement>('.feed-start')!.hidden = post().kind !== 'video'
    reflectOverlay()
  }
  const mediaFailed = () => {
    ready = false
    blocked()
  }
  const playback = createPlayback(video, signal, mediaFailed)

  function reflect() {
    if (!active) return
    const playing = !video.paused && post().kind !== 'text'
    active.toggleAttribute('data-playing', playing)
    for (const button of active.querySelectorAll<HTMLButtonElement>('[data-toggle]'))
      button.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} ${post().title}`)
    const playIcon = active.querySelector<HTMLElement>('[data-play-icon]')
    const pauseIcon = active.querySelector<HTMLElement>('[data-pause-icon]')
    if (playIcon) playIcon.hidden = playing
    if (pauseIcon) pauseIcon.hidden = !playing
    if (playing) {
      delete active.dataset.blocked
      active.querySelector<HTMLButtonElement>('.feed-start')!.hidden = true
    }
    reflectOverlay()
  }
  async function play() {
    if (!ready || signal.aborted || document.hidden || post().kind === 'text') return
    const current = loading
    intent = 'autoplay'
    reflectOverlay()
    try {
      await video.play()
      if (signal.aborted || current !== loading) return
      intent = 'playing'
      reflect()
    } catch {
      if (!signal.aborted && current === loading) blocked()
    }
  }
  function nextMedia(direction: number) {
    for (let next = index + direction; next >= 0 && next < props.posts.length; next += direction)
      if (props.posts[next].kind !== 'text') return props.posts[next]
  }
  async function waveform(item: FeedPost, article: HTMLElement) {
    waveformTask?.abort()
    if (item.kind !== 'audio') return
    const svg = article.querySelector<SVGSVGElement>('.feed-waveform svg')!
    const supplied = item.waveform ?? peaks.get(item.id)
    if (supplied) {
      drawWaveform(svg, supplied)
      return
    }
    const controller = new AbortController()
    waveformTask = controller
    try {
      const decoded = await audioPeaks(item.src, controller.signal)
      if (controller.signal.aborted || signal.aborted) return
      peaks.set(item.id, decoded)
      drawWaveform(svg, decoded)
    } catch {
      // Playback and seeking remain usable when a remote file disallows decoding.
    }
  }
  function updateBack() {
    const href = hasEnteredTemple() ? `${watchPath}#${encodeURIComponent(post().id)}` : templePath
    for (const link of root.querySelectorAll<HTMLAnchorElement>('[data-back]')) link.href = href
  }
  async function activate(next: number, initial = false) {
    if (!initial && next === index) return
    const direction = next < index ? -1 : 1
    if (active) {
      if (post().kind !== 'text') positions.set(post().id, video.currentTime)
      delete active.dataset.active
      delete active.dataset.playing
    }
    const current = ++loading
    intent = 'autoplay'
    controls.cancelAdjustment()
    ready = false
    video.pause()
    waveformTask?.abort()
    index = next
    active = articles[index]
    delete active.dataset.blocked
    active.querySelector<HTMLButtonElement>('.feed-start')?.setAttribute('hidden', '')
    reflectOverlay()
    active.dataset.active = ''
    measurePanel(active)
    root.dataset.currentPost = post().id
    document.title = `${post().title} • Hannes Diem`
    const path = postPath(post().id)
    if (location.pathname !== path) history.replaceState(history.state, '', path)
    updateBack()
    playback.preload(undefined)
    if (post().kind === 'text') {
      playback.clear()
      home.appendChild(video)
      if (!document.hidden) playback.preload(nextMedia(direction))
      return
    }
    active.querySelector<HTMLElement>('.feed-media-mount')!.appendChild(video)
    void waveform(post(), active)
    try {
      const attached = await playback.load(post())
      if (!attached || signal.aborted || current !== loading) return
      ready = true
      const position = positions.get(post().id) ?? 0
      if (position > 0) {
        const restore = () => {
          if (current === loading && Number.isFinite(video.duration))
            video.currentTime = Math.min(position, Math.max(0, video.duration - 0.1))
        }
        if (video.readyState >= 1) restore()
        else video.addEventListener('loadedmetadata', restore, { once: true, signal })
      }
      await play()
      if (current === loading && !signal.aborted && !document.hidden)
        playback.preload(nextMedia(direction))
    } catch {
      if (current === loading && !signal.aborted) blocked()
    }
  }
  for (const event of ['playing', 'pause', 'ended']) video.addEventListener(event, reflect, options)
  video.addEventListener('error', mediaFailed, options)
  const updateProgress = () => {
    if (!active) return
    const seek = active.querySelector<HTMLInputElement>('.feed-seek')
    const available = Number.isFinite(video.duration) && video.duration > 0 && video.readyState >= 1
    if (seek) seek.disabled = !available
    if (!available) return
    const percentage = (video.currentTime / video.duration) * 100
    if (seek && !controls.isAdjusting(seek)) {
      seek.value = String(percentage)
      seek.style.setProperty('--progress', `${percentage}%`)
    }
    const bars = active.querySelectorAll<SVGRectElement>('.feed-waveform rect')
    bars.forEach((bar, index) =>
      bar.toggleAttribute('data-played', (index / bars.length) * 100 <= percentage),
    )
  }
  for (const event of ['timeupdate', 'loadedmetadata', 'durationchange', 'emptied'])
    video.addEventListener(event, updateProgress, options)

  root.addEventListener(
    'click',
    (event) => {
      const target = event.target as Element
      if (target.closest('[data-toggle]')) {
        if (!video.paused) {
          intent = 'paused'
          video.pause()
          reflectOverlay()
        } else {
          if (ready) void play()
          else void activate(index, true)
        }
      } else if (target.closest('[data-share]')) {
        void share()
      }
    },
    options,
  )
  async function share() {
    const url = new URL(postPath(post().id), location.origin).href
    const data = { title: post().title, url }
    try {
      if (navigator.share) {
        await navigator.share(data)
        return
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
        return
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
    }
    const field = active!.querySelector<HTMLInputElement>('.feed-share-url')!
    field.value = url
    field.hidden = false
    field.focus()
    field.select()
  }
  root.addEventListener(
    'input',
    (event) => {
      const seek = event.target as HTMLInputElement
      if (seek.matches('.feed-seek') && Number.isFinite(video.duration)) {
        video.currentTime = (Number(seek.value) / 100) * video.duration
        seek.style.setProperty('--progress', `${seek.value}%`)
      }
    },
    options,
  )
  root.addEventListener(
    'keydown',
    (event) => {
      const target = event.target as HTMLElement
      if (target.closest('.feed-caption') || target.matches('input, textarea, a, button')) return
      if (event.key === ' ' && post().kind !== 'text') {
        event.preventDefault()
        if (video.paused) void play()
        else {
          intent = 'paused'
          video.pause()
          reflectOverlay()
        }
      } else if (event.key === 'Escape') {
        event.preventDefault()
        if (!video.paused) {
          intent = 'paused'
          video.pause()
          reflectOverlay()
        } else location.assign(active!.querySelector<HTMLAnchorElement>('[data-back]')!.href)
      }
    },
    options,
  )
  const selectAtViewport = () => {
    frame = 0
    const middle = root.getBoundingClientRect().top + root.clientHeight / 2
    const next = articles.findIndex((article) => {
      const box = article.getBoundingClientRect()
      return box.top <= middle && box.bottom > middle
    })
    if (next >= 0) void activate(next)
  }
  root.addEventListener(
    'scroll',
    () => {
      if (!frame) frame = requestAnimationFrame(selectAtViewport)
    },
    { passive: true, signal },
  )
  const resize = new ResizeObserver(() => {
    if (post().kind !== 'text')
      root.scrollTo({ top: articles[index].offsetTop, behavior: 'instant' })
  })
  resize.observe(root)
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden) {
        resumeVisible = !video.paused
        video.pause()
        playback.preload(undefined)
      } else if (resumeVisible) {
        resumeVisible = false
        void play()
      }
    },
    options,
  )
  signal.addEventListener(
    'abort',
    () => {
      cancelAnimationFrame(frame)
      resize.disconnect()
      waveformTask?.abort()
    },
    { once: true },
  )
  document.documentElement.removeAttribute('data-temple-loading')
  const localize = requestAnimationFrame(() => {
    for (const time of root.querySelectorAll('time'))
      time.textContent = dateLabel({ value: time.dateTime, showTime: true }, true)
  })
  signal.addEventListener('abort', () => cancelAnimationFrame(localize), { once: true })
  root.scrollTo({ top: articles[index].offsetTop, behavior: 'instant' })
  void activate(index, true)
}
