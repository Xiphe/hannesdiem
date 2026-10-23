// THROWAWAY: six text-image studies of the first verse/refrain pair.
// Local comparison on /temple-of-sound?variant=all|A..F; no publication entry.
import { readFileSync } from 'node:fs'
import type { Handle } from 'remix/component'

export const studies = [
  { key: 'A', font: 'Fraunces', setting: '620 · linksbündig · kurzer Satz' },
  { key: 'B', font: 'Bricolage Grotesque', setting: '750 · dichter Flächensatz' },
  { key: 'C', font: 'Kalam', setting: '700 · Handschrift · versetzte Absätze' },
  { key: 'D', font: 'Barlow Condensed', setting: '700 · schmaler Stufensatz' },
  { key: 'E', font: 'Unbounded', setting: '400 · breite Schrift · wechselnde Ausrichtung' },
  { key: 'F', font: 'Cormorant Garamond', setting: '650 · kursiv · zentrierter Satz' },
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
      <article class={`poem study-${handle.props.study.key}`}>
        {paragraphs.map((lines) => (
          <p>
            {lines.map((line, index) => (
              <>
                {index > 0 && <br />}
                {line}
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
          <title>{selected ? `${selected.key} / ${selected.font}` : 'A–F / Textstudien'}</title>
          <link
            rel="stylesheet"
            href="/style.css"
          />
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
                <h1>Textbild / erste Strophe + Refrain</h1>
                <p>6 Studien · nur lokal · keine Auswahl getroffen</p>
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
                        <b>{study.font}</b>
                        <small>{study.setting}</small>
                      </span>
                      <span class="open-label">Öffnen ↗</span>
                    </a>
                    <div class="preview">
                      <iframe
                        title={`${study.key}: ${study.font}`}
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
                href={`?variant=${studies[at < 0 ? 5 : (at + 5) % 6].key}`}
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
                  title={study.font}
                >
                  {study.key}
                </a>
              ))}
              <a
                data-step="next"
                href={`?variant=${studies[(at + 1) % 6].key}`}
                aria-label="Nächste Studie"
              >
                →
              </a>
              {selected && (
                <span class="current-setting">
                  {selected.font}
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
              A–F
            </button>
          )}
        </body>
      </html>
    )
  }
}
