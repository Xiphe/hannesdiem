// THROWAWAY: the first verse/refrain follows the liked close entrance in context.
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
  const units = firstPair()
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
            aria-label="Erstes Strophen-Refrain-Paar"
          >
            {units.map((unit, index) => (
              <p
                class="entry-unit"
                data-unit={index}
              >
                {unit}
              </p>
            ))}
          </article>
        </main>
        <nav
          class="review-controls"
          aria-label="Exploration: erstes Strophen-Refrain-Paar"
          lang="de"
        >
          <div class="review-heading">
            <strong>Erste Strophe + Refrain</strong>
            <output data-count>Opener</output>
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
              aria-pressed="false"
            >
              Von unten aufsteigen
            </button>
            <button
              type="button"
              data-motion="close"
              aria-pressed="true"
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
                defaultValue="160"
              />
              <output data-size-label>160</output>
            </label>
            <label>
              Einsatz{' '}
              <input
                data-entry
                type="range"
                min="0.18"
                max="0.6"
                step="0.01"
                defaultValue="0.18"
              />
              <output data-entry-label>0,18 × Höhe</output>
            </label>
            <label>
              Abstand{' '}
              <input
                data-spacing
                type="range"
                min="0.16"
                max="0.42"
                step="0.01"
                defaultValue="0.22"
              />
              <output data-spacing-label>0,22 × Höhe</output>
            </label>
            <label>
              Scrollposition{' '}
              <input
                data-position
                type="range"
                min="0"
                max="2"
                step="0.002"
                defaultValue="0"
              />
            </label>
          </div>
          <p class="review-note">Sinneinheiten im Originalwortlaut. H versteckt die Bedienung.</p>
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
