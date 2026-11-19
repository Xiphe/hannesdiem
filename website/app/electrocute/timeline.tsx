import { on, ref, type Handle, type RemixNode } from 'remix/component'
import { clock } from './model.ts'

interface TimelineProps {
  position: number
  duration: number
  disabled: boolean
  canHighlight: boolean
  seek(time: number): void
  highlight(time: number): void
  children?: RemixNode
}
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value))

/** The seek popover keeps its timestamp while the pointer moves up to its action. */
export function PlaybackTimeline(handle: Handle<TimelineProps>) {
  let hoverTime: number | undefined
  let open = false
  let width = 0
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
    const half = Math.min(width / 2, p.canHighlight ? 84 : 60)
    const center = clamp(point, half, Math.max(half, width - half))
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
              event.pointerType !== 'mouse' ||
              (event.target as Element).closest('.ec-main-trim, .ec-time-tooltip') ||
              !input
            )
              return
            const box = input.getBoundingClientRect()
            if (event.clientY < box.top || event.clientY > box.bottom) return
            // Moving upward enters the action, rather than choosing a new time.
            if (open && event.clientY < box.top + box.height / 2 - 1) return
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
            if (event.key !== 'Escape' || !open) return
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
          aria-expanded={open}
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
          aria-label="Playback tools"
          class="ec-time-tooltip"
          data-open={open ? '' : undefined}
          data-action={p.canHighlight ? '' : undefined}
          style={{ left: `${center}px`, '--tip-arrow-x': `${point - center + half}px` }}
        >
          <span class="ec-clock ec-time-label">
            {clock(time)} <span>/ {clock(p.duration)}</span>
          </span>
          {p.canHighlight && (
            <button
              type="button"
              class="ec-clip-button"
              mix={on('click', () => {
                p.highlight(time)
                close()
              })}
            >
              Set highlight
            </button>
          )}
        </div>
        {p.children}
      </div>
    )
  }
}
