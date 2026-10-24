// THROWAWAY: first words in the actual opener context. Not a selected scene.
import { existsSync, readFileSync } from 'node:fs'
import { Opening } from '../opening.tsx'

export function firstPair() {
  const source = existsSync('content/temple-of-sound/draft.tsx')
    ? 'content/temple-of-sound/draft.tsx'
    : 'content/drafts/temple-of-sound.tsx'
  const opening = readFileSync(source, 'utf8').match(
    /<PoemOpening\b[^>]*>([\s\S]*?)<\/PoemOpening>/,
  )![1]
  return [...opening.matchAll(/<p>([\s\S]*?)<\/p>/g)].flatMap((paragraph) =>
    paragraph[1].split(/<br\s*\/>/).map((line) => line.replace(/\s+/g, ' ').trim()),
  )
}

import { openingProps } from './context-props.ts'

export function Review() {
  const firstSentence = firstPair()[0]
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
        <title>Temple of Sound / Übergang zur Strophe</title>
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
      <body>
        <main class="temple-page">
          <Opening {...openingProps} />
          <article
            class="entry-text"
            aria-label="Erster Satz der ersten Strophe"
          >
            <p>{firstSentence}</p>
          </article>
        </main>
        <nav
          class="review-controls"
          aria-label="Exploration: Übergang zum ersten Satz"
          lang="de"
        >
          <div class="review-heading">
            <strong>Übergang · erster Satz</strong>
            <button
              type="button"
              data-replay
            >
              Zum Anfang
            </button>
            <button
              type="button"
              data-hide
              aria-label="Bedienung ausblenden"
              title="H"
            >
              ×
            </button>
          </div>
          <div
            class="motion-options"
            role="group"
            aria-label="Bewegungsprobe"
          >
            <button
              type="button"
              data-motion="rise"
              aria-pressed="true"
            >
              Von unten aufsteigen
            </button>
            <button
              type="button"
              data-motion="close"
              aria-pressed="false"
            >
              Aus nächster Nähe
            </button>
          </div>
          <div class="adjustments">
            <label>
              Größe{' '}
              <input
                data-size
                type="range"
                min="48"
                max="160"
                step="4"
                defaultValue="96"
              />
              <output data-size-label>96</output>
            </label>
            <label>
              Einsatz{' '}
              <input
                data-entry
                type="range"
                min="0.18"
                max="0.6"
                step="0.01"
                defaultValue="0.30"
              />
              <output data-entry-label>0,30 × Höhe</output>
            </label>
            <label>
              Scrollposition{' '}
              <input
                data-position
                type="range"
                min="0"
                max="1"
                step="0.002"
                defaultValue="0"
              />
            </label>
          </div>
          <p class="review-note">
            Arbeitsfläche: erster Satz nach dem Opener. H versteckt die Bedienung.
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
