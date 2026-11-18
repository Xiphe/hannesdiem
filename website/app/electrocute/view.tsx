import { on, ref, type Handle } from 'remix/component'
import type { ElectroCuteArchiveProps, ElectroCuteHighlight } from '@hannesdiem/content-components'
import { archiveStyle } from './styles.ts'
import {
  archivePath,
  clock,
  defaultRange,
  highlightPath,
  parseClock,
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
  let editorNode: HTMLElement | undefined
  let titleInput: HTMLInputElement | undefined
  let position = 0
  let duration = session?.duration ?? 0
  let ready = false
  let failed = false
  let editing = false
  let editingId: string | undefined
  let startText = '0:00'
  let endText = '1:00'
  let title = ''
  let feedback = ''
  let shareUrl = ''
  let heard = false
  let lastSave = -1
  let previewEnd: number | undefined
  let initialPosition: number | undefined
  const highlights = () =>
    [...(session?.highlights ?? []), ...drafts].sort(
      (a, b) => a.start - b.start || a.end - b.end || a.id.localeCompare(b.id),
    )
  const bounds = () => ({ start: parseClock(startText), end: parseClock(endText) })
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

  async function openEditor(highlight?: ElectroCuteHighlight) {
    if (!video || !preview || !ready) return
    previewEnd = undefined
    video.pause()
    const range = highlight ?? defaultRange(Math.floor(video.currentTime), duration)
    startText = clock(range.start)
    endText = clock(range.end)
    title = highlight?.title ?? ''
    editingId = highlight?.id
    editing = true
    feedback = ''
    await handle.update()
    editorNode?.scrollIntoView({ block: 'nearest', behavior: 'instant' })
    titleInput?.focus({ preventScroll: true })
  }

  handle.queueTask((signal) => {
    progress = readProgress(stored(progressKey), sessions)
    if (preview && session) drafts = readDrafts(stored(draftKey(session.id)), session.duration)
    const requested = new URL(location.href).searchParams.get('highlight')
    const highlight = highlights().find((item) => item.id === requested)
    if (highlight) initialPosition = highlight.start
    else if (!requested && session) initialPosition = progress.positions[session.id]
    else if (requested)
      feedback = 'This highlight is no longer available. You can still play the full session.'
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
            title={highlight.title}
            disabled={!ready}
            mix={on('click', () => choose(highlight))}
          />
        ))}
      </div>
    ))
  }

  return () => {
    const latest = sessions.find((item) => item.id === progress.latest)
    const { start, end } = bounds()
    return (
      <section
        mix={archiveStyle}
        aria-label="ElectroCute archive"
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
                    }),
                    on('pause', () => savePosition(true)),
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
                {failed && (
                  <div
                    class="ec-error"
                    role="alert"
                  >
                    <p>This video could not be loaded.</p>
                    <div class="ec-player-actions">
                      <button
                        type="button"
                        mix={on('click', () => video?.load())}
                      >
                        Retry
                      </button>
                      <a
                        class="ec-button"
                        href={session.src}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open video
                      </a>
                    </div>
                  </div>
                )}
                <div
                  class="ec-timeline"
                  aria-label="Highlight timeline"
                >
                  {timeline()}
                </div>
                <div class="ec-player-actions">
                  <span class="ec-clock ec-muted">
                    {clock(position)} / {clock(duration)}
                  </span>
                  {preview && (
                    <button
                      type="button"
                      class="ec-primary"
                      disabled={!ready}
                      mix={on('click', () => void openEditor())}
                    >
                      Set highlight
                    </button>
                  )}
                </div>
                {editing && (
                  <form
                    class="ec-editor"
                    aria-label="Highlight editor"
                    mix={[
                      ref((node) => {
                        editorNode = node
                      }),
                      on('submit', (event) => {
                        event.preventDefault()
                        if (!valid() || !title.trim()) return
                        const next = [
                          ...drafts.filter((item) => item.id !== editingId),
                          {
                            id: editingId ?? crypto.randomUUID(),
                            title: title.trim(),
                            person: 'You',
                            start: start!,
                            end: end!,
                          },
                        ]
                        if (!store(draftKey(session.id), next)) {
                          feedback =
                            'Could not save on this device. Keep this form open and try again.'
                        } else {
                          drafts = next
                          previewEnd = undefined
                          editing = false
                          feedback = 'Draft saved on this device.'
                        }
                        handle.update()
                      }),
                    ]}
                  >
                    <h2>{editingId ? 'Edit highlight' : 'New highlight'}</h2>
                    <div class="ec-fields">
                      <label class="ec-field-wide">
                        Title
                        <input
                          required
                          maxLength={120}
                          value={title}
                          mix={[
                            ref((node) => {
                              titleInput = node
                            }),
                            on('input', (event) => {
                              title = (event.currentTarget as HTMLInputElement).value
                              handle.update()
                            }),
                          ]}
                        />
                      </label>
                      <div class="ec-range-field">
                        <label>
                          Start
                          <input
                            aria-label="Start time"
                            value={startText}
                            mix={on('input', (event) => {
                              startText = (event.currentTarget as HTMLInputElement).value
                              handle.update()
                            })}
                          />
                        </label>
                        <input
                          type="range"
                          min={0}
                          max={Math.floor(duration)}
                          step={1}
                          value={start ?? 0}
                          aria-label="Adjust start"
                          mix={on('input', (event) => {
                            startText = clock(
                              Number((event.currentTarget as HTMLInputElement).value),
                            )
                            handle.update()
                          })}
                        />
                        <button
                          type="button"
                          mix={on('click', () => {
                            startText = clock(video?.currentTime ?? 0)
                            handle.update()
                          })}
                        >
                          Use current position
                        </button>
                      </div>
                      <div class="ec-range-field">
                        <label>
                          End
                          <input
                            aria-label="End time"
                            value={endText}
                            mix={on('input', (event) => {
                              endText = (event.currentTarget as HTMLInputElement).value
                              handle.update()
                            })}
                          />
                        </label>
                        <input
                          type="range"
                          min={0}
                          max={Math.floor(duration)}
                          step={1}
                          value={end ?? duration}
                          aria-label="Adjust end"
                          mix={on('input', (event) => {
                            endText = clock(Number((event.currentTarget as HTMLInputElement).value))
                            handle.update()
                          })}
                        />
                        <button
                          type="button"
                          mix={on('click', () => {
                            endText = clock(video?.currentTime ?? 0)
                            handle.update()
                          })}
                        >
                          Use current position
                        </button>
                      </div>
                    </div>
                    {!valid() && (
                      <p
                        class="ec-status"
                        role="alert"
                      >
                        Choose a start before the end, within this session. Use m:ss or h:mm:ss.
                      </p>
                    )}
                    <div class="ec-editor-actions">
                      <button
                        type="button"
                        disabled={!valid()}
                        mix={on('click', () => void playAt(start!, end!))}
                      >
                        Preview passage
                      </button>
                      <button
                        type="submit"
                        class="ec-primary"
                        disabled={!valid() || !title.trim()}
                      >
                        Save draft
                      </button>
                      <button
                        type="button"
                        mix={on('click', () => {
                          if (previewEnd !== undefined) video?.pause()
                          previewEnd = undefined
                          editing = false
                          handle.update()
                        })}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
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
