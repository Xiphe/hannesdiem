import { on, ref, type Handle, type RemixNode } from 'remix/component'
import { clock } from './model.ts'
import { animateTooltip, captureTooltip, type TooltipStage } from './motion.ts'

interface TimelineProps {
  position: number
  duration: number
  disabled: boolean
  canHighlight: boolean
  editing: boolean
  editorRange: { start: number; end: number }
  editorActions?: RemixNode
  editor?: RemixNode
  editorStep?: 'range' | 'name'
  seek(time: number): void
  highlight(time: number): void
  children?: RemixNode
}
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value))

/** The 10px thumb travels between inset endpoints, rather than across the full track. */
export function playedProgress(position: number, start: number, end: number) {
  const fraction = end > start ? clamp((position - start) / (end - start), 0, 1) : 0
  return `calc(${fraction * 100}% + ${5 - fraction * 10}px)`
}

/** Track the whole range hit area; entering the popover keeps the chosen time. */
export function PlaybackTimeline(handle: Handle<TimelineProps>) {
  let hoverTime: number | undefined
  let open = false
  let width = 0
  let tooltipWidth = 184
  let input: HTMLInputElement | undefined
  let tooltip: HTMLDivElement | undefined
  let currentPanel: HTMLDivElement | undefined
  let outgoingPanel: HTMLDivElement | undefined
  let previousStage: TooltipStage | undefined
  let previousContent: RemixNode
  let outgoingContent: RemixNode
  let motion:
    | {
        from: TooltipStage
        to: TooltipStage
        before: ReturnType<typeof captureTooltip>
        controller: AbortController
        started: boolean
      }
    | undefined
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
  handle.signal.addEventListener('abort', () => motion?.controller.abort(), { once: true })
  return () => {
    const p = handle.props
    const time = hoverTime ?? p.position
    const stage: TooltipStage = p.editing ? (p.editorStep ?? 'range') : 'clock'
    const content = p.editing ? (
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
    )
    if (previousStage && previousStage !== stage) {
      const before = captureTooltip(tooltip, currentPanel)
      motion?.controller.abort()
      outgoingPanel = undefined
      outgoingContent = undefined
      motion = undefined
      if (stage !== 'clock' && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        outgoingContent = before ? previousContent : undefined
        motion = {
          from: previousStage,
          to: stage,
          before,
          controller: new AbortController(),
          started: false,
        }
      }
    }
    previousStage = stage
    previousContent = content
    if (motion && !motion.started) {
      const pending = motion
      handle.queueTask(async () => {
        if (motion !== pending || pending.started || !tooltip || !currentPanel) return
        pending.started = true
        await animateTooltip(
          tooltip,
          currentPanel,
          outgoingPanel,
          pending.from,
          pending.to,
          pending.before,
          pending.controller.signal,
        )
        if (motion !== pending || handle.signal.aborted) return
        motion = undefined
        outgoingContent = undefined
        handle.update()
      })
    }
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
            if (!event.currentTarget.contains(event.relatedTarget as Node | null))
              leave(event.currentTarget)
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
          style={{ '--progress': playedProgress(p.position, 0, p.duration) }}
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
            tooltip = node
            const measure = () => {
              if (handle.props.editing) return
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
          data-motion={motion ? `${motion.from}-${motion.to}` : undefined}
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
                left: `calc(var(--editor-inset) + var(--control-inset) + ${rangeLeft - 6}px)`,
                width: `${rangeWidth + 10}px`,
              }}
            >
              <path d={`M0 0 L5 5 H${rangeWidth + 5} L${rangeWidth + 10} 0`} />
            </svg>
          )}
          {motion?.from === 'clock' && motion.before && (
            <span
              class="ec-morph-pointer"
              aria-hidden="true"
              style={{ left: `${motion.before.arrowX}px` }}
            />
          )}
          <div class="ec-tooltip-panels">
            {outgoingContent && (
              <div
                key={`outgoing-${motion?.from}`}
                class="ec-panel-outgoing"
                data-stage={motion?.from}
                aria-hidden="true"
                inert
                style={{ width: motion?.before ? `${motion.before.panelWidth}px` : '100%' }}
                mix={ref((node) => {
                  outgoingPanel = node
                })}
              >
                {outgoingContent}
              </div>
            )}
            <div
              key={stage}
              class="ec-panel-current"
              data-stage={stage}
              mix={ref((node) => {
                currentPanel = node
              })}
            >
              {content}
            </div>
          </div>
          {p.editing && p.editorActions}
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
