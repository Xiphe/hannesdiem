import { on, ref, type Handle, type RemixNode } from 'remix/component'
import { clock } from './model.ts'

interface TimelineProps {
  position: number
  duration: number
  disabled: boolean
  canHighlight: boolean
  editing: boolean
  editorRange: { start: number; end: number }
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
  let tooltipWidth = 184
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
  return () => {
    const p = handle.props
    const time = hoverTime ?? p.position
    const point = 5 + (p.duration ? time / p.duration : 0) * Math.max(0, width - 10)
    const half = Math.min(width / 2, tooltipWidth / 2)
    // Let the body overhang the rail into its gap so the arrow clears its corners.
    const center = clamp(point, half - 8, Math.max(half - 8, width - half + 8))
    const rangeLeft =
      5 + (p.duration ? p.editorRange.start / p.duration : 0) * Math.max(0, width - 10)
    const rangeWidth = p.duration
      ? ((p.editorRange.end - p.editorRange.start) / p.duration) * Math.max(0, width - 10)
      : 0
    return (
      <div
        class="ec-seek-wrap"
        mix={[
          ref((node, signal) => {
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
          mix={ref((node, signal) => {
            const measure = () => {
              tooltipWidth = node.getBoundingClientRect().width
              handle.update()
            }
            const observer = new ResizeObserver(measure)
            observer.observe(node)
            signal.addEventListener('abort', () => observer.disconnect(), { once: true })
          })}
          data-open={p.editing || open ? 'true' : undefined}
          data-editing={p.editing ? 'true' : undefined}
          data-action={!p.editing && p.canHighlight ? '' : undefined}
          style={
            p.editing
              ? undefined
              : { left: `${center}px`, '--tip-arrow-x': `${point - center + half}px` }
          }
        >
          {p.editing && (
            <svg
              class="ec-range-arrow"
              aria-hidden="true"
              width={rangeWidth + 10}
              height={5}
              viewBox={`0 0 ${rangeWidth + 10} 5`}
              style={{
                left: `calc(var(--editor-inset) + ${rangeLeft - 6}px)`,
                width: `${rangeWidth + 10}px`,
              }}
            >
              <path d={`M0 0 L5 5 H${rangeWidth + 5} L${rangeWidth + 10} 0`} />
            </svg>
          )}
          {p.editing ? (
            p.editor
          ) : (
            <>
              {p.canHighlight && (
                <button
                  type="button"
                  class="ec-highlight-star"
                  aria-label="Set highlight"
                  tabIndex={-1}
                  mix={on('click', () => {
                    // Dismiss the hover state before the parent opens its editor.
                    close()
                    p.highlight(time)
                  })}
                >
                  <HighlightStar />
                </button>
              )}
              <span class="ec-clock ec-time-label">
                {clock(time)} <span>/ {clock(p.duration)}</span>
              </span>
            </>
          )}
        </div>
        {p.children}
      </div>
    )
  }
}

export function HighlightStar() {
  return () => (
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
  )
}
