import { on, ref, type Handle } from 'remix/component'
import { clock } from './model.ts'

export type TrimEdge = 'start' | 'end'

interface TrimProps {
  start: number
  end: number
  duration: number
  frameRate?: number
  disabled: boolean
  selected: TrimEdge
  select(edge: TrimEdge): void
  change(start: number, end: number): void
}
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
export const preciseClock = (seconds: number) => {
  const milliseconds = Math.max(0, Math.round(seconds * 1000))
  return `${clock(milliseconds / 1000)}.${String(milliseconds % 1000).padStart(3, '0')}`
}

function change(p: TrimProps, kind: 'start' | 'end', value: number) {
  const gap = p.frameRate ? 1 / p.frameRate : 0.001
  if (p.frameRate) value = Math.round(value * p.frameRate) / p.frameRate
  else value = Math.round(value * 1000) / 1000
  p.change(
    kind === 'start' ? clamp(value, 0, p.end - gap) : p.start,
    kind === 'end' ? clamp(value, p.start + gap, p.duration) : p.end,
  )
}

function key(p: TrimProps, event: KeyboardEvent, kind: 'start' | 'end') {
  let value: number
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    if (event.shiftKey && !p.frameRate) return
    const step = event.shiftKey ? 1 / p.frameRate! : 1
    value = p[kind] + (event.key === 'ArrowLeft' ? -step : step)
  } else if (event.key === 'Home') value = kind === 'start' ? 0 : p.start
  else if (event.key === 'End') value = kind === 'start' ? p.end : p.duration
  else return
  event.preventDefault()
  change(p, kind, value)
}

export function TrimControls(handle: Handle<TrimProps>) {
  let repeatTimer: ReturnType<typeof setTimeout> | undefined
  let held: { pointer: number; edge: TrimEdge; direction: number } | undefined
  let skipClick = false
  function stop() {
    clearTimeout(repeatTimer)
    held = undefined
  }
  function repeat() {
    const p = handle.props
    if (!held || p.disabled || held.edge !== p.selected) return stop()
    const gap = p.frameRate ? 1 / p.frameRate : 0.001
    const next = clamp(
      p[p.selected] + held.direction,
      p.selected === 'start' ? 0 : p.start + gap,
      p.selected === 'start' ? p.end - gap : p.duration,
    )
    if (next === p[p.selected]) return stop()
    skipClick = true
    change(p, p.selected, next)
    repeatTimer = setTimeout(repeat, 120)
  }
  function begin(event: PointerEvent, direction: number) {
    if (event.button !== 0 || !event.isPrimary || handle.props.disabled) return
    stop()
    skipClick = false
    const button = event.currentTarget as HTMLButtonElement
    button.focus({ preventScroll: true })
    button.setPointerCapture(event.pointerId)
    held = { pointer: event.pointerId, edge: handle.props.selected, direction }
    repeatTimer = setTimeout(repeat, 450)
  }
  function release(event: PointerEvent) {
    if (held?.pointer === event.pointerId) stop()
  }
  handle.signal.addEventListener('abort', stop, { once: true })
  handle.queueTask(() => window.addEventListener('blur', stop, { signal: handle.signal }))
  return () => {
    const p = handle.props
    return (
      <div
        class="ec-trim-adjust"
        data-edge={p.selected}
        mix={[
          on('keydown', (event) => {
            stop()
            skipClick = false
            key(p, event, p.selected)
          }),
          on<HTMLDivElement, 'pointerup'>('pointerup', release),
          on<HTMLDivElement, 'pointercancel'>('pointercancel', release),
          on<HTMLDivElement, 'lostpointercapture'>('lostpointercapture', release),
          on('focusout', stop),
          on('contextmenu', (event) => event.preventDefault()),
        ]}
      >
        <button
          type="button"
          aria-label={`Decrease highlight ${p.selected} by one second`}
          disabled={
            p.disabled ||
            (p.selected === 'start' ? p.start <= 0 : p.end <= p.start + 1 / (p.frameRate ?? 1000))
          }
          mix={[
            on('pointerdown', (event) => begin(event, -1)),
            on('click', () => {
              if (skipClick) {
                skipClick = false
                return
              }
              change(p, p.selected, p[p.selected] - 1)
            }),
          ]}
        >
          −
        </button>
        <span
          class="ec-trim-bracket"
          aria-hidden="true"
        >
          {p.selected === 'start' ? '[' : ']'}
        </span>
        <button
          type="button"
          aria-label={`Increase highlight ${p.selected} by one second`}
          disabled={
            p.disabled ||
            (p.selected === 'end'
              ? p.end >= p.duration
              : p.start >= p.end - 1 / (p.frameRate ?? 1000))
          }
          mix={[
            on('pointerdown', (event) => begin(event, 1)),
            on('click', () => {
              if (skipClick) {
                skipClick = false
                return
              }
              change(p, p.selected, p[p.selected] + 1)
            }),
          ]}
        >
          +
        </button>
      </div>
    )
  }
}

/** The full recording's playback bar is also the only trimming surface. */
export function TrimTimeline(handle: Handle<TrimProps>) {
  let rail: HTMLDivElement | undefined
  let drag:
    { id: number; kind: 'start' | 'end'; x: number; value: number; width: number } | undefined
  function begin(event: PointerEvent, kind: 'start' | 'end') {
    if (handle.props.disabled || event.button !== 0 || !rail) return
    event.preventDefault()
    event.stopPropagation()
    handle.props.select(kind)
    const target = event.currentTarget as HTMLButtonElement
    target.focus({ preventScroll: true })
    target.setPointerCapture(event.pointerId)
    drag = {
      id: event.pointerId,
      kind,
      x: event.clientX,
      value: handle.props[kind],
      width: rail.getBoundingClientRect().width,
    }
    handle.update()
  }
  function move(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.id) return
    event.preventDefault()
    // Clicking selects an edge without quantizing or moving it.
    if (Math.abs(event.clientX - drag.x) < 2) return
    change(
      handle.props,
      drag.kind,
      Math.round(drag.value + ((event.clientX - drag.x) / drag.width) * handle.props.duration),
    )
  }
  function finish(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.id) return
    const target = event.currentTarget as HTMLButtonElement
    if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId)
    drag = undefined
  }
  return () => {
    const p = handle.props
    return (
      <div
        class="ec-main-trim"
        aria-label="Trim highlight"
      >
        <div
          class="ec-trim-rail"
          mix={ref((node) => {
            rail = node
          })}
        >
          <span
            class="ec-trim-selection"
            style={{
              left: `${(p.start / p.duration) * 100}%`,
              width: `${((p.end - p.start) / p.duration) * 100}%`,
            }}
          />
          {(['start', 'end'] as const).map((kind) => (
            <button
              type="button"
              key={kind}
              role="slider"
              class="ec-trim-edge"
              data-edge={kind}
              aria-label={`Highlight ${kind}`}
              aria-valuemin={kind === 'start' ? 0 : p.start}
              aria-valuemax={kind === 'start' ? p.end : p.duration}
              aria-valuenow={p[kind]}
              aria-valuetext={preciseClock(p[kind])}
              aria-describedby="ec-trim-help"
              data-selected={p.selected === kind ? '' : undefined}
              disabled={p.disabled}
              style={{ left: `${(p[kind] / p.duration) * 100}%` }}
              mix={[
                on<HTMLButtonElement, 'focus'>('focus', () => {
                  p.select(kind)
                }),
                on<HTMLButtonElement, 'pointerdown'>('pointerdown', (event) => begin(event, kind)),
                on<HTMLButtonElement, 'pointermove'>('pointermove', move),
                on<HTMLButtonElement, 'pointerup'>('pointerup', finish),
                on<HTMLButtonElement, 'pointercancel'>('pointercancel', finish),
                on<HTMLButtonElement, 'keydown'>('keydown', (event) => key(p, event, kind)),
              ]}
            >
              <span />
            </button>
          ))}
        </div>
        <span
          id="ec-trim-help"
          class="ec-sr-only"
        >
          Drag either edge. Select an edge, then use minus or plus for seconds. Hold to repeat.
          Keyboard arrow keys also adjust seconds.
          {p.frameRate ? ' Shift and arrow keys adjust one frame.' : ''}
        </span>
      </div>
    )
  }
}
