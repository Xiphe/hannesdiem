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
  viewport?: { start: number; end: number }
  surface?: 'passage'
  settle?(): void
  select(edge: TrimEdge): void
  seek(edge: TrimEdge): void
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

/** Shared boundary interaction for the recording and its zoomed passage. */
export function TrimTimeline(handle: Handle<TrimProps>) {
  let rail: HTMLDivElement | undefined
  let width = 0
  let step = 0
  let lastTap: { kind: TrimEdge; time: number; x: number; y: number } | undefined
  let drag:
    | {
        id: number
        kind: 'start' | 'end'
        x: number
        y: number
        began: number
        moved: boolean
        value: number
        width: number
        from: number
        to: number
      }
    | undefined
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
      y: event.clientY,
      began: event.timeStamp,
      moved: false,
      value: handle.props[kind],
      width: rail.getBoundingClientRect().width,
      from: handle.props.viewport?.start ?? 0,
      to: handle.props.viewport?.end ?? handle.props.duration,
    }
    handle.update()
  }
  function move(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.id) return
    event.preventDefault()
    // Clicking selects an edge without quantizing or moving it.
    if (Math.abs(event.clientX - drag.x) < 2) return
    drag.moved = true
    lastTap = undefined
    change(
      handle.props,
      drag.kind,
      clamp(
        drag.value + ((event.clientX - drag.x) / drag.width) * (drag.to - drag.from),
        drag.from,
        drag.to,
      ),
    )
  }
  function finish(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.id) return
    const finished = drag
    const target = event.currentTarget as HTMLButtonElement
    if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId)
    drag = undefined
    if (finished.moved) handle.props.settle?.()
    if (event.type !== 'pointerup' || finished.moved || event.pointerType === 'mouse') return
    if (
      event.timeStamp - finished.began > 400 ||
      Math.hypot(event.clientX - finished.x, event.clientY - finished.y) > 6
    ) {
      lastTap = undefined
      return
    }
    if (
      lastTap?.kind === finished.kind &&
      event.timeStamp - lastTap.time < 350 &&
      Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) < 24
    ) {
      lastTap = undefined
      handle.props.seek(finished.kind)
    } else
      lastTap = { kind: finished.kind, time: event.timeStamp, x: event.clientX, y: event.clientY }
  }
  return () => {
    const p = handle.props
    const from = p.viewport?.start ?? 0
    const span = (p.viewport?.end ?? p.duration) - from
    if (width > 0 && span > 0) {
      // Hysteresis keeps the same time marks through ordinary drag/reframe zooms.
      const spacing = (step / span) * width
      if (!step || spacing < 12 || spacing > 60) {
        const desired = (span / width) * 24
        const unit = desired >= 3600 ? 3600 : desired >= 60 ? 60 : 1
        const power = unit * 10 ** Math.floor(Math.log10(desired / unit))
        step = [1, 2, 3, 5, 10].find((n) => n * power >= desired)! * power
      }
    }
    const marks: { time: number; major: boolean; label: boolean }[] = []
    if (width > 0 && span > 0 && step > 0) {
      const first = Math.ceil(from / step)
      const last = Math.floor((from + span) / step)
      for (let i = first; i <= last; i++) {
        const time = Number((i * step).toPrecision(12))
        const x = ((time - from) / span) * width
        const major = width < 240 ? i === Math.round((from + span / 2) / step) : i % 5 === 0
        marks.push({ time, major, label: major && x >= 24 && x <= width - 24 })
      }
    }
    const helpId = p.surface ? 'ec-passage-trim-help' : 'ec-trim-help'
    return (
      <div
        class={p.surface ? 'ec-main-trim ec-passage-trim' : 'ec-main-trim'}
        aria-label={p.surface ? 'Trim passage' : 'Trim highlight'}
      >
        <div
          class="ec-trim-rail"
          mix={ref((node, signal) => {
            rail = node
            const measure = () => {
              width = node.clientWidth
              handle.update()
            }
            const observer = new ResizeObserver(measure)
            observer.observe(node)
            measure()
            signal.addEventListener('abort', () => observer.disconnect(), { once: true })
          })}
        >
          {p.surface === 'passage' && (
            <div
              class="ec-time-ruler"
              aria-hidden="true"
              data-step={step}
            >
              {marks.map(({ time, major, label }) => (
                <span
                  key={time}
                  class="ec-time-tick"
                  data-time={time}
                  data-major={major ? '' : undefined}
                  style={{ left: `${((time - from) / span) * 100}%` }}
                >
                  {label && (
                    <span>{step < 1 ? preciseClock(time).replace(/\.?0+$/, '') : clock(time)}</span>
                  )}
                </span>
              ))}
            </div>
          )}
          <span
            class="ec-trim-selection"
            style={{
              left: `${((p.start - from) / span) * 100}%`,
              width: `${((p.end - p.start) / span) * 100}%`,
            }}
          />
          {(['start', 'end'] as const).map((kind) => (
            <button
              type="button"
              key={kind}
              role="slider"
              class="ec-trim-edge"
              data-edge={kind}
              aria-label={`${p.surface ? 'Passage' : 'Highlight'} ${kind}`}
              aria-valuemin={kind === 'start' ? 0 : p.start}
              aria-valuemax={kind === 'start' ? p.end : p.duration}
              aria-valuenow={p[kind]}
              aria-valuetext={preciseClock(p[kind])}
              aria-describedby={helpId}
              data-selected={p.selected === kind ? '' : undefined}
              disabled={p.disabled}
              style={{
                left: `${((p[kind] - from) / span) * 100}%`,
                '--hit-width': `calc(24px + min(24px, ${((p.end - p.start) / span) * 50}%))`,
              }}
              mix={[
                on<HTMLButtonElement, 'focus'>('focus', () => {
                  p.select(kind)
                }),
                on<HTMLButtonElement, 'pointerdown'>('pointerdown', (event) => begin(event, kind)),
                on<HTMLButtonElement, 'pointermove'>('pointermove', move),
                on<HTMLButtonElement, 'pointerup'>('pointerup', finish),
                on<HTMLButtonElement, 'pointercancel'>('pointercancel', finish),
                on('dblclick', (event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  p.seek(kind)
                }),
                on<HTMLButtonElement, 'keydown'>('keydown', (event) => key(p, event, kind)),
              ]}
            >
              <span />
            </button>
          ))}
        </div>
        <span
          id={helpId}
          class="ec-sr-only"
        >
          Drag either edge. Select an edge, then use keyboard arrow keys for seconds.
          {p.frameRate ? ' Shift and arrow keys adjust one frame.' : ''}
        </span>
      </div>
    )
  }
}
