// THROWAWAY: one fixed sense unit per scroll step; free field vs glyph formation.
// No publication entry. Wording/order comes exclusively from the artist's draft.
import { existsSync, readFileSync } from 'node:fs'

export function firstPair() {
  const source = existsSync('content/temple-of-sound/draft.tsx')
    ? 'content/temple-of-sound/draft.tsx'
    : 'content/drafts/temple-of-sound.tsx'
  const draft = readFileSync(source, 'utf8')
  const opening = draft.match(/<PoemOpening\b[^>]*>([\s\S]*?)<\/PoemOpening>/)![1]
  return [...opening.matchAll(/<p>([\s\S]*?)<\/p>/g)].flatMap((paragraph) =>
    paragraph[1].split(/<br\s*\/>/).map((line) => line.replace(/\s+/g, ' ').trim()),
  )
}

export function Review() {
  const units = firstPair()
  return () => (
    <html lang="en">
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
        <title>Temple of Sound / Sinneinheit + Glimmer</title>
        <link
          rel="icon"
          href="data:,"
        />
        <link
          rel="stylesheet"
          href="/style.css"
        />
        <script
          type="module"
          src="/sequence.js"
        ></script>
      </head>
      <body>
        <main
          class="sequence"
          style={{ '--segments': units.length - 1 }}
        >
          <div class="stage">
            <canvas aria-hidden="true" />
            <article
              class="units"
              aria-label="Originaltext: erstes Strophen-Refrain-Paar"
            >
              {units.map((unit, index) => (
                <p
                  class="unit"
                  data-unit={index}
                  id={`verse-1-${index + 1}`}
                >
                  {unit
                    .split(/(\s+)/)
                    .map((part) => (/\s+/.test(part) ? part : <span class="word">{part}</span>))}
                </p>
              ))}
            </article>
          </div>
        </main>
        <nav
          class="review-controls"
          aria-label="Prototyp-Steuerung"
          lang="de"
        >
          <button
            type="button"
            data-previous
            aria-label="Vorherige Sinneinheit"
          >
            ←
          </button>
          <output
            data-count
            aria-label="Aktive Sinneinheit"
          >
            1 / {units.length}
          </output>
          <button
            type="button"
            data-next
            aria-label="Nächste Sinneinheit"
          >
            →
          </button>
          <button
            type="button"
            data-binding
            aria-pressed="true"
            title="Gleiche Textfolge: Glimmer frei oder an die Buchstaben gebunden"
          >
            Buchstabenform
          </button>
          <button
            type="button"
            data-hide
            aria-label="Bedienung ausblenden"
            title="Bedienung: H"
          >
            ×
          </button>
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
