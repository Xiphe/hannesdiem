// THROWAWAY: compare two native-flow document forms after the accepted opener.
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

type FlowProps = { units: string[]; hidden: boolean }
export function TypeFlow(handle: Handle<FlowProps>) {
  return () => (
    <article
      class="document-poem type-flow"
      data-layout="type"
      hidden={handle.props.hidden}
      aria-label="Erstes Strophen-Refrain-Paar"
    >
      <p
        class="type-opening"
        data-unit="0"
      >
        {handle.props.units[0]
          .split(/(\s+)/)
          .map((part) => (/\s+/.test(part) ? part : <span data-entry-word>{part}</span>))}
      </p>
      <p
        class="type-address"
        data-unit="1"
      >
        {handle.props.units[1]}
      </p>
      <p
        class="type-body"
        data-unit="2"
      >
        {handle.props.units[2]}
      </p>
      <div class="type-refrain">
        {handle.props.units.slice(3).map((unit, index) => (
          <p data-unit={index + 3}>{unit}</p>
        ))}
      </div>
    </article>
  )
}
export function WovenFlow(handle: Handle<FlowProps>) {
  return () => (
    <article
      class="document-poem woven-flow"
      data-layout="woven"
      hidden={handle.props.hidden}
      aria-label="Erstes Strophen-Refrain-Paar"
    >
      <p
        class="woven-opening"
        data-unit="0"
      >
        {handle.props.units[0]}
      </p>
      <figure
        class="woven-image woven-canopy"
        aria-hidden="true"
      >
        <img
          src="/forest.webp"
          alt=""
          loading="lazy"
        />
      </figure>
      <p
        class="woven-address"
        data-unit="1"
      >
        {handle.props.units[1]}
      </p>
      <p
        class="woven-body"
        data-unit="2"
      >
        {handle.props.units[2]}
      </p>
      <figure
        class="woven-image woven-ground"
        aria-hidden="true"
      >
        <img
          src="/forest.webp"
          alt=""
          loading="lazy"
        />
      </figure>
      {handle.props.units.slice(3).map((unit, index) => (
        <p
          class={`woven-refrain woven-line-${index}`}
          data-unit={index + 3}
        >
          {unit}
        </p>
      ))}
    </article>
  )
}
export function Review(handle: Handle<{ layout: string }>) {
  const layout = handle.props.layout === 'woven' ? 'woven' : 'type'
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
        <title>Temple of Sound / Dokumentformen</title>
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
      <body data-reading={layout}>
        <main class="temple-page">
          <Opening {...openingProps} />
          <TypeFlow
            units={units}
            hidden={layout !== 'type'}
          />
          <WovenFlow
            units={units}
            hidden={layout !== 'woven'}
          />
        </main>
        <nav
          class="review-controls"
          aria-label="Zwei Dokumentformen im Vergleich"
          lang="de"
        >
          <div class="review-heading">
            <button
              type="button"
              data-previous
              aria-label="Vorherige Dokumentform"
            >
              ←
            </button>
            <a
              href="?layout=type"
              data-layout-link="type"
              aria-current={layout === 'type' ? 'page' : undefined}
            >
              A · Schriftfläche
            </a>
            <a
              href="?layout=woven"
              data-layout-link="woven"
              aria-current={layout === 'woven' ? 'page' : undefined}
            >
              B · Text &amp; Bild
            </a>
            <button
              type="button"
              data-next
              aria-label="Nächste Dokumentform"
            >
              →
            </button>
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
          <p data-description>
            {layout === 'type'
              ? 'Große Textfelder und ein verdichteter Refrain.'
              : 'Textpassagen greifen über und zwischen Bildausschnitte.'}
          </p>
          <p class="review-note">
            Normal scrollen. ← / → wechseln die Form an derselben Textstelle. H versteckt die
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
