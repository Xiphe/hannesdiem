// THROWAWAY: reading voices and their accents, in the accepted opener's context.
import { existsSync, readFileSync } from 'node:fs'
import type { Handle } from 'remix/component'
import { Opening } from '../opening.tsx'
import { openingProps } from './context-props.ts'

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
const studies = {
  bricolage: {
    label: 'A · Bricolage',
    description: 'Eine Familie: Bricolage 400 im Lesesatz, 600 als Akzent, 450 im Refrain.',
  },
  newsreader: {
    label: 'B · Newsreader',
    description: 'Bricolage als Akzent, Newsreader 400 im Lesesatz, kursiv im Refrain.',
  },
  source: {
    label: 'C · Source Sans',
    description: 'Source Sans 3 im Lesesatz, Unbounded 400 als Akzent und 350 im Refrain.',
  },
} as const

function ReadingStudy(handle: Handle<{ units: string[]; study: string; hidden: boolean }>) {
  return () => (
    <article
      class="reading-study"
      data-study={handle.props.study}
      hidden={handle.props.hidden}
      aria-label="Erstes Strophen-Refrain-Paar"
    >
      <p
        class="reading-opening"
        data-unit="0"
      >
        {handle.props.units[0]}
      </p>
      <div class="reading-body">
        <p data-unit="1">{handle.props.units[1]}</p>
        <p data-unit="2">{handle.props.units[2]}</p>
      </div>
      <div class="reading-refrain">
        {handle.props.units.slice(3).map((unit, index) => (
          <p data-unit={index + 3}>{unit}</p>
        ))}
      </div>
    </article>
  )
}
export function Review(handle: Handle<{ study: string }>) {
  const study = Object.hasOwn(studies, handle.props.study)
    ? (handle.props.study as keyof typeof studies)
    : 'bricolage'
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
        <title>Temple of Sound / Lesestimmen</title>
        <noscript>
          <style>
            {'.reading-study{visibility:visible!important;margin-top:0;--reading-veil:1}'}
          </style>
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
      <body data-reading={study}>
        <main class="temple-page">
          <Opening {...openingProps} />
          {Object.keys(studies).map((key) => (
            <ReadingStudy
              units={units}
              study={key}
              hidden={study !== key}
            />
          ))}
        </main>
        <nav
          class="review-controls"
          aria-label="Exploration: Lesestimme und Akzente"
          lang="de"
        >
          <div class="review-heading">
            <button
              type="button"
              data-previous
              aria-label="Vorherige Schriftprobe"
            >
              ←
            </button>
            {Object.entries(studies).map(([key, item]) => (
              <a
                href={`?study=${key}`}
                data-study-link={key}
                aria-current={key === study ? 'page' : undefined}
              >
                {item.label}
              </a>
            ))}
            <button
              type="button"
              data-next
              aria-label="Nächste Schriftprobe"
            >
              →
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
          <p data-description>{studies[study].description}</p>
          <div class="reading-adjustments">
            <label>
              Lesesatz{' '}
              <input
                type="range"
                data-size
                min="85"
                max="125"
                step="5"
                defaultValue="100"
              />
              <output data-size-label>100 %</output>
            </label>
            <label>
              Gewicht{' '}
              <input
                type="range"
                data-weight
                min="300"
                max="550"
                step="25"
                defaultValue="400"
              />
              <output data-weight-label>400</output>
            </label>
            <button
              type="button"
              data-reset
            >
              Zurücksetzen
            </button>
            <button
              type="button"
              data-replay
            >
              Zum Opener
            </button>
          </div>
          <p class="review-note">
            Schriftbild ohne Strophenanimation. ← / → wechseln an derselben Passage. H versteckt die
            Bedienung.
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
