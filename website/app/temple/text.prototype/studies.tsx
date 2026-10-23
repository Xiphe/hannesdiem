// THROWAWAY: font character only. Identical text, measure, ink, size and spacing.
// Local /temple-of-sound?variant=all|A..E; never a publication entry.
import { readFileSync } from 'node:fs'
import type { Handle } from 'remix/component'

export const studies = [
  {
    key: 'A',
    name: 'Bricolage Grotesque',
    cut: 'Semibold · 600',
    feature: 'Breite Rundungen, kompakte Verbindungen, ungleiche Buchstabenproportionen.',
    question:
      'Die körperliche Präsenz des Openers auch für diese persönliche Ansprache prüfen: trägt sie die Worte oder übertönt sie sie?',
    risk: 'Die Stimme könnte zu sehr nach Titel oder Plakat klingen.',
    source: 'https://github.com/ateliertriay/bricolage',
  },
  {
    key: 'B',
    name: 'Recursive Sans Casual',
    cut: 'Semibold · 600 · proportional, aufrecht',
    feature: 'Gebogene Stämme, angeschrägte Enden und sichtbar unregelmäßige Übergänge.',
    question:
      'Für dein „rough“: Können diese Abweichungen etwas Ungeglättetes beitragen, ohne die Buchstaben künstlich zu beschädigen?',
    risk: 'Der eigenwillige Rhythmus könnte von der direkten Ansprache ablenken.',
    source: 'https://www.recursive.design/process/',
  },
  {
    key: 'C',
    name: 'Alegreya Sans',
    cut: 'Bold · 700',
    feature: 'Schmale Formen, wechselnde Strichstärke und deutlich offene Buchstaben.',
    question:
      'Für das Sich-Öffnen: prüfen, ob weniger geschlossene Formen und ein bewegter Strich persönlicher wirken, ohne dünn zu werden.',
    risk: 'Die Schrift könnte zu freundlich oder beiläufig wirken.',
    source: 'https://github.com/huertatipografica/Alegreya-Sans',
  },
  {
    key: 'D',
    name: 'Alegreya',
    cut: 'Bold · 700 · aufrecht',
    feature:
      'Serifen und kräftige Anstriche, mit wechselnder Strichstärke statt gleichmäßiger Geometrie.',
    question:
      'Derselbe Ansatz wie C mit mehr Gewicht an den Strichenden: Gibt das dem mutigen, großen Öffnen Halt oder schafft es Distanz?',
    risk: 'Buch- oder Traditionsassoziationen könnten die gegenwärtige Stimme überlagern.',
    source: 'https://github.com/huertatipografica/Alegreya',
  },
  {
    key: 'E',
    name: 'Grandstander',
    cut: 'Semibold · 600',
    feature:
      'Runde, ungleichmäßige Konturen und wechselnde Neigungen innerhalb aufrechter Buchstaben.',
    question:
      'Für „I’m playful and inspired“: Wie viel sichtbare Verspieltheit verträgt das gesamte Paar, einschließlich seiner ernsten Sätze?',
    risk: 'Das kann ins Niedliche oder Illustrative kippen und die Größe des Textes verlieren.',
    source: 'https://github.com/Etcetera-Type-Co/Grandstander',
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
                  Welche Schriftcharaktere könnten deine Worte tragen — und welche fühlen sich ihnen
                  fremd an?
                </p>
                <p>
                  Ausgangspunkt: mutiges, großes Öffnen; Verbindung; rough statt glatt; „I’m playful
                  and inspired“.
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
                      <a
                        class="source"
                        href={study.source}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Schriftquelle
                      </a>
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
                A–E
              </button>
            </>
          )}
        </body>
      </html>
    )
  }
}
