import { on, ref, type Handle, type RemixNode } from 'remix/component'
import { clock } from './model.ts'

interface TimelineProps {
  position: number
  duration: number
  disabled: boolean
  canHighlight: boolean
  editing: boolean
  editorPoint: number
  editor?: RemixNode
  seek(time: number): void
  highlight(time: number): void
  children?: RemixNode
}
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value))

/** Track the whole range hit area; entering the popover keeps the chosen time. */
export function PlaybackTimeline(handle: Handle<TimelineProps>) {
  let hoverTime: number | undefined
  let open = false
  let width = 0
  let wrap: HTMLDivElement | undefined
  let connection: number[] | undefined
  let input: HTMLInputElement | undefined
  let closeTimer: ReturnType<typeof setTimeout> | undefined
  const cancelClose = () => clearTimeout(closeTimer)
  function show() {
    cancelClose()
    if (handle.props.disabled) return
    open = true
    handle.update()
  }
  function close() {
    cancelClose()
    if (handle.props.editing) return
    open = false
    hoverTime = undefined
    handle.update()
  }
  function leave(node: HTMLElement) {
    cancelClose()
    closeTimer = setTimeout(() => {
      if (!node.contains(document.activeElement)) close()
    }, 180)
  }
  handle.signal.addEventListener('abort', cancelClose, { once: true })
  function measureConnection() {
    const passage = wrap?.querySelector('.ec-passage-track input')?.getBoundingClientRect()
    const selection = wrap?.querySelector('.ec-trim-selection')?.getBoundingClientRect()
    const popup = wrap?.querySelector('.ec-time-tooltip')?.getBoundingClientRect()
    const root = wrap?.getBoundingClientRect()
    const next =
      handle.props.editing && passage && selection && popup && root
        ? [
            passage.left + 5 - root.left,
            passage.right - 5 - root.left,
            popup.bottom - root.top,
            selection.left - root.left,
            selection.right - root.left,
            selection.top - root.top,
          ]
        : undefined
    if (JSON.stringify(next) === JSON.stringify(connection)) return
    connection = next
    handle.update()
  }
  return () => {
    const p = handle.props
    const time = hoverTime ?? p.position
    const point = 5 + (p.duration ? time / p.duration : 0) * Math.max(0, width - 10)
    const half = Math.min(width / 2, p.canHighlight ? 84 : 60)
    const center = clamp(point, half, Math.max(half, width - half))
    handle.queueTask(measureConnection)
    return (
      <div
        class="ec-seek-wrap"
        mix={[
          ref((node, signal) => {
            wrap = node
            const measure = () => {
              width = node.clientWidth
              handle.update()
            }
            const observer = new ResizeObserver(measure)
            observer.observe(node)
            measure()
            signal.addEventListener('abort', () => observer.disconnect(), { once: true })
          }),
          on<HTMLDivElement, 'pointermove'>('pointermove', (event) => {
            if (
              p.editing ||
              event.pointerType !== 'mouse' ||
              (event.target as Element).closest('.ec-main-trim, .ec-time-tooltip') ||
              !input
            )
              return
            const box = input.getBoundingClientRect()
            if (event.clientY < box.top || event.clientY > box.bottom) return
            hoverTime = clamp(
              ((event.clientX - box.left - 5) / Math.max(1, box.width - 10)) * p.duration,
              0,
              p.duration,
            )
            show()
          }),
          on('pointerenter', cancelClose),
          on<HTMLDivElement, 'pointerleave'>('pointerleave', (event) => leave(event.currentTarget)),
          on('focusin', cancelClose),
          on<HTMLDivElement, 'focusout'>('focusout', (event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) close()
          }),
          on('keydown', (event) => {
            if (p.editing || event.key !== 'Escape' || !open) return
            event.preventDefault()
            event.stopPropagation()
            input?.focus({ preventScroll: true })
            close()
          }),
        ]}
      >
        {p.editing && connection && (
          <svg
            class="ec-range-link"
            width={width}
            height={44}
            viewBox={`0 0 ${width} 44`}
            aria-hidden="true"
          >
            <path
              class="ec-range-wash"
              d={`M${connection[0]},${connection[2]} L${connection[1]},${connection[2]} L${connection[4]},${connection[5]} L${connection[3]},${connection[5]} Z`}
            />
            <path
              data-edge="start"
              d={`M${connection[0]},${connection[2]} L${connection[3]},${connection[5]}`}
            />
            <path
              data-edge="end"
              d={`M${connection[1]},${connection[2]} L${connection[4]},${connection[5]}`}
            />
          </svg>
        )}
        <input
          type="range"
          class="ec-seek"
          min={0}
          max={p.duration}
          step={0.1}
          value={p.position}
          aria-label="Playback position"
          aria-valuetext={`${clock(p.position)} / ${clock(p.duration)}`}
          aria-controls="ec-playback-tools"
          aria-expanded={p.editing || open}
          aria-haspopup="dialog"
          disabled={p.disabled}
          style={{ '--progress': `${p.duration ? (p.position / p.duration) * 100 : 0}%` }}
          mix={[
            ref((node) => {
              input = node
            }),
            on('input', (event) => p.seek(Number((event.currentTarget as HTMLInputElement).value))),
            on('focus', show),
            on('pointerdown', show),
            on('keydown', (event) => {
              if (event.key !== 'Escape') {
                hoverTime = undefined
                show()
              }
            }),
          ]}
        />
        <div
          id="ec-playback-tools"
          role="dialog"
          aria-label={p.editing ? 'Highlight editor' : 'Playback tools'}
          class="ec-time-tooltip"
          data-open={p.editing || open ? 'true' : undefined}
          data-editing={p.editing ? 'true' : undefined}
          data-connected={p.editing && connection ? 'true' : undefined}
          data-action={!p.editing && p.canHighlight ? '' : undefined}
          style={
            p.editing
              ? {
                  '--tip-arrow-x': `calc(var(--editor-inset) + ${5 + (p.duration ? p.editorPoint / p.duration : 0) * Math.max(0, width - 10)}px)`,
                }
              : { left: `${center}px`, '--tip-arrow-x': `${point - center + half}px` }
          }
        >
          {p.editing ? (
            p.editor
          ) : (
            <>
              <span class="ec-clock ec-time-label">
                {clock(time)} <span>/ {clock(p.duration)}</span>
              </span>
              {p.canHighlight && (
                <button
                  type="button"
                  class="ec-highlight-star"
                  aria-label="Set highlight"
                  mix={on('click', () => {
                    // Dismiss the hover state before the parent opens its editor.
                    close()
                    p.highlight(time)
                  })}
                >
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"
                      stroke="currentColor"
                      stroke-width="1.7"
                      stroke-linejoin="round"
                    />
                  </svg>
                </button>
              )}
            </>
          )}
        </div>
        {p.children}
      </div>
    )
  }
}
