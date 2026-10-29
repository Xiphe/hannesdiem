// THROWAWAY: artist-directed typography and bounded refrain composition.
import type { Handle } from 'remix/component'
import { Opening } from '../opening.tsx'
import { openingProps } from './context-props.ts'
import { defaults } from './defaults.ts'

// New wording/paragraphs supplied and confirmed by the artist, 2026-10-28.
export const refrain = [
  { text: 'I’m playful and inspired.', display: 'I’m pLAYFuL aNd INSpIReD.', face: 'cinzel' },
  { text: 'I’m breathing in and out.', display: 'i’M BREATHiNG iN AND OUT.', face: 'bricolage' },
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
                  <Emphasis text="Humanity! I’m in love." />
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
                , and in awe of what you kindred souls have built onto this sphere.
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
            {defaults.mistHues.map((hue, i) => (
              <label>
                Nebel {i + 1}{' '}
                <input
                  class="warm-hue"
                  type="range"
                  data-mist-color={i}
                  min="0"
                  max="60"
                  defaultValue={hue}
                />
                <output
                  data-mist-swatch={i}
                  style={`color:rgb(255,${Math.round((255 * hue) / 60)},8)`}
                >
                  ●
                </output>
              </label>
            ))}
            <label>
              Nebel-Stärke{' '}
              <input
                type="range"
                data-mist-intensity
                min="0"
                max="100"
                defaultValue={defaults.mistIntensity * 100}
              />
              <output data-mist-intensity-label>{defaults.mistIntensity * 100} %</output>
            </label>
            <label>
              Lichtpunkte{' '}
              <input
                type="range"
                data-mist-highlights
                min="0"
                max="100"
                defaultValue={defaults.mistHighlights * 100}
              />
              <output data-mist-highlights-label>{defaults.mistHighlights * 100} %</output>
            </label>
            <label>
              Text-Varianz{' '}
              <input
                type="range"
                data-copy-variance
                min="0"
                max="100"
                defaultValue={defaults.copyVariance * 100}
              />
              <output data-copy-variance-label>{defaults.copyVariance * 100} %</output>
            </label>

            <label>
              Text-Tempo{' '}
              <input
                type="range"
                data-copy-speed
                min="0"
                max="100"
                defaultValue={defaults.copySpeed * 25}
              />
              <output data-copy-speed-label>{defaults.copySpeed.toFixed(1)}×</output>
            </label>
            <label>
              Lesetext{' '}
              <input
                type="color"
                data-copy-color
                defaultValue={defaults.copyColor}
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
