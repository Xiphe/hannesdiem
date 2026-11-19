import { on, ref, type Handle } from 'remix/component'
import type { ElectroCuteArchiveProps, ElectroCuteHighlight } from '@hannesdiem/content-components'
import { archiveStyle } from './styles.ts'
import { XMarkIcon } from '../heroicons.tsx'
import { FeedIcon } from '../temple/feed/icon.tsx'
import { preciseClock, TrimTimeline, type TrimEdge } from './trim.tsx'
import { HighlightStar, PlaybackTimeline } from './timeline.tsx'
import { readSessionState, submitSessionForm } from '../identity/client.ts'
import {
  highlightsPath,
  highlightMessages,
  isPublic,
  type HighlightState,
  type RuntimeHighlight,
  type HighlightInput,
  type HighlightIntent,
} from './contract.ts'
import {
  archivePath,
  clock,
  defaultRange,
  highlightPath,
  readDrafts,
  readProgress,
  sessionPath,
  sortedSessions,
  validRange,
  type ListeningProgress,
} from './model.ts'

const progressKey = 'hannesdiem.electrocute.progress.v1'
const draftKey = (id: string) => `hannesdiem.electrocute.preview-drafts.v1.${id}`
function stored(key: string) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function store(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}
const date = (value: string) =>
  new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T12:00:00Z`))

export function Archive(handle: Handle<ElectroCuteArchiveProps>) {
  const { sessions, selectedId, preview } = handle.props
  const session = sessions.find((item) => item.id === selectedId)
  let progress: ListeningProgress = { positions: {} }
  let newest = false
  let drafts: ElectroCuteHighlight[] = []
  let video: HTMLVideoElement | undefined
  let player: HTMLDivElement | undefined
  let enhanced = false
  let fullscreen = false
  let position = 0
  let duration = session?.duration ?? 0
  let ready = false
  let failed = false
  let editing = false
  let editorStep: 'range' | 'name' = 'range'
  let selectedEdge: TrimEdge = 'start'
  let editingId: string | undefined
  let clipStart = 0
  let clipEnd = 60
  let passageWindow = { start: 0, end: 60 }
  let passageFrame: number | undefined
  let title = ''
  let feedback = ''
  let shareUrl = ''
  let heard = false
  let lastSave = -1
  let previewEnd: number | undefined
  let initialPosition: number | undefined
  let runtime: HighlightState = { ready: false, artist: false, highlights: [] }
  let alias = ''
  let busy = false
  let runtimeFailed = false
  let newId = ''
  let editingRevision: number | undefined
  let runtimeRequest = 0
  let runtimeLinkResolved = false
  const highlights = () =>
    [...(session?.highlights ?? []), ...drafts, ...runtime.highlights.filter(isPublic)].sort(
      (a, b) => a.start - b.start || a.end - b.end || a.id.localeCompare(b.id),
    )
  const bounds = () => ({ start: clipStart, end: clipEnd })
  const valid = () => {
    const { start, end } = bounds()
    return start !== undefined && end !== undefined && validRange(start, end, duration)
  }

  function savePosition(force = false) {
    if (!session || !video || !heard || !Number.isFinite(video.currentTime)) return
    const now = Math.floor(video.currentTime)
    if (!force && Math.abs(now - lastSave) < 5) return
    // Merge the latest stored state, so another tab's sessions are retained.
    progress = readProgress(stored(progressKey), sessions)
    if (video.ended || now >= duration - 0.5) {
      delete progress.positions[session.id]
      if (progress.latest === session.id) delete progress.latest
    } else if (now > 0) {
      progress.positions[session.id] = video.currentTime
      progress.latest = session.id
    }
    store(progressKey, progress)
    lastSave = now
  }

  async function playAt(start: number, end?: number) {
    if (!video || !ready) return
    previewEnd = end
    video.currentTime = Math.max(0, Math.min(start, duration))
    try {
      await video.play()
    } catch {
      feedback = 'Press play to listen.'
      handle.update()
    }
  }

  function choose(highlight: ElectroCuteHighlight) {
    history.replaceState(history.state, '', highlightPath(session!.id, highlight.id))
    void playAt(highlight.start)
  }

  function seekTo(time: number) {
    if (!video || !ready) return
    previewEnd = undefined
    video.currentTime = Math.max(0, Math.min(time, duration))
    position = video.currentTime
    handle.update()
  }

  async function togglePlayback() {
    if (!video || !ready) return
    if (!video.paused) video.pause()
    else {
      try {
        await video.play()
      } catch {
        feedback = 'Press play to listen.'
        handle.update()
      }
    }
  }

  async function playPassage() {
    if (!video || !ready || !valid()) return
    const inside = video.currentTime >= clipStart && video.currentTime < clipEnd
    await playAt(video.paused && inside ? video.currentTime : clipStart, clipEnd)
  }

  function cancelPassageAnimation() {
    if (passageFrame !== undefined) cancelAnimationFrame(passageFrame)
    passageFrame = undefined
  }
  handle.signal.addEventListener('abort', cancelPassageAnimation, { once: true })

  function zoomPassage(milliseconds = 0) {
    cancelPassageAnimation()
    const margin = Math.max(2, (clipEnd - clipStart) * 0.12)
    const target = {
      start: Math.max(0, clipStart - margin),
      end: Math.min(duration, clipEnd + margin),
    }
    if (!milliseconds || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      passageWindow = target
      return
    }
    const from = passageWindow
    const began = performance.now()
    function frame(now: number) {
      const progress = Math.min(1, (now - began) / milliseconds)
      const eased = 1 - (1 - progress) ** 3
      passageWindow = {
        start: from.start + (target.start - from.start) * eased,
        end: from.end + (target.end - from.end) * eased,
      }
      handle.update()
      passageFrame = progress < 1 ? requestAnimationFrame(frame) : undefined
    }
    passageFrame = requestAnimationFrame(frame)
  }

  async function backToSelection() {
    if (busy) return
    editorStep = 'range'
    zoomPassage()
    await handle.update()
    player
      ?.querySelector<HTMLElement>(`[aria-label="Passage ${selectedEdge}"]`)
      ?.focus({ preventScroll: true })
  }

  async function closeEditor() {
    if (busy) return
    cancelPassageAnimation()
    if (previewEnd !== undefined) video?.pause()
    previewEnd = undefined
    editing = false
    await handle.update()
    player
      ?.querySelector<HTMLInputElement>('[aria-label="Playback position"]')
      ?.focus({ preventScroll: true })
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement === player) await document.exitFullscreen()
      else await player?.requestFullscreen()
    } catch {
      feedback = 'Fullscreen is unavailable in this browser.'
      handle.update()
    }
  }

  async function openEditor(highlight?: ElectroCuteHighlight, at?: number) {
    if (!video || (!preview && !runtime.email) || !ready || busy) return
    previewEnd = undefined
    const point = at ?? video.currentTime
    const currentFrame = session?.frameRate
      ? Math.floor(point * session.frameRate) / session.frameRate
      : point
    const range = highlight ?? defaultRange(currentFrame, duration)
    clipStart = range.start
    clipEnd = range.end
    zoomPassage()
    title = highlight?.title ?? ''
    editingId = highlight?.id
    newId = crypto.randomUUID()
    const existing = runtime.highlights.find((item) => item.id === highlight?.id)
    editingRevision = existing?.revision
    editorStep = 'range'
    selectedEdge = 'start'
    editing = true
    feedback = ''
    await handle.update()
    player?.scrollIntoView({ block: 'nearest', behavior: 'instant' })
    player
      ?.querySelector<HTMLElement>('[aria-label="Highlight start"]')
      ?.focus({ preventScroll: true })
  }

  async function loadRuntime() {
    if (!session || preview || busy) return
    const request = ++runtimeRequest
    try {
      const response = await readSessionState(highlightsPath(session.id), handle.signal)
      if (!response.ok) throw new Error('Highlights unavailable')
      const value = (await response.json()) as HighlightState
      if (handle.signal.aborted || request !== runtimeRequest || busy) return
      if (typeof value.ready !== 'boolean' || !Array.isArray(value.highlights))
        throw new Error('Invalid highlight state')
      const previousEmail = runtime.email
      runtime = value
      runtimeFailed = false
      if (previousEmail && previousEmail !== runtime.email) editing = false
      const requested = new URL(location.href).searchParams.get('highlight')
      const found = highlights().find((item) => item.id === requested)
      if (requested && !runtimeLinkResolved) {
        runtimeLinkResolved = true
        if (found) {
          if (!heard) {
            initialPosition = found.start
            if (video?.readyState) metadata()
          }
          feedback = ''
        } else
          feedback = 'This highlight is no longer available. You can still play the full session.'
      }
    } catch {
      if (handle.signal.aborted || request !== runtimeRequest || busy) return
      runtimeFailed = true
    }
    handle.update()
  }

  async function mutate(intent: HighlightIntent, input: HighlightInput) {
    if (!session || busy || !runtime.email || !runtime.csrfToken) return false
    busy = true
    ++runtimeRequest
    feedback = ''
    handle.update()
    const body = new FormData()
    body.set('_csrf', runtime.csrfToken)
    body.set('intent', intent)
    body.set('payload', JSON.stringify(input))
    try {
      const response = await submitSessionForm(
        highlightsPath(session.id),
        body,
        handle.signal,
        runtime.email,
      )
      const result = (await response.json()) as HighlightState & { message?: string }
      if (!response.ok) {
        feedback = result.message ?? highlightMessages.failure
        if (response.status === 409 || response.status === 401) {
          busy = false
          await loadRuntime()
          if (editing && (editingId ?? newId) === input.id)
            editingRevision = runtime.highlights.find((item) => item.id === input.id)?.revision
        }
        return false
      }
      runtime = result
      const saved = runtime.highlights.find((item) => item.id === input.id)
      feedback =
        saved?.status === 'rejected'
          ? highlightMessages.rejected
          : saved?.status === 'pending'
            ? highlightMessages.pending
            : intent === 'save'
              ? 'Highlight saved.'
              : intent === 'profile'
                ? 'Public name updated.'
                : 'Highlight updated.'
      return true
    } catch {
      feedback = highlightMessages.failure
      return false
    } finally {
      busy = false
      if (!handle.signal.aborted) handle.update()
    }
  }

  async function saveHighlight() {
    if (!session || !valid() || !title.trim() || busy) return
    const { start, end } = bounds()
    if (!preview) {
      const saved = await mutate('save', {
        id: editingId ?? newId,
        revision: editingRevision,
        title,
        start,
        end,
      })
      if (saved) {
        editing = false
        previewEnd = undefined
      }
      handle.update()
      return
    }
    const next = [
      ...drafts.filter((item) => item.id !== editingId),
      {
        id: editingId ?? newId,
        title: title.trim(),
        person: 'You',
        start: start!,
        end: end!,
      },
    ]
    if (!store(draftKey(session.id), next)) {
      feedback = 'Could not save on this device. Keep this form open and try again.'
    } else {
      drafts = next
      previewEnd = undefined
      editing = false
      feedback = 'Draft saved on this device.'
    }
    handle.update()
  }

  handle.queueTask(() => {
    // These listeners belong to the mounted player, not one render. A queued
    // task's signal is aborted by the very first state update.
    const signal = handle.signal
    enhanced = true
    if (video) video.controls = false
    document.addEventListener(
      'fullscreenchange',
      () => {
        fullscreen = document.fullscreenElement === player
        handle.update()
      },
      { signal },
    )
    if (session)
      window.addEventListener(
        'keydown',
        (event) => {
          if (
            (event.code !== 'Space' && event.key !== ' ') ||
            event.altKey ||
            event.ctrlKey ||
            event.metaKey ||
            !ready
          )
            return
          const target = event.target as Element | null
          if (
            target?.closest(
              'input:not([type=range]), textarea, select, [contenteditable]:not([contenteditable=false]), [role=textbox]',
            )
          )
            return
          event.preventDefault()
          if (!event.repeat) void togglePlayback()
        },
        { capture: true, signal },
      )
    void loadRuntime()
    window.addEventListener(
      'focus',
      () => {
        if (!busy) void loadRuntime()
      },
      { signal },
    )
    progress = readProgress(stored(progressKey), sessions)
    if (preview && session) drafts = readDrafts(stored(draftKey(session.id)), session.duration)
    const requested = new URL(location.href).searchParams.get('highlight')
    const highlight = highlights().find((item) => item.id === requested)
    if (highlight) initialPosition = highlight.start
    else if (!requested && session) initialPosition = progress.positions[session.id]
    else if (requested)
      feedback = preview
        ? 'This highlight is no longer available. You can still play the full session.'
        : 'Loading highlight…'
    window.addEventListener('pagehide', () => savePosition(true), { signal })
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.visibilityState === 'hidden') savePosition(true)
      },
      { signal },
    )
    if (session && video?.readyState) metadata()
    handle.update()
    signal.addEventListener('abort', () => savePosition(true), { once: true })
  })

  function metadata() {
    if (!video) return
    duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : duration
    ready = true
    failed = false
    if (initialPosition !== undefined) {
      video.currentTime = Math.min(initialPosition, Math.max(0, duration - 0.1))
      position = video.currentTime
      initialPosition = undefined
    }
    handle.update()
  }

  function trimProps(surface?: 'passage') {
    return {
      start: clipStart,
      end: clipEnd,
      duration,
      frameRate: session?.frameRate,
      disabled: busy,
      selected: selectedEdge,
      surface,
      viewport: surface ? passageWindow : undefined,
      seek(edge: TrimEdge) {
        if (!video || !ready) return
        const time = edge === 'end' ? Math.max(clipStart, clipEnd - 5) : clipStart
        previewEnd = clipEnd
        video.currentTime = time
        position = time
        handle.update()
      },
      settle() {
        zoomPassage(surface === 'passage' ? 1000 : 0)
        handle.update()
      },
      select(edge: TrimEdge) {
        cancelPassageAnimation()
        selectedEdge = edge
        editorStep = 'range'
        handle.update()
      },
      change(start: number, end: number, source: 'keyboard' | 'pointer') {
        cancelPassageAnimation()
        clipStart = start
        clipEnd = end
        if (source === 'keyboard') zoomPassage(250)
        else if (!surface || start < passageWindow.start || end > passageWindow.end) zoomPassage()
        previewEnd = undefined
        handle.update()
      },
    }
  }

  function editor() {
    return editorStep === 'name' ? (
      <form
        class="ec-clip-save"
        aria-label="Save highlight"
        mix={on('submit', (event) => {
          event.preventDefault()
          void saveHighlight()
        })}
      >
        <button
          type="button"
          class="ec-icon-button ec-back-clip"
          aria-label="Back to selection"
          disabled={busy}
          mix={on('click', backToSelection)}
        >
          <FeedIcon name="back" />
        </button>
        <input
          aria-label="Title"
          placeholder="Name this highlight"
          required
          maxLength={120}
          disabled={busy}
          value={title}
          mix={on('input', (event) => {
            title = (event.currentTarget as HTMLInputElement).value
            handle.update()
          })}
        />
        <button
          type="submit"
          class="ec-save-clip"
          aria-label={preview ? 'Save draft' : 'Save highlight'}
          disabled={busy || !valid() || !title.trim()}
        >
          {busy ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          class="ec-cancel-clip"
          aria-label="Cancel"
          disabled={busy}
          mix={on('click', closeEditor)}
        >
          <XMarkIcon />
        </button>
      </form>
    ) : (
      <div
        class="ec-clip-dock"
        data-edge={selectedEdge}
      >
        <button
          type="button"
          class="ec-icon-button"
          aria-label={video?.paused === false ? 'Restart passage' : 'Preview passage'}
          disabled={!valid() || busy}
          mix={on('click', () => void playPassage())}
        >
          <FeedIcon name={video?.paused === false ? 'replay' : 'play'} />
        </button>
        <div class="ec-passage-track">
          <input
            type="range"
            class="ec-seek"
            min={passageWindow.start}
            max={passageWindow.end}
            step={session?.frameRate ? 1 / session.frameRate : 0.001}
            value={Math.max(passageWindow.start, Math.min(passageWindow.end, position))}
            aria-label="Passage position"
            data-outside={position < clipStart || position > clipEnd ? 'true' : undefined}
            aria-valuetext={preciseClock(
              Math.max(passageWindow.start, Math.min(passageWindow.end, position)),
            )}
            disabled={busy}
            style={{
              '--progress': `${((Math.max(passageWindow.start, Math.min(passageWindow.end, position)) - passageWindow.start) / (passageWindow.end - passageWindow.start)) * 100}%`,
            }}
            mix={on('input', (event) => {
              if (!video) return
              previewEnd = clipEnd
              video.currentTime = Math.max(
                clipStart,
                Math.min(clipEnd, Number((event.currentTarget as HTMLInputElement).value)),
              )
              position = video.currentTime
              handle.update()
            })}
          />
          <TrimTimeline {...trimProps('passage')} />
        </div>
        <div class="ec-clip-actions">
          <span class="ec-clock ec-passage-duration">{clock(Math.round(clipEnd - clipStart))}</span>
          <button
            type="button"
            class="ec-save-clip"
            aria-label="Name highlight"
            disabled={!valid() || busy}
            mix={on('click', async () => {
              cancelPassageAnimation()
              editorStep = 'name'
              await handle.update()
              player
                ?.querySelector<HTMLInputElement>('[aria-label="Title"]')
                ?.focus({ preventScroll: true })
            })}
          >
            Save
          </button>
          <button
            type="button"
            class="ec-cancel-clip"
            aria-label="Cancel"
            disabled={busy}
            mix={on('click', closeEditor)}
          >
            <XMarkIcon />
          </button>
        </div>
      </div>
    )
  }

  function timeline() {
    const lanes: ElectroCuteHighlight[][] = []
    for (const highlight of highlights()) {
      const lane = lanes.find((items) => items.at(-1)!.end <= highlight.start)
      if (lane) lane.push(highlight)
      else lanes.push([highlight])
    }
    return lanes.map((lane, index) => (
      <div
        class="ec-timeline-row"
        key={index}
      >
        {lane.map((highlight) => (
          <button
            type="button"
            key={highlight.id}
            class="ec-marker"
            style={{
              left: `${(highlight.start / duration) * 100}%`,
              width: `${((highlight.end - highlight.start) / duration) * 100}%`,
            }}
            aria-label={`${highlight.title}, ${clock(highlight.start)} to ${clock(highlight.end)}, ${highlight.person}`}
            aria-current={
              position >= highlight.start && position < highlight.end ? 'true' : undefined
            }
            disabled={!ready}
            mix={on('click', () => choose(highlight))}
          />
        ))}
      </div>
    ))
  }

  function runtimeActions(item?: RuntimeHighlight) {
    if (!item?.canEdit) return null
    const action = (intent: HighlightIntent) =>
      void mutate(intent, { id: item.id, revision: item.revision })
    return (
      <>
        <button
          type="button"
          disabled={busy || !ready}
          mix={on('click', () => void openEditor(item))}
        >
          Edit highlight
        </button>
        {item.own && !item.withdrawn && (
          <button
            type="button"
            disabled={busy}
            mix={on('click', () => action('withdraw'))}
          >
            Withdraw
          </button>
        )}
        {runtime.artist && !item.hidden && (
          <button
            type="button"
            disabled={busy}
            mix={on('click', () => action('hide'))}
          >
            Hide
          </button>
        )}
        {((runtime.artist && item.hidden) || (item.own && item.withdrawn)) && (
          <button
            type="button"
            disabled={busy}
            mix={on('click', () => action('restore'))}
          >
            Restore
          </button>
        )}
        {item.status !== 'approved' && !item.hidden && !item.withdrawn && (
          <button
            type="button"
            disabled={busy}
            mix={on('click', () => action('retry'))}
          >
            Retry text check
          </button>
        )}
      </>
    )
  }

  return () => {
    const latest = sessions.find((item) => item.id === progress.latest)
    const { start, end } = bounds()
    return (
      <section
        mix={archiveStyle}
        aria-label="ElectroCute archive"
        data-session={session ? '' : undefined}
      >
        {preview && <p class="ec-preview">Local preview. Highlight drafts stay on this device.</p>}
        {session ? (
          <>
            <a
              class="ec-back"
              href={archivePath}
            >
              All sessions
            </a>
            <h1>{session.title}</h1>
            <time
              class="ec-date"
              dateTime={session.recordedAt}
            >
              {date(session.recordedAt)}
            </time>
            <div class="ec-layout">
              <div>
                <div
                  class="ec-player"
                  data-enhanced={enhanced ? '' : undefined}
                  data-editing={editing ? '' : undefined}
                  mix={[
                    ref((node) => {
                      player = node
                    }),
                    on('keydown', (event) => {
                      if (event.key === 'Escape' && editing && !busy) {
                        event.preventDefault()
                        closeEditor()
                      }
                    }),
                  ]}
                >
                  <div class="ec-stage">
                    <video
                      class="ec-video"
                      controls
                      playsInline
                      preload="metadata"
                      src={session.src}
                      poster={session.poster}
                      aria-label={session.title}
                      mix={[
                        ref((node) => {
                          video = node
                        }),
                        on('loadedmetadata', metadata),
                        on('play', () => {
                          heard = true
                          handle.update()
                        }),
                        on('pause', () => {
                          savePosition(true)
                          handle.update()
                        }),
                        on('volumechange', () => {
                          handle.update()
                        }),
                        on('seeked', () => {
                          position = video?.currentTime ?? position
                          handle.update()
                        }),
                        on('ended', () => {
                          savePosition(true)
                          handle.update()
                        }),
                        on('error', () => {
                          ready = false
                          failed = true
                          handle.update()
                        }),
                        on('timeupdate', () => {
                          if (!video) return
                          if (previewEnd !== undefined && video.currentTime >= previewEnd) {
                            const stop = previewEnd
                            previewEnd = undefined
                            video.pause()
                            video.currentTime = stop
                          }
                          position = video.currentTime
                          savePosition()
                          handle.update()
                        }),
                      ]}
                    />

                    <button
                      class="ec-video-tap"
                      type="button"
                      aria-label={video?.paused !== false ? 'Play video' : 'Pause video'}
                      disabled={!ready}
                      mix={on('click', () => void togglePlayback())}
                    >
                      {video?.paused !== false && (
                        <span class="ec-play-badge">
                          <FeedIcon name="play" />
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      class="ec-icon-button ec-fullscreen"
                      aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                      disabled={!ready}
                      mix={on('click', () => void toggleFullscreen())}
                    >
                      <FeedIcon name={fullscreen ? 'exit-fullscreen' : 'fullscreen'} />
                    </button>
                    <div class="ec-transport">
                      <div class="ec-transport-row">
                        <button
                          type="button"
                          class="ec-icon-button"
                          aria-label={video?.paused !== false ? 'Play' : 'Pause'}
                          disabled={!ready}
                          mix={on('click', () => void togglePlayback())}
                        >
                          <FeedIcon name={video?.paused !== false ? 'play' : 'pause'} />
                        </button>
                        <PlaybackTimeline
                          position={position}
                          duration={duration}
                          disabled={!ready}
                          seek={seekTo}
                          editing={editing}
                          editorRange={{ start: clipStart, end: clipEnd }}
                          editor={editing ? editor() : undefined}
                          canHighlight={Boolean(
                            (preview || runtime.email) && !editing && ready && !busy,
                          )}
                          highlight={(time) => void openEditor(undefined, time)}
                        >
                          {editing && <TrimTimeline {...trimProps()} />}
                          <div
                            class="ec-timeline"
                            aria-label="Highlight timeline"
                          >
                            {timeline()}
                          </div>
                        </PlaybackTimeline>
                        {(preview || runtime.email) && (
                          <button
                            type="button"
                            class="ec-icon-button ec-highlight-star ec-playhead-highlight"
                            aria-label="Highlight at playhead"
                            disabled={!ready || editing || busy}
                            mix={on('click', () => void openEditor())}
                          >
                            <HighlightStar />
                          </button>
                        )}
                        <div class="ec-volume-control">
                          <button
                            type="button"
                            class="ec-icon-button"
                            aria-label={
                              video?.muted || video?.volume === 0 ? 'Unmute sound' : 'Mute sound'
                            }
                            disabled={!ready}
                            mix={on('click', () => {
                              if (video) {
                                video.muted = !video.muted
                                if (!video.muted && video.volume === 0) video.volume = 1
                              }
                            })}
                          >
                            <FeedIcon
                              name={video?.muted || video?.volume === 0 ? 'muted' : 'sound'}
                            />
                          </button>

                          <div class="ec-volume-popover">
                            <input
                              type="range"
                              class="ec-volume ec-seek"
                              min={0}
                              max={1}
                              step={0.01}
                              value={video?.volume ?? 1}
                              aria-label="Volume"
                              style={{ '--progress': `${(video?.volume ?? 1) * 100}%` }}
                              mix={[
                                on('input', (event) => {
                                  if (video) {
                                    video.volume = Number(
                                      (event.currentTarget as HTMLInputElement).value,
                                    )
                                    video.muted = video.volume === 0
                                  }
                                }),
                                on('keydown', (event) => {
                                  if (
                                    !video ||
                                    (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')
                                  )
                                    return
                                  event.preventDefault()
                                  video.volume = Math.max(
                                    0,
                                    Math.min(
                                      1,
                                      video.volume + (event.key === 'ArrowUp' ? 0.01 : -0.01),
                                    ),
                                  )
                                  video.muted = video.volume === 0
                                }),
                              ]}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {failed && (
                  <div
                    class="ec-error"
                    role="alert"
                  >
                    <p>This video could not be loaded.</p>
                    <button
                      type="button"
                      mix={on('click', () => video?.load())}
                    >
                      Retry
                    </button>{' '}
                    <a
                      href={session.src}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open video
                    </a>
                  </div>
                )}
                {!preview && runtime.ready && !runtime.email && (
                  <a
                    class="ec-login-link"
                    href="/login"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Log in to set highlights
                  </a>
                )}
                {!preview && runtime.email && (
                  <details class="ec-profile">
                    <summary
                      mix={on('click', () => {
                        alias = runtime.alias ?? runtime.suggestedAlias ?? ''
                        handle.update()
                      })}
                    >
                      Public profile
                    </summary>
                    <form
                      mix={on('submit', (event) => {
                        event.preventDefault()
                        void mutate('profile', { id: crypto.randomUUID(), alias })
                      })}
                    >
                      <label>
                        Public name
                        <input
                          aria-label="Public name"
                          maxLength={20}
                          required
                          value={alias}
                          disabled={busy}
                          mix={on('input', (event) => {
                            alias = (event.currentTarget as HTMLInputElement).value
                            handle.update()
                          })}
                        />
                      </label>
                      <button
                        type="submit"
                        disabled={busy || !alias.trim()}
                      >
                        Update public name
                      </button>
                    </form>
                  </details>
                )}
                {!preview && runtimeFailed && (
                  <div class="ec-error">
                    <p>{highlightMessages.failure}</p>
                    <button
                      type="button"
                      mix={on('click', () => void loadRuntime())}
                    >
                      Reload highlights
                    </button>
                  </div>
                )}
                <p
                  class="ec-status"
                  role="status"
                >
                  {feedback}
                </p>
                {shareUrl && (
                  <input
                    aria-label="Highlight link"
                    value={shareUrl}
                    readOnly
                    mix={ref((node) => node.select())}
                  />
                )}
              </div>
              <aside aria-label="Highlights">
                <h2>
                  Highlights <span class="ec-muted">{highlights().length}</span>
                </h2>
                <ol class="ec-highlight-list">
                  {highlights().map((highlight) => (
                    <li
                      class="ec-highlight"
                      key={highlight.id}
                      data-active={
                        position >= highlight.start && position < highlight.end ? '' : undefined
                      }
                    >
                      <a
                        class="ec-highlight-link"
                        href={highlightPath(session.id, highlight.id)}
                        mix={on('click', (event) => {
                          if (
                            ready &&
                            event.button === 0 &&
                            !event.metaKey &&
                            !event.ctrlKey &&
                            !event.shiftKey &&
                            !event.altKey
                          ) {
                            event.preventDefault()
                            choose(highlight)
                          }
                        })}
                      >
                        <span class="ec-highlight-title">{highlight.title}</span>
                        <span class="ec-highlight-meta">
                          <span class="ec-clock">
                            {clock(highlight.start)}–{clock(highlight.end)}
                          </span>
                          <span>{highlight.person}</span>
                        </span>
                      </a>
                      <div class="ec-highlight-actions">
                        {runtimeActions(
                          runtime.highlights.find((item) => item.id === highlight.id),
                        )}
                        {!drafts.some((item) => item.id === highlight.id) && (
                          <button
                            type="button"
                            mix={on('click', async () => {
                              const url = new URL(
                                highlightPath(session.id, highlight.id),
                                location.origin,
                              ).href
                              try {
                                await navigator.clipboard.writeText(url)
                                feedback = 'Link copied.'
                              } catch {
                                shareUrl = url
                                feedback = 'Copy this highlight link.'
                              }
                              handle.update()
                            })}
                          >
                            Share
                          </button>
                        )}
                        {drafts.some((item) => item.id === highlight.id) && (
                          <>
                            <button
                              type="button"
                              mix={on('click', () => void openEditor(highlight))}
                            >
                              Edit draft
                            </button>
                            <button
                              type="button"
                              mix={on('click', () => {
                                const next = drafts.filter((item) => item.id !== highlight.id)
                                if (store(draftKey(session.id), next)) {
                                  drafts = next
                                  feedback = 'Draft removed.'
                                } else feedback = 'Could not remove this draft. Try again.'
                                handle.update()
                              })}
                            >
                              Remove draft
                            </button>
                          </>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
                {!highlights().length && <p class="ec-muted">No highlights yet.</p>}
                {runtime.highlights.some((item) => !isPublic(item)) && (
                  <section aria-label="Unpublished highlights">
                    <h2>Unpublished</h2>
                    <ol class="ec-highlight-list">
                      {runtime.highlights
                        .filter((item) => !isPublic(item))
                        .map((item) => (
                          <li
                            class="ec-highlight"
                            key={item.id}
                          >
                            <strong class="ec-highlight-title">{item.title}</strong>
                            <p class="ec-highlight-meta">
                              <span class="ec-clock">
                                {clock(item.start)}–{clock(item.end)}
                              </span>
                              <span>{item.person}</span>
                            </p>
                            <p class="ec-muted">
                              {item.hidden
                                ? 'Hidden by artist'
                                : item.withdrawn
                                  ? 'Withdrawn'
                                  : item.status === 'rejected'
                                    ? 'Revise title or public name'
                                    : 'Text check pending'}
                            </p>
                            <div class="ec-highlight-actions">{runtimeActions(item)}</div>
                          </li>
                        ))}
                    </ol>
                  </section>
                )}
              </aside>
            </div>
          </>
        ) : (
          <>
            <h1>ElectroCute</h1>
            {handle.props.children}
            {latest && (
              <div class="ec-resume">
                <div class="ec-resume-title">
                  <span class="ec-muted">Continue listening</span>
                  <strong>{latest.title}</strong>
                  <span class="ec-muted ec-clock">
                    {clock(progress.positions[latest.id])} / {clock(latest.duration)}
                  </span>
                </div>
                <a
                  class="ec-button ec-primary"
                  href={sessionPath(latest.id)}
                >
                  Continue
                </a>
              </div>
            )}
            <div class="ec-heading">
              <h2>
                Sessions <span class="ec-muted">{sessions.length}</span>
              </h2>
              <button
                type="button"
                aria-label="Reverse session order"
                mix={on('click', () => {
                  newest = !newest
                  handle.update()
                })}
              >
                {newest ? 'Newest first ↓' : 'Oldest first ↑'}
              </button>
            </div>
            <ol class="ec-list">
              {sortedSessions(sessions, newest).map((item) => (
                <li key={item.id}>
                  <a
                    class="ec-session"
                    href={sessionPath(item.id)}
                  >
                    <span class="ec-session-title">{item.title}</span>
                    <time
                      class="ec-session-date"
                      dateTime={item.recordedAt}
                    >
                      {date(item.recordedAt)}
                    </time>
                    <span class="ec-session-duration">{clock(item.duration)}</span>
                    {progress.positions[item.id] !== undefined && (
                      <span
                        class="ec-progress"
                        aria-label={`${clock(progress.positions[item.id])} listened`}
                      >
                        <span
                          style={{
                            width: `${(progress.positions[item.id] / item.duration) * 100}%`,
                          }}
                        />
                      </span>
                    )}
                  </a>
                </li>
              ))}
            </ol>
            {!sessions.length && <p class="ec-muted">No sessions available yet.</p>}
          </>
        )}
      </section>
    )
  }
}
