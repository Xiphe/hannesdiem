// THROWAWAY: artist-directed typography and bounded refrain composition.
import type { Handle } from 'remix/component'
import { Opening } from '../opening.tsx'
import { openingProps } from './context-props.ts'

// New wording/paragraphs supplied and confirmed by the artist, 2026-10-28.
export const refrain = [
  { text: 'I’m playful and inspired.', display: 'I’m pLAYFuL aNd INSpIReD.', face: 'cinzel' },
  { text: 'I’m breathing in and out.', display: 'I’M BREATHING IN AND OUT.', face: 'bricolage' },
  { text: 'I’m faithful and held.', display: 'I’M FAITHFUL AND HELD.', face: 'unbounded' },
] as const

function Emphasis(handle: Handle<{ text: string; class?: string }>) {
  return () => <span class={`type-emphasis ${handle.props.class ?? ''}`}>{handle.props.text}</span>
}

export function Review(_handle: Handle) {
  return () => (
    <html
      lang="en"
      data-layout="temple"
    >
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
        />
        <meta
          name="robots"
          content="noindex,nofollow"
        />
        <title>Temple of Sound / First pair</title>
        <noscript>
          <style>{'.first-pair{margin-top:0!important}'}</style>
        </noscript>
        <link
          rel="icon"
          href="data:,"
        />
        <link
          rel="stylesheet"
          href="/opening.css"
        />
        <link
          rel="stylesheet"
          href="/style.css"
        />
        <script
          type="module"
          src="/context.js"
        ></script>
      </head>
      <body data-accent="cinzel">
        <main class="temple-page">
          <Opening {...openingProps} />
          <article
            class="first-pair"
            aria-label="First verse and refrain"
          >
            <div class="verse-copy">
              <p class="verse-opening">
                <strong>
                  <Emphasis text="I’m in love with humanity." />
                </strong>
              </p>
              <p>With the brave spirits I meet, witness, and sense.</p>
              <p>
                <strong>
                  <Emphasis
                    text="I’m so deeply touched"
                    class="accent"
                  />
                </strong>{' '}
                by those willing to feel, to unwind, to rest, to risk
              </p>
              <p>
                Those willing to build villages rooted in{' '}
                <strong>
                  <Emphasis
                    text="trust and connection."
                    class="accent"
                  />
                </strong>
              </p>
            </div>
            <section
              class="refrain-composition"
              aria-label="Refrain"
            >
              <div class="refrain-stage">
                {refrain.map(({ text, display, face }, index) => (
                  <p
                    class="refrain-phrase"
                    data-face={face}
                    data-phrase={index}
                  >
                    <span class="semantic-text">{text}</span>
                    <span
                      data-ink
                      aria-hidden="true"
                    >
                      {(face === 'bricolage'
                        ? [display.split(' ').slice(0, 2), display.split(' ').slice(2)]
                        : [display.split(' ')]
                      ).map((words) => (
                        <span data-line={face === 'bricolage' ? '' : undefined}>
                          {words.map((word, i) => (
                            <>
                              {i > 0 ? ' ' : ''}
                              <span data-word>{word}</span>
                            </>
                          ))}
                        </span>
                      ))}
                    </span>
                  </p>
                ))}
                <canvas
                  class="refrain-canvas"
                  aria-hidden="true"
                />
              </div>
            </section>
            <div class="verse-copy verse-coda">
              <p>
                <strong>
                  <Emphasis
                    text="I’m loved"
                    class="accent"
                  />
                </strong>
                , and in awe of what those kindred souls have built into this realm.
              </p>
            </div>
          </article>
        </main>
        <nav
          class="review-controls"
          aria-label="Typography workbench"
          lang="de"
        >
          <div class="review-heading">
            <span>Hervorhebungen</span>
            <button
              type="button"
              data-accent-choice="cinzel"
              aria-pressed="true"
            >
              Cinzel
            </button>
            <button
              type="button"
              data-accent-choice="unbounded"
              aria-pressed="false"
            >
              Unbounded
            </button>
            <button
              type="button"
              data-replay
            >
              Zum Opener
            </button>
            <button
              type="button"
              data-refrain
            >
              Zum Refrain
            </button>
            <button
              type="button"
              data-hide
              aria-label="Bedienung ausblenden"
            >
              ×
            </button>
          </div>
          <div class="review-adjustments">
            <label>
              Lesetext{' '}
              <input
                type="color"
                data-copy-color
                defaultValue="#d2d0c8"
              />
            </label>
          </div>
          <p>
            Normaler Textfluss · Refrain hält zum Wechseln in der Mitte · H versteckt die Bedienung.
          </p>
        </nav>
        <button
          class="restore-controls"
          type="button"
          data-restore
          aria-label="Bedienung einblenden"
        >
          ↔
        </button>
      </body>
    </html>
  )
}
