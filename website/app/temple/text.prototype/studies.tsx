// THROWAWAY: three material relationships in the existing sunlight space.
// Local comparison on /temple-of-sound?variant=all|A..C; no publication entry.
import { readFileSync } from 'node:fs'
import type { Handle } from 'remix/component'

export const studies = [
  {
    key: 'A',
    name: 'Licht in der Schrift',
    setting:
      'Aus dem Opener: Foto und Glimmer bilden das Material der Buchstaben. Test: trägt die Maske auch die längeren Sätze?',
  },
  {
    key: 'B',
    name: 'Schrift als Schatten',
    setting:
      'Aus deinem Sonnenraum und der gemeinsamen Tiefe. Neue Hypothese: Worte erscheinen als projizierter Schatten im Licht.',
  },
  {
    key: 'C',
    name: 'Ein gemeinsames Reaktionsfeld',
    setting:
      'Aus deinem Cursor-Nachhall und dem Verweben: Worte und Glimmer reagieren auf dieselbe unsichtbare Bewegungsspur. Maus / Touch bewegen.',
  },
] as const
export type Study = (typeof studies)[number]

function pair() {
  // Read the artist's source; line wrapping here never changes words or punctuation.
  const draft = readFileSync('content/drafts/temple-of-sound.tsx', 'utf8')
  const opening = draft.match(/<PoemOpening\b[^>]*>([\s\S]*?)<\/PoemOpening>/)![1]
  return [...opening.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((p) =>
    p[1].split(/<br\s*\/>/).map((line) => line.replace(/\s+/g, ' ').trim()),
  )
}

export function TextStudy(handle: Handle<{ study: Study }>) {
  const paragraphs = pair()
  return () => (
    <main class="study-surface">
      <canvas
        class="light-space"
        data-treatment={handle.props.study.key}
        aria-hidden="true"
      />
      <article class="poem">
        {paragraphs.map((lines) => (
          <p>
            {lines.map((line, index) => (
              <>
                {index > 0 && <br />}
                {line
                  .split(/(\s+)/)
                  .map((word) => (/\s+/.test(word) ? word : <span class="word">{word}</span>))}
              </>
            ))}
          </p>
        ))}
      </article>
    </main>
  )
}

export function Review(handle: Handle<{ variant: string; embedded: boolean }>) {
  return () => {
    const { variant, embedded } = handle.props
    const selected = studies.find((study) => study.key === variant)
    const at = selected ? studies.indexOf(selected) : -1
    return (
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
          <title>
            {selected ? `${selected.key} / ${selected.name}` : 'A–C / Schrift im Sonnenraum'}
          </title>
          <link
            rel="stylesheet"
            href="/style.css"
          />
          <script
            type="module"
            src="/light-space.js"
          ></script>
          <script
            src="/review.js"
            defer
          ></script>
        </head>
        <body class={embedded ? 'embedded' : selected ? 'single' : 'overview'}>
          {selected ? (
            <TextStudy study={selected} />
          ) : (
            <>
              <header class="review-header">
                <h1>Schrift / Licht / gemeinsamer Raum</h1>
                <p>3 Materialtests · gleiche Schrift, gleicher Satz · unbewertet</p>
              </header>
              <main class="comparison">
                {studies.map((study) => (
                  <section class="specimen">
                    <a
                      class="specimen-caption"
                      href={`?variant=${study.key}`}
                    >
                      <strong>{study.key}</strong>
                      <span>
                        <b>{study.name}</b>
                        <small>{study.setting}</small>
                      </span>
                      <span class="open-label">Öffnen ↗</span>
                    </a>
                    <div class="preview">
                      <iframe
                        title={`${study.key}: ${study.name}`}
                        src={`?variant=${study.key}&embedded=1`}
                        loading="eager"
                        scrolling="no"
                      />
                    </div>
                  </section>
                ))}
              </main>
            </>
          )}
          {!embedded && (
            <nav
              class="switcher"
              aria-label="Studien vergleichen"
              data-current={variant}
            >
              <a
                data-step="previous"
                href={`?variant=${studies[at < 0 ? studies.length - 1 : (at + studies.length - 1) % studies.length].key}`}
                aria-label="Vorherige Studie"
              >
                ←
              </a>
              <a
                href="?variant=all"
                aria-current={!selected ? 'page' : undefined}
              >
                Alle
              </a>
              {studies.map((study) => (
                <a
                  href={`?variant=${study.key}`}
                  aria-current={study === selected ? 'page' : undefined}
                  title={study.name}
                >
                  {study.key}
                </a>
              ))}
              <a
                data-step="next"
                href={`?variant=${studies[(at + 1) % studies.length].key}`}
                aria-label="Nächste Studie"
              >
                →
              </a>
              {selected && (
                <span class="current-setting">
                  {selected.name}
                  <small>{selected.setting}</small>
                </span>
              )}
              <button
                type="button"
                data-hide-ui
                title="Bedienung ausblenden / einblenden: H"
                aria-label="Bedienung ausblenden"
              >
                ×
              </button>
            </nav>
          )}
          {!embedded && (
            <button
              class="restore-controls"
              type="button"
              data-restore-ui
              aria-label="Bedienung einblenden"
            >
              A–C
            </button>
          )}
        </body>
      </html>
    )
  }
}
