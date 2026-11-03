import assets from '../../../.generated/assets.json' with { type: 'json' }
import { circleReturnPath, type CircleView, type CircleResult } from './contract.ts'
import { CircleFields } from './panel.tsx'

/** Native fallback uses the same forms as the embedded circle. */
export function CirclePage({ state, result }: { state: CircleView; result?: CircleResult }) {
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
          content="noindex"
        />
        <title>Temple of Sound</title>
        <link
          rel="stylesheet"
          href={assets.style}
        />
        <link
          rel="stylesheet"
          href={assets.templeStyle}
        />
      </head>
      <body>
        <main class="newsletter-page">
          <div class="newsletter-card">
            <a href={circleReturnPath}>Temple of Sound</a>
            {CircleFields({ state, spot: state.selected ?? state.own?.spot ?? 1, result })}
          </div>
        </main>
      </body>
    </html>
  )
}
