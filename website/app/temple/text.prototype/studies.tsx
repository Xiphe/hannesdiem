// THROWAWAY: font character only. Identical text, measure, ink, size and spacing.
// Local /temple-of-sound?variant=all|A..D; never a publication entry.
import { readFileSync } from 'node:fs'
import type { Handle } from 'remix/component'

export const studies = [
  {
    key: 'A',
    name: 'Bricolage Grotesque',
    cut: 'Semibold · 600',
    feature: 'Breite Rundungen, kompakte Verbindungen, ungleiche Buchstabenproportionen.',
    question: 'Trägt die körperliche Präsenz aus dem Opener auch diese persönliche Ansprache?',
    risk: 'Die Stimme könnte zu sehr nach Titel oder Plakat klingen.',
  },
  {
    key: 'B',
    name: 'Germania One',
    cut: 'Regular · 400',
    feature: 'Gebrochene Bögen, kantige Übergänge und gerundete Innenräume.',
    question: 'Wie wirkt die bereits vertraute kantige Stimme, wenn sie ganze Gedanken trägt?',
    risk: 'Die historischen Formen könnten stärker auffallen als die Worte.',
  },
  {
    key: 'C',
    name: 'Cinzel Decorative',
    cut: 'Bold · 700',
    feature: 'Ausgeprägte Serifen, starke Strichkontraste und versalienartige Kleinbuchstaben.',
    question: 'Kann die feierliche Form der direkten, persönlichen Ansprache Raum geben?',
    risk: 'Die dekorativen Formen könnten Distanz schaffen oder das Lesen erschweren.',
  },
  {
    key: 'D',
    name: 'Unbounded',
    cut: '650 · wie im Opener',
    feature: 'Breite geometrische Formen, große Rundungen und gleichmäßige Striche.',
    question: 'Wie viel von dieser ausladenden Präsenz vertragen die längeren Sätze?',
    risk: 'Die Breite könnte den Lesefluss in zu viele kurze Zeilen zerlegen.',
  },
] as const
export type Study = (typeof studies)[number]

function pair() {
  // Read the artist's source; never duplicate or rewrite the prose for a specimen.
  const draft = readFileSync('content/drafts/temple-of-sound.tsx', 'utf8')
  const opening = draft.match(/<PoemOpening\b[^>]*>([\s\S]*?)<\/PoemOpening>/)![1]
  return [...opening.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((p) =>
    p[1].split(/<br\s*\/>/).map((line) => line.replace(/\s+/g, ' ').trim()),
  )
}

export function TextStudy(handle: Handle<{ study: Study }>) {
  const paragraphs = pair()
  return () => (
    <main
      class="study-surface"
      data-face={handle.props.study.key}
    >
      <article
        class="poem"
        lang="en"
        aria-label="Originaltext: erstes Strophen-Refrain-Paar"
      >
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

function Notes(handle: Handle<{ study: Study }>) {
  return () => {
    const study = handle.props.study
    return (
      <dl class="notes">
        <div>
          <dt>Sichtbar</dt>
          <dd>{study.feature}</dd>
        </div>
        <div>
          <dt>Prüfen</dt>
          <dd>{study.question}</dd>
        </div>
        <div>
          <dt>Risiko</dt>
          <dd>{study.risk}</dd>
        </div>
      </dl>
    )
  }
}

export function Review(handle: Handle<{ variant: string; embedded: boolean }>) {
  return () => {
    const { variant, embedded } = handle.props
    const selected = studies.find((study) => study.key === variant)
    const at = selected ? studies.indexOf(selected) : -1
    return (
      <html lang="de">
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
            {selected ? `${selected.key} / ${selected.name}` : 'Schriftcharakter / Temple of Sound'}
          </title>
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
            <>
              {!embedded && (
                <header class="single-header">
                  <a href="?variant=all">Alle vergleichen</a>
                  <h1>
                    {selected.key} / {selected.name} <small>{selected.cut}</small>
                  </h1>
                  <Notes study={selected} />
                </header>
              )}
              <TextStudy study={selected} />
            </>
          ) : (
            <>
              <header class="review-header">
                <p class="context">Temple of Sound · lokale Werkstatt · keine Veröffentlichung</p>
                <h1>Schriftcharakter</h1>
                <p class="question">
                  Wie tragen die vier Schriften aus dem Opener deine längeren Sätze?
                </p>
                <p>
                  Bricolage, Germania One, Cinzel Decorative und Unbounded — die gemeinsam
                  erarbeiteten Stimmen als Ausgangspunkt für das erste Strophen-Refrain-Paar.
                </p>
                <p>
                  Gleich bleiben Text, Satzbreite, Ausrichtung, Zeilenabstand, Farbe und
                  Hintergrund. Die Kleinbuchstaben sind auf gleiche Höhe angeglichen; natürliche
                  Umbrüche unterscheiden sich.
                </p>
                <ol
                  class="rounds"
                  aria-label="Vereinbarte Schritte"
                >
                  <li aria-current="step">Schriftcharakter</li>
                  <li>Satz</li>
                  <li>Lesebewegung</li>
                  <li>Bild / Licht / Input</li>
                </ol>
                <p class="boundary">
                  Hier beurteilen wir nur die Schrift. Keine davon beweist Verletzlichkeit oder
                  Verbindung. Die Begründungen sind Prüffragen; es gibt noch keine Auswahl.
                </p>
              </header>
              <main class="comparison">
                {studies.map((study) => (
                  <section class="specimen">
                    <header class="specimen-caption">
                      <a
                        class="specimen-title"
                        href={`?variant=${study.key}`}
                      >
                        <strong>{study.key}</strong>
                        <span>
                          <b>{study.name}</b>
                          <small>{study.cut}</small>
                        </span>
                        <span class="open-label">Öffnen ↗</span>
                      </a>
                      <Notes study={study} />
                    </header>
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
            <>
              <nav
                class="switcher"
                aria-label="Schriften vergleichen"
                data-current={variant}
              >
                <a
                  data-step="previous"
                  href={`?variant=${studies[at < 0 ? studies.length - 1 : (at + studies.length - 1) % studies.length].key}`}
                  aria-label="Vorherige Schrift"
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
                  aria-label="Nächste Schrift"
                >
                  →
                </a>
                {selected && <span class="current-setting">{selected.name}</span>}
                <button
                  type="button"
                  data-hide-ui
                  title="Bedienung ausblenden / einblenden: H"
                  aria-label="Bedienung ausblenden"
                >
                  ×
                </button>
              </nav>
              <button
                class="restore-controls"
                type="button"
                data-restore-ui
                aria-label="Bedienung einblenden"
              >
                A–D
              </button>
            </>
          )}
        </body>
      </html>
    )
  }
}
