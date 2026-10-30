import { ref, type Handle } from 'remix/component'
import { ArrowDownIcon } from '../heroicons.tsx'
import { mountArtwork } from './artwork.ts'
import { FirstPair } from './first-pair.tsx'
import type { OpeningProps } from './types.ts'

export function Opening(handle: Handle<OpeningProps>) {
  let root: HTMLElement | undefined
  handle.queueTask(async (signal) => {
    if (!root || signal.aborted) return
    const host = root
    const controller = new AbortController()
    signal.addEventListener('abort', () => controller.abort(), { once: true })
    host.dataset.state = 'loading'
    const reveal = (state: 'ready' | 'fallback') => {
      if (signal.aborted) return
      host.dataset.state = state
      document.documentElement.removeAttribute('data-temple-loading')
      clearTimeout(timeout)
    }
    const timeout = setTimeout(() => {
      controller.abort()
      reveal('fallback')
    }, 8000)
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timeout)
        // Never leave the document gate attached after this island is removed.
        document.documentElement.removeAttribute('data-temple-loading')
      },
      { once: true },
    )
    try {
      await mountArtwork(host, handle.props, controller.signal, () => reveal('ready'))
    } catch (error) {
      controller.abort()
      reveal('fallback')
      if (!signal.aborted) console.error('Temple opening enhancement failed', error)
    }
  })
  return () => {
    const { title, dates, image, pair } = handle.props
    const format = (date: string) =>
      new Intl.DateTimeFormat('en', { month: 'long', day: 'numeric', timeZone: 'UTC' }).format(
        new Date(date + 'T12:00:00Z'),
      )
    return (
      <div
        class="temple-artwork"
        mix={ref((node) => {
          root = node
        })}
      >
        <section
          class="temple-opening"
          aria-label={title}
        >
          <div class="temple-title-track">
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
          </div>
        </section>
        <canvas
          class="temple-escapes"
          aria-hidden="true"
        />
        {pair && <FirstPair pair={pair} />}
      </div>
    )
  }
}
