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

function TypeLine(handle: Handle<{ text: string; face?: 'cinzel' | 'spaced' }>) {
  return () => (
    <span
      class="block-line"
      data-type-line
      data-lettering={handle.props.face ?? 'copy'}
    >
      {handle.props.text}
    </span>
  )
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
        <style>
          {`
            html, body { background: #000; margin: 0; }
            body:not([data-scene-ready]) { background: #000 !important; }
            body:not([data-scene-ready]) .temple-page,
            body:not([data-scene-ready]) .review-controls { visibility: hidden; }
          `}
        </style>
        <noscript>
          <style>
            {`
              body:not([data-scene-ready]) { background: light-dark(#f7ecdf, #000) !important; }
              body:not([data-scene-ready]) .temple-page { visibility: visible; }
              .first-pair { margin-top: 0 !important; }
            `}
          </style>
        </noscript>
        <link
          rel="icon"
          href="/temple-mark.svg"
          type="image/svg+xml"
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
      <body data-ui="hidden">
        <main class="temple-page">
          <Opening {...openingProps} />
          <article
            class="first-pair"
            aria-label="First verse and refrain"
          >
            <div class="verse-copy">
              <p>
                <TypeLine
                  text="H U M A N I T Y !"
                  face="spaced"
                />{' '}
                <TypeLine
                  text="I’m in love"
                  face="cinzel"
                />{' '}
                <TypeLine text="with the brave spirits I meet, witness, and sense." />
              </p>
              <p>
                <TypeLine
                  text="I’m so deeply touched"
                  face="cinzel"
                />{' '}
                <TypeLine text="by those willing to feel, to unwind, to rest, to risk." />
              </p>
              <p>
                <TypeLine text="By those willing to build villages rooted in" />{' '}
                <TypeLine
                  text="trust and connection"
                  face="cinzel"
                />
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
                <TypeLine
                  text="I’m loved,"
                  face="cinzel"
                />{' '}
                <TypeLine text="and in awe of what you kindred souls have built onto this sphere." />
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
              Glimmer vorn{' '}
              <input
                type="range"
                data-escape-strength
                min="0"
                max="100"
                defaultValue="85"
              />
              <output data-escape-label>85 %</output>
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
      </body>
    </html>
  )
}
