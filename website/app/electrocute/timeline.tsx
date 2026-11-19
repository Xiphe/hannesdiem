import { on, type Handle, type RemixNode } from 'remix/component'
import { clock } from './model.ts'

interface TimelineProps {
  position: number
  duration: number
  disabled: boolean
  seek(time: number): void
  children?: RemixNode
}

/** Playback time belongs to the seek interaction, outside the clipping controls. */
export function PlaybackTimeline(handle: Handle<TimelineProps>) {
  let hoverTime: number | undefined
  return () => {
    const p = handle.props
    const time = hoverTime ?? p.position
    return (
      <div
        class="ec-seek-wrap"
        mix={[
          on<HTMLDivElement, 'pointermove'>('pointermove', (event) => {
            if (event.pointerType !== 'mouse' || (event.target as Element).closest('.ec-main-trim'))
              return
            const input = event.currentTarget.querySelector('input')!
            const box = input.getBoundingClientRect()
            hoverTime = Math.max(
              0,
              Math.min(
                p.duration,
                ((event.clientX - box.left - 5) / Math.max(1, box.width - 10)) * p.duration,
              ),
            )
            handle.update()
          }),
          on('pointerleave', () => {
            hoverTime = undefined
            handle.update()
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
          aria-describedby="ec-playback-time"
          disabled={p.disabled}
          style={{ '--progress': `${p.duration ? (p.position / p.duration) * 100 : 0}%` }}
          mix={[
            on('input', (event) => p.seek(Number((event.currentTarget as HTMLInputElement).value))),
            on('keydown', () => {
              hoverTime = undefined
              handle.update()
            }),
          ]}
        />
        {p.children}
        <span
          id="ec-playback-time"
          role="tooltip"
          class="ec-time-tooltip ec-clock"
          style={{
            '--time-position': `clamp(60px, ${p.duration ? (time / p.duration) * 100 : 0}%, calc(100% - 60px))`,
          }}
        >
          {clock(time)} <span>/ {clock(p.duration)}</span>
        </span>
      </div>
    )
  }
}
