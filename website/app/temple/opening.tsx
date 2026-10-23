import { ref, type Handle } from 'remix/component'
import { ArrowDownIcon } from '../heroicons.tsx'
import { mountOpening } from './scene.ts'
import type { OpeningProps } from './types.ts'

export function Opening(handle: Handle<OpeningProps>) {
  let root: HTMLElement | undefined
  handle.queueTask(async (signal) => {
    if (!root) return
    try {
      await mountOpening(root, handle.props, signal)
    } catch (error) {
      if (!signal.aborted) console.error('Temple opening enhancement failed', error)
    }
  })
  return () => {
    const { title, dates, image } = handle.props
    const format = (date: string) =>
      new Intl.DateTimeFormat('en', { month: 'long', day: 'numeric', timeZone: 'UTC' }).format(
        new Date(date + 'T12:00:00Z'),
      )
    return (
      <section
        class="temple-opening"
        aria-label={title}
        mix={ref((node) => {
          root = node
        })}
      >
        <div class="temple-stage">
          <img
            class="temple-fallback-image"
            src={image.src}
            width={image.width}
            height={image.height}
            alt=""
            fetchPriority="high"
          />
          <h1 class="temple-fallback-title">{title}</h1>
          <canvas aria-hidden="true" />
          <div class="temple-date">
            <time dateTime={dates.start}>{format(dates.start)}</time>
            {' – '}
            <time dateTime={dates.end}>
              {format(dates.end)}, {dates.end.slice(0, 4)}
            </time>
          </div>
          <div
            class="temple-scroll-hint"
            aria-hidden="true"
          >
            <ArrowDownIcon />
          </div>
        </div>
      </section>
    )
  }
}
