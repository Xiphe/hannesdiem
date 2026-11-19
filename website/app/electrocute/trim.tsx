import { on, ref, type Handle } from 'remix/component'
import { clock } from './model.ts'

interface TrimProps {
  start: number
  end: number
  duration: number
  frameRate?: number
  disabled: boolean
  change(start: number, end: number): void
}
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
export const preciseClock = (seconds: number) => {
  const milliseconds = Math.max(0, Math.round(seconds * 1000))
  return `${clock(milliseconds / 1000)}.${String(milliseconds % 1000).padStart(3, '0')}`
}

/** The full recording's playback bar is also the only trimming surface. */
export function TrimTimeline(handle: Handle<TrimProps>) {
  let rail: HTMLDivElement | undefined
  let selected: 'start' | 'end' = 'start'
  let drag:
    { id: number; kind: 'start' | 'end'; x: number; value: number; width: number } | undefined
  function change(kind: 'start' | 'end', value: number) {
    const p = handle.props
    const gap = p.frameRate ? 1 / p.frameRate : 0.001
    if (p.frameRate) value = Math.round(value * p.frameRate) / p.frameRate
    else value = Math.round(value * 1000) / 1000
    p.change(
      kind === 'start' ? clamp(value, 0, p.end - gap) : p.start,
      kind === 'end' ? clamp(value, p.start + gap, p.duration) : p.end,
    )
  }
  function begin(event: PointerEvent, kind: 'start' | 'end') {
    if (handle.props.disabled || event.button !== 0 || !rail) return
    event.preventDefault()
    event.stopPropagation()
    selected = kind
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
  function key(event: KeyboardEvent, kind: 'start' | 'end') {
    const p = handle.props
    let value: number
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      if (event.shiftKey && !p.frameRate) return
      const step = event.shiftKey ? 1 / p.frameRate! : 1
      value = p[kind] + (event.key === 'ArrowLeft' ? -step : step)
    } else if (event.key === 'Home') value = kind === 'start' ? 0 : p.start
    else if (event.key === 'End') value = kind === 'start' ? p.end : p.duration
    else return
    event.preventDefault()
    change(kind, value)
  }
  return () => {
    const p = handle.props
    return (
      <div
        class="ec-main-trim"
        aria-label="Trim highlight"
      >
        <div
          class="ec-trim-adjust"
          style={{ left: `clamp(44px, ${(p[selected] / p.duration) * 100}%, calc(100% - 44px))` }}
          mix={on('keydown', (event) => key(event, selected))}
        >
          <button
            type="button"
            aria-label={`Decrease highlight ${selected} by one second`}
            disabled={
              p.disabled ||
              (selected === 'start' ? p.start <= 0 : p.end <= p.start + 1 / (p.frameRate ?? 1000))
            }
            mix={on('click', () => change(selected, p[selected] - 1))}
          >
            {'<'}
          </button>
          <button
            type="button"
            aria-label={`Increase highlight ${selected} by one second`}
            disabled={
              p.disabled ||
              (selected === 'end'
                ? p.end >= p.duration
                : p.start >= p.end - 1 / (p.frameRate ?? 1000))
            }
            mix={on('click', () => change(selected, p[selected] + 1))}
          >
            {'>'}
          </button>
        </div>
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
              data-selected={selected === kind ? '' : undefined}
              disabled={p.disabled}
              style={{ left: `${(p[kind] / p.duration) * 100}%` }}
              mix={[
                on<HTMLButtonElement, 'focus'>('focus', () => {
                  selected = kind
                  handle.update()
                }),
                on<HTMLButtonElement, 'pointerdown'>('pointerdown', (event) => begin(event, kind)),
                on<HTMLButtonElement, 'pointermove'>('pointermove', move),
                on<HTMLButtonElement, 'pointerup'>('pointerup', finish),
                on<HTMLButtonElement, 'pointercancel'>('pointercancel', finish),
                on<HTMLButtonElement, 'keydown'>('keydown', (event) => key(event, kind)),
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
          Drag either edge. Select an edge, then use the adjacent arrows, or keyboard arrow keys for
          seconds.
          {p.frameRate ? ' Shift and arrow keys adjust one frame.' : ''}
        </span>
      </div>
    )
  }
}
