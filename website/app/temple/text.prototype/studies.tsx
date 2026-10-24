// THROWAWAY: three trace behaviours for the original first verse/refrain pair.
// Compare presence after reading + scroll distance. No particle coupling/publication.
import { existsSync, readFileSync } from 'node:fs'
import type { Handle } from 'remix/component'

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

const variants = {
  A: { name: 'Aufrücken', description: 'Ältere Sätze rücken nach oben und verdichten sich.' },
  B: { name: 'Überdruck', description: 'Ältere Sätze bleiben als überlagerte Konturen zurück.' },
  C: {
    name: 'Randspuren',
    description: 'Ältere Sätze weichen seitlich aus und bleiben am Bildrand.',
  },
} as const

export function Review(handle: Handle<{ variant: string }>) {
  const { variant } = handle.props
  const key = Object.hasOwn(variants, variant) ? (variant as keyof typeof variants) : 'A'
  const current = variants[key]
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
        <title>Temple of Sound / Textspuren</title>
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
      <body data-variant={key}>
        <main class="sequence">
          <div class="stage">
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
                  {unit}
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
          <div class="variant-row">
            <button
              type="button"
              data-previous
              aria-label="Vorherige Variante"
            >
              ←
            </button>
            <div class="variant-links">
              {Object.entries(variants).map(([id, item]) => (
                <a
                  href={`?variant=${id}`}
                  data-variant-link={id}
                  aria-current={id === key ? 'page' : undefined}
                >
                  {id} · {item.name}
                </a>
              ))}
            </div>
            <button
              type="button"
              data-next
              aria-label="Nächste Variante"
            >
              →
            </button>
            <button
              type="button"
              data-hide
              aria-label="Bedienung ausblenden"
              title="Bedienung: H"
            >
              ×
            </button>
          </div>
          <p data-description>{current.description}</p>
          <div class="range-row">
            <label>
              Position{' '}
              <input
                data-position
                type="range"
                min="0"
                max={units.length - 1}
                step="1"
                defaultValue="0"
              />
            </label>
            <output data-count>1 / {units.length}</output>
            <label>
              Scrollweg{' '}
              <input
                data-distance
                type="range"
                min="0.6"
                max="3"
                step="0.1"
                defaultValue="1.2"
              />
            </label>
            <output data-distance-label>1,2 × Höhe</output>
          </div>
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
