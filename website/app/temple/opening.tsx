import { bridgeText } from './bridge-text.tsx'
import { ref, type Handle } from 'remix/component'
import { ArrowDownIcon, ArrowLeftIcon } from '../heroicons.tsx'
import { mountArtwork } from './artwork.ts'
import { FirstPair, Phrase, Refrain } from './first-pair.tsx'
import { VerseDrop } from './verse-drop.tsx'
import type { OpeningProps } from './types.ts'
import { Fact, FactAction } from './facts/view.tsx'
import { Location } from './location/view.tsx'
import { mountLocation } from './location/enhance.ts'
import { TopNavigation } from './top-navigation.tsx'
import { mountNavigationPosition } from './top-navigation-position.ts'
import { mountNavigationScroll } from './top-navigation-scroll.ts'
import { mountNavigationProgress } from './top-navigation-progress.ts'
import { mountRecordingTitles } from './video-title.ts'
import { mountRecordingScroll } from './video-scroll.ts'
import { LocalDate } from '../date.tsx'
import { mountInsideArtwork } from './inside-artwork.ts'
import { mountSectionArrival } from './section-navigation.ts'
import { mountLegacyEntry } from './legacy-entry.ts'
import { mountEntryButtons } from './entry-button/enhance.ts'

export function Opening(handle: Handle<OpeningProps>) {
  let root: HTMLElement | undefined
  handle.queueTask(async (signal) => {
    if (!root || signal.aborted) return
    const host = root
    mountRecordingTitles(host, signal)
    mountRecordingScroll(host, signal)
    mountNavigationPosition(host, signal)
    mountEntryButtons(host, signal)
    mountNavigationProgress(host, signal)
    mountNavigationScroll(host, signal)
    mountSectionArrival(host, handle.props, signal)
    if (handle.props.view === 'poem') mountLegacyEntry(host, signal)
    const controller = new AbortController()
    signal.addEventListener('abort', () => controller.abort(), { once: true })
    host.dataset.state = 'loading'
    const reveal = (state: 'ready' | 'fallback') => {
      if (signal.aborted) return
      host.dataset.state = state
      document.documentElement.removeAttribute('data-temple-loading')
      clearTimeout(timeout)
      // The poem's font fitting changes the layout after the native hash jump.
      // Restore a recording's arrival once that preceding layout has settled.
      try {
        const target = document.getElementById(decodeURIComponent(location.hash.slice(1)))
        if (target?.matches('.temple-video, .temple-post-preview') && host.contains(target))
          target.scrollIntoView({ block: 'start', inline: 'center', behavior: 'instant' })
      } catch {
        // Malformed fragments must not prevent the artwork from becoming ready.
      }
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
      if (handle.props.location) mountLocation(host, handle.props.location, controller.signal)
      if (handle.props.view === 'inside')
        await mountInsideArtwork(host, handle.props, controller.signal, () => reveal('ready'))
      else await mountArtwork(host, handle.props, controller.signal, () => reveal('ready'))
    } catch (error) {
      controller.abort()
      reveal('fallback')
      if (!signal.aborted) console.error('Temple opening enhancement failed', error)
    }
  })
  return () => {
    const { title, dates, image, pair, pairs, bridge, bridgeBody, location, finalVerse, facts } =
      handle.props
    if (handle.props.view === 'inside')
      return (
        <div
          class="temple-artwork"
          data-temple-view="inside"
          mix={ref((node) => {
            root = node
          })}
        >
          <TopNavigation {...handle.props} />
          <div class="temple-practical-content">
            <div class="temple-intention-return fact-action">
              <a
                href="/temple-of-sound"
                data-rmx-document
                class="temple-enter-button"
              >
                <ArrowLeftIcon />
                Back to the Manifesto
              </a>
              <small class="temple-entry-caption">
                Read the intention and the charge of this space
              </small>
            </div>
            {location && (
              <div class="temple-practical-section">
                <Location {...location} />
              </div>
            )}
            {facts?.map((fact) => (
              <div class="temple-practical-section">
                <Fact
                  {...fact}
                  action={fact.after != null ? undefined : fact.action}
                />
                {fact.after}
                {fact.after != null && fact.action && (
                  <FactAction
                    id={fact.id}
                    action={fact.action}
                    afterContent
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )
    return (
      <div
        class="temple-artwork"
        data-temple-view={handle.props.view}
        mix={ref((node) => {
          root = node
        })}
      >
        <section
          class="temple-opening"
          id={`temple-top-${handle.props.id}`}
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
                <LocalDate
                  value={dates.start}
                  hideDay
                  hideYear
                />
                {' & '}
                <LocalDate
                  value={dates.end}
                  hideDay
                />
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
        {handle.props.navigation && <TopNavigation {...handle.props} />}
        <canvas
          class="temple-escapes"
          aria-hidden="true"
        />

        {(pairs?.length || pair || location) && (
          <div class="poem-pairs">
            {handle.props.view === 'poem' && (
              <div class="temple-entry-welcome">
                {handle.props.welcome?.greeting && (
                  <p class="temple-entry-greeting">{handle.props.welcome.greeting}</p>
                )}
                {handle.props.welcome?.paragraphs.map((paragraph) => (
                  <p>{paragraph}</p>
                ))}
                <div class="fact-action">
                  <a
                    href="/temple-of-sound/visit"
                    data-rmx-document
                    aria-label="Enter the Temple of Sound"
                    class="temple-enter-button"
                  >
                    <span>Enter</span>
                    <span
                      class="temple-enter-label-extra"
                      aria-hidden="true"
                    >
                      {' the Temple of Sound'}
                    </span>
                  </a>
                </div>
                {handle.props.welcome && (
                  <small class="temple-entry-more temple-entry-caption">
                    <ArrowDownIcon />
                    {handle.props.welcome.scrollLabel}
                    <ArrowDownIcon />
                  </small>
                )}
              </div>
            )}
            {handle.props.view !== 'poem' && location && <Location {...location} />}
            {(pairs ?? (pair ? [pair] : [])).map((pair, index) => (
              <>
                <FirstPair
                  id={`${handle.props.id}-pair-${index + 1}`}
                  pair={pair}
                  index={index}
                />
                {handle.props.view !== 'poem' &&
                  facts
                    ?.filter((fact) => fact.afterPair === index + 1)
                    .map((fact) => (
                      <>
                        <Fact
                          {...fact}
                          action={fact.after != null ? undefined : fact.action}
                        />
                        {fact.after}
                        {fact.after != null && fact.action && (
                          <FactAction
                            id={fact.id}
                            action={fact.action}
                            afterContent
                          />
                        )}
                      </>
                    ))}
              </>
            ))}
            {bridge && (
              <section
                id={`${handle.props.id}-bridge`}
                class="verse-copy bridge-copy"
              >
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
              <>
                <div class="final-pair">
                  <section
                    id={`${handle.props.id}-final-verse`}
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
                </div>
                {finalVerse.refrain && (
                  <div class="final-refrain">
                    <Refrain
                      id={`${handle.props.id}-final-chorus`}
                      phrases={finalVerse.refrain}
                      entry={handle.props.view === 'poem'}
                    />
                  </div>
                )}
              </>
            )}
            {handle.props.view === 'poem' && !finalVerse?.refrain && (
              <div class="temple-entry-closing fact-action">
                <a
                  class="temple-enter-button"
                  href="/temple-of-sound/visit"
                  data-rmx-document
                >
                  Enter
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }
}
