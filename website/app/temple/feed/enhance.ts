import type { FeedProps, FeedPost } from './view.tsx'
import { postPath, templePath, watchPath } from './model.ts'
import { hasEnteredTemple } from '../entry-state.ts'
import { createPlayback } from './playback.ts'
import { audioPeaks, drawWaveform } from './waveform.ts'
import { dateLabel } from '../../date.tsx'
import { mountFeedControls } from './controls.ts'
import { mountFeedDrawer } from './drawer.ts'

export function mountFeed(root: HTMLElement, props: FeedProps, signal: AbortSignal) {
  const articles = [...root.querySelectorAll<HTMLElement>('.feed-post')]
  const video = root.querySelector<HTMLVideoElement>('.feed-player')!
  const home = root.querySelector<HTMLElement>('.feed-player-home')!
  let index = Math.max(
    0,
    props.posts.findIndex((post) => post.id === props.selected),
  )
  let active: HTMLElement | undefined
  let intent: 'autoplay' | 'playing' | 'paused' | 'ended' = 'autoplay'
  let ready = false
  let loading = 0
  let frame = 0
  const positions = new Map<string, number>()
  const peaks = new Map<string, readonly number[]>()
  let waveformTask: AbortController | undefined
  const options = { signal }
  const post = () => props.posts[index]
  const controls = mountFeedControls(root, video, signal, (input, event, startY) => {
    drawer.startFromScrubber(input, event, startY)
  })
  const drawer = mountFeedDrawer(root, signal, setDetails, controls.reveal)
  const measurePanel = (article: HTMLElement) => {
    article.style.setProperty(
      '--summary-height',
      `${article.querySelector('.feed-summary')!.getBoundingClientRect().height}px`,
    )
    const details = article.querySelector<HTMLElement>('.feed-details')!
    article.style.setProperty('--caption-height', `${details.getBoundingClientRect().height}px`)
  }
  const panelSize = new ResizeObserver((entries) => {
    for (const entry of entries) measurePanel(entry.target.closest<HTMLElement>('.feed-post')!)
  })
  for (const article of articles) {
    panelSize.observe(article.querySelector('.feed-details')!)
    panelSize.observe(article.querySelector('.feed-summary')!)
  }
  signal.addEventListener('abort', () => panelSize.disconnect(), { once: true })
  const reflectOverlay = () => {
    active?.toggleAttribute(
      'data-overlay',
      post().kind !== 'video' ||
        intent === 'paused' ||
        intent === 'ended' ||
        active.hasAttribute('data-details'),
    )
  }
  function setDetails(open: boolean, animate = true) {
    if (!active) return
    drawer.setExpanded(active, open, animate)
    reflectOverlay()
  }
  function pause() {
    intent = 'paused'
    video.pause()
    setDetails(true)
    reflect()
  }
  function nextVideo() {
    return props.posts.findIndex((item, candidate) => candidate > index && item.kind === 'video')
  }
  function advance() {
    const next = nextVideo()
    if (next < 0) return
    articles[next].scrollIntoView({
      block: 'start',
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    })
  }
  function ended() {
    if (post().kind !== 'video') return
    intent = 'ended'
    active!.dataset.ended = ''
    active!.querySelector<HTMLElement>('.feed-ended')!.hidden = false
    active!.querySelector<HTMLButtonElement>('[data-next]')!.hidden = nextVideo() < 0
    setDetails(true)
    reflect()
  }
  const blocked = () => {
    if (!active) return
    intent = 'paused'
    setDetails(true)
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
    for (const icon of active.querySelectorAll<HTMLElement>('[data-play-icon]'))
      icon.hidden = playing
    for (const icon of active.querySelectorAll<HTMLElement>('[data-pause-icon]'))
      icon.hidden = !playing
    if (playing) {
      delete active.dataset.blocked
      active.querySelector<HTMLButtonElement>('.feed-start')!.hidden = true
    }
    reflectOverlay()
  }
  async function play() {
    if (!ready || signal.aborted || post().kind === 'text') return
    const current = loading
    intent = 'autoplay'
    delete active!.dataset.ended
    active!.querySelector<HTMLElement>('.feed-ended')?.setAttribute('hidden', '')
    setDetails(post().kind !== 'video')
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
    drawer.cancel()
    ready = false
    video.pause()
    waveformTask?.abort()
    index = next
    active = articles[index]
    delete active.dataset.blocked
    delete active.dataset.ended
    active.querySelector<HTMLElement>('.feed-ended')?.setAttribute('hidden', '')
    active.querySelector<HTMLButtonElement>('.feed-start')?.setAttribute('hidden', '')
    setDetails(post().kind !== 'video', false)
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
  video.addEventListener('playing', reflect, options)
  video.addEventListener(
    'pause',
    () => {
      if (video.paused && intent === 'playing' && !controls.seeking && !video.ended) {
        intent = 'paused'
        setDetails(true)
      }
      reflect()
    },
    options,
  )
  video.addEventListener('ended', ended, options)
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
          pause()
        } else {
          if (ready) void play()
          else void activate(index, true)
        }
      } else if (target.closest('[data-details-toggle]')) {
        setDetails(!active!.hasAttribute('data-details'))
      } else if (target.closest('[data-replay]')) {
        video.currentTime = 0
        void play()
      } else if (target.closest('[data-next]')) {
        advance()
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
    setDetails(true)
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
          pause()
        }
      } else if (event.key === 'Escape') {
        event.preventDefault()
        if (!video.paused) {
          pause()
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
      if (document.hidden) playback.preload(undefined)
      else if (!video.paused) playback.preload(nextMedia(1))
    },
    options,
  )
  const session = navigator.mediaSession
  const actions: MediaSessionAction[] = ['play', 'pause', 'seekto', 'nexttrack']
  if (session) {
    const handlers: Partial<Record<MediaSessionAction, MediaSessionActionHandler>> = {
      play: () => {
        void play()
      },
      pause,
      seekto: ({ seekTime }) => {
        if (seekTime !== undefined && Number.isFinite(video.duration))
          video.currentTime = Math.max(0, Math.min(video.duration, seekTime))
      },
      nexttrack: advance,
    }
    for (const action of actions) {
      try {
        session.setActionHandler(action, handlers[action]!)
      } catch {}
    }
    const updateSession = () => {
      if (!active) return
      session.playbackState = post().kind === 'text' ? 'none' : video.paused ? 'paused' : 'playing'
      if (typeof MediaMetadata !== 'undefined')
        session.metadata =
          post().kind === 'text'
            ? null
            : new MediaMetadata({
                title: post().title,
                artist: 'Temple of Sound',
                artwork: post().cover
                  ? [{ src: new URL(post().cover!, location.origin).href }]
                  : [],
              })
    }
    video.addEventListener('playing', updateSession, options)
    video.addEventListener('pause', updateSession, options)
    video.addEventListener('emptied', updateSession, options)
    signal.addEventListener(
      'abort',
      () => {
        for (const action of actions) {
          try {
            session.setActionHandler(action, null)
          } catch {}
        }
        session.metadata = null
        session.playbackState = 'none'
      },
      { once: true },
    )
  }
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
