// THROWAWAY: line length only. Bricolage accepted for the first pair; setting open.
// Local /temple-of-sound?variant=all|1..3; never a publication entry.
import { readFileSync } from 'node:fs'
import type { Handle } from 'remix/component'

export const studies = [
  {
    key: '1',
    name: 'Kurze Zeilen',
    cut: '44 % der Ansichtsbreite',
    feature: 'Schmale Textfläche, mehr natürliche Umbrüche; dieselbe linke Kante.',
    question:
      'Tragen die kurzen Zeilen deine direkte Ansprache oder zerlegen sie zusammengehörige Gedanken?',
    risk: 'Der lange zweite Absatz und die letzte Refrainzeile könnten zu stark zerstückelt werden.',
  },
  {
    key: '2',
    name: 'Mittlere Zeilen',
    cut: '64 % der Ansichtsbreite',
    feature: 'Mehr zusammenhängende Worte je Zeile; Schriftgröße und Abstände bleiben gleich.',
    question:
      'Wie liest sich der Wechsel zwischen langen Gedanken und den kurzen Aussagen im Refrain?',
    risk: 'Auch dieser Mittelwert ist nur ein Vergleich, keine bevorzugte Lösung.',
  },
  {
    key: '3',
    name: 'Weite Zeilen',
    cut: '82 % · Satzbreite der bisherigen Schriftprobe A',
    feature:
      'Längere Satzteile bleiben in einer Zeile; die Fläche entspricht der bisherigen Probe.',
    question:
      'Hilft der längere Atem der Öffnung, die du beschreibst, oder verliert der Text seine Spannung?',
    risk: 'Weite Zeilen könnten sich zu sehr wie ein gewöhnlicher Absatz lesen.',
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
      data-measure={handle.props.study.key}
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
            {selected ? `${selected.key} / ${selected.name}` : 'Zeilenlänge / Temple of Sound'}
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
                <h1>Satz / Zeilenlänge</h1>
                <p class="question">Wie viel Raum sollen deine Sätze in einer Zeile bekommen?</p>
                <p>
                  Festgehalten: Bricolage Grotesque für das erste Strophen-Refrain-Paar. Jetzt
                  ändern wir ausschließlich die Breite der Textfläche.
                </p>
                <p>
                  Gleich bleiben dein Text, Bricolage 600, Schriftgröße, linke Kante, Zeilen- und
                  Absatzabstände, Farbe und Hintergrund. Deine ausdrücklichen Zeilenumbrüche bleiben
                  erhalten; weitere entstehen durch die unterschiedliche Breite.
                </p>
                <ol
                  class="rounds"
                  aria-label="Vereinbarte Schritte"
                >
                  <li>Schriftcharakter ✓</li>
                  <li aria-current="step">Satz</li>
                  <li>Lesebewegung</li>
                  <li>Bild / Licht / Input</li>
                </ol>
                <p class="boundary">
                  Die Breiten sind unbewertete Proben. Auf kleinen Bildschirmen begrenzen wir die
                  Verengung zugunsten lesbarer Zeilen; die Übersicht zeigt alle drei bei derselben
                  großen Ansichtsbreite. Bewegung und Bild bleiben ein späterer Schritt.
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
                aria-label="Zeilenlängen vergleichen"
                data-current={variant}
              >
                <a
                  data-step="previous"
                  href={`?variant=${studies[at < 0 ? studies.length - 1 : (at + studies.length - 1) % studies.length].key}`}
                  aria-label="Vorherige Breite"
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
                  aria-label="Nächste Breite"
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
                1–3
              </button>
            </>
          )}
        </body>
      </html>
    )
  }
}
