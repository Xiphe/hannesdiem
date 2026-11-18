import { on, ref, type Handle } from 'remix/component'
import { clock } from './model.ts'

interface TrimProps {
  start: number
  end: number
  duration: number
  position: number
  disabled: boolean
  change(start: number, end: number, seek: number): void
  seek(time: number): void
}
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

/** A local time scale keeps a minute selectable even inside a two-hour session. */
export function TrimTimeline(handle: Handle<TrimProps>) {
  let rail: HTMLDivElement | undefined
  const initial = handle.props
  let span = Math.min(initial.duration, Math.max(180, initial.end - initial.start + 120))
  let offset = clamp((initial.start + initial.end - span) / 2, 0, initial.duration - span)
  let drag:
    | {
        id: number
        kind: 'start' | 'end' | 'move'
        x: number
        start: number
        end: number
        width: number
      }
    | undefined
  const percent = (time: number) => clamp(((time - offset) / span) * 100, 0, 100)

  function change(
    kind: 'start' | 'end' | 'move',
    delta: number,
    start = handle.props.start,
    end = handle.props.end,
  ) {
    const duration = Math.floor(handle.props.duration)
    if (kind === 'start') start = clamp(Math.round(start + delta), 0, end - 1)
    else if (kind === 'end') end = clamp(Math.round(end + delta), start + 1, duration)
    else {
      const shift = clamp(Math.round(delta), -start, duration - end)
      start += shift
      end += shift
    }
    handle.props.change(start, end, kind === 'end' ? Math.max(start, end - 0.1) : start)
  }
  function begin(event: PointerEvent, kind: 'start' | 'end' | 'move') {
    if (handle.props.disabled || event.button !== 0 || !rail) return
    event.preventDefault()
    event.stopPropagation()
    const target = event.currentTarget as HTMLButtonElement
    target.focus({ preventScroll: true })
    target.setPointerCapture(event.pointerId)
    drag = {
      id: event.pointerId,
      kind,
      x: event.clientX,
      start: handle.props.start,
      end: handle.props.end,
      width: rail.getBoundingClientRect().width,
    }
  }
  function move(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.id) return
    event.preventDefault()
    change(drag.kind, ((event.clientX - drag.x) / drag.width) * span, drag.start, drag.end)
  }
  function finish(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.id) return
    const target = event.currentTarget as HTMLButtonElement
    if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId)
    drag = undefined
    handle.update()
  }
  function key(event: KeyboardEvent, kind: 'start' | 'end' | 'move') {
    const p = handle.props
    const step = event.shiftKey ? 10 : 1
    let delta: number
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') delta = -step
    else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') delta = step
    else if (event.key === 'Home') delta = -(kind === 'end' ? p.end - p.start - 1 : p.start)
    else if (event.key === 'End')
      delta = kind === 'start' ? p.end - p.start - 1 : Math.floor(p.duration) - p.end
    else return
    event.preventDefault()
    change(kind, delta)
  }
  function zoom(factor: number) {
    const p = handle.props
    span = Math.min(p.duration, Math.max(15, p.end - p.start + 10, span * factor))
    offset = clamp((p.start + p.end - span) / 2, 0, p.duration - span)
    handle.update()
  }
  const gesture = (kind: 'start' | 'end' | 'move') => [
    on<HTMLButtonElement, 'pointerdown'>('pointerdown', (event: PointerEvent) =>
      begin(event, kind),
    ),
    on<HTMLButtonElement, 'pointermove'>('pointermove', move),
    on<HTMLButtonElement, 'pointerup'>('pointerup', finish),
    on<HTMLButtonElement, 'pointercancel'>('pointercancel', finish),
    on<HTMLButtonElement, 'keydown'>('keydown', (event: KeyboardEvent) => key(event, kind)),
  ]

  return () => {
    const p = handle.props
    if (!drag && (p.start < offset || p.end > offset + span)) {
      span = Math.min(p.duration, Math.max(span, p.end - p.start + 30))
      offset = clamp((p.start + p.end - span) / 2, 0, p.duration - span)
    }
    const start = percent(p.start),
      end = percent(p.end)
    return (
      <div
        class="ec-trimmer"
        aria-label="Trim highlight"
      >
        <div class="ec-trim-scale">
          <span class="ec-clock">{clock(offset)}</span>
          <span>Drag the edges to trim</span>
          <div class="ec-zoom">
            <button
              type="button"
              aria-label="Zoom out timeline"
              disabled={p.disabled || span >= p.duration}
              mix={on('click', () => zoom(2))}
            >
              −
            </button>
            <button
              type="button"
              aria-label="Zoom in timeline"
              disabled={p.disabled || span <= Math.max(15, p.end - p.start + 10)}
              mix={on('click', () => zoom(0.5))}
            >
              +
            </button>
          </div>
          <span class="ec-clock">{clock(offset + span)}</span>
        </div>
        <div
          class="ec-trim-rail"
          mix={ref((node) => {
            rail = node
          })}
        >
          <button
            type="button"
            class="ec-trim-scrub"
            aria-label="Seek within highlight timeline"
            disabled={p.disabled}
            mix={on('click', (event) => {
              if (!rail) return
              const box = rail.getBoundingClientRect()
              p.seek(offset + clamp((event.clientX - box.left) / box.width, 0, 1) * span)
            })}
          />
          <button
            type="button"
            role="slider"
            class="ec-trim-selection"
            aria-label="Move highlight"
            aria-valuemin={0}
            aria-valuemax={Math.max(0, Math.floor(p.duration - (p.end - p.start)))}
            aria-valuenow={p.start}
            aria-valuetext={`${clock(p.start)} to ${clock(p.end)}`}
            disabled={p.disabled}
            style={{ left: `${start}%`, width: `${Math.max(0, end - start)}%` }}
            mix={gesture('move')}
          >
            <span class="ec-clock">{clock(Math.max(0, p.end - p.start))}</span>
          </button>
          {(['start', 'end'] as const).map((kind) => (
            <button
              type="button"
              role="slider"
              class="ec-trim-edge"
              key={kind}
              aria-label={`Highlight ${kind}`}
              aria-valuemin={kind === 'start' ? 0 : p.start + 1}
              aria-valuemax={kind === 'start' ? p.end - 1 : Math.floor(p.duration)}
              aria-valuenow={p[kind]}
              aria-valuetext={clock(p[kind])}
              disabled={p.disabled}
              style={{ left: `${kind === 'start' ? start : end}%` }}
              mix={gesture(kind)}
            >
              <span />
            </button>
          ))}
          {p.position >= offset && p.position <= offset + span && (
            <span
              class="ec-trim-cursor"
              style={{ left: `${percent(p.position)}%` }}
            />
          )}
        </div>
      </div>
    )
  }
}
