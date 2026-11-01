import { bridgeText } from './bridge-text.tsx'
import { ref, type Handle } from 'remix/component'
import { ArrowDownIcon } from '../heroicons.tsx'
import { mountArtwork } from './artwork.ts'
import { FirstPair, Phrase, Refrain } from './first-pair.tsx'
import { VerseDrop } from './verse-drop.tsx'
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
    const { title, dates, image, pair, pairs, bridge, bridgeBody, finalVerse } = handle.props
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

        {(pairs?.length || pair) && (
          <div class="poem-pairs">
            {(pairs ?? [pair!]).map((pair, index) => (
              <FirstPair
                pair={pair}
                index={index}
              />
            ))}
            {bridge && (
              <section class="verse-copy bridge-copy">
                {bridge.map((lines, index) => (
                  <p>
                    <Phrase
                      lines={lines}
                      firstStatic={index === 0}
                    />
                  </p>
                ))}
              </section>
            )}
            {bridgeBody && (
              <section class="verse-copy bridge-body">
                {bridgeBody.map((paragraph) => (
                  <p
                    class="bridge-body-copy"
                    data-linger={typeof paragraph === 'string' ? undefined : paragraph.linger}
                    data-wide-breaks={
                      typeof paragraph === 'string'
                        ? undefined
                        : JSON.stringify(paragraph.wideBreaksAfter)
                    }
                  >
                    {bridgeText(typeof paragraph === 'string' ? paragraph : paragraph.text)}
                  </p>
                ))}
              </section>
            )}
            {finalVerse && (
              <div class="final-pair">
                <section
                  class="verse-copy final-verse"
                  data-has-refrain={finalVerse.refrain ? '' : undefined}
                >
                  <p class="final-verse-intro">
                    <Phrase
                      lines={finalVerse.intro}
                      firstStatic
                    />
                  </p>
                  {finalVerse.phrases.map((lines) => (
                    <p class="final-verse-phrase">
                      <Phrase lines={lines} />
                    </p>
                  ))}
                  <div class="verse-finale">
                    <div class="verse-finale-stage">
                      {finalVerse.rise && (
                        <div class="final-verse-rise verse-rise">
                          {finalVerse.rise.map((line, index) => (
                            <p
                              class="rise-call"
                              style={{
                                '--rise-index': index,
                                '--rise-delay': `${100 * (1 - 0.128 / (0.65 * 1.6 ** index))}%`,
                              }}
                            >
                              <span class="rise-call-ink">{line}</span>
                            </p>
                          ))}
                        </div>
                      )}
                      {finalVerse.drop && <VerseDrop text={finalVerse.drop} />}
                    </div>
                  </div>
                </section>
                {finalVerse.refrain && (
                  <div class="final-refrain">
                    <Refrain phrases={finalVerse.refrain} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }
}
