import { clientEntry } from 'remix/component'
import assets from '../../../.generated/assets.json' with { type: 'json' }
import type { NewsletterState, NewsletterResult } from './contract.ts'
import { NewsletterArea as NewsletterAreaComponent, StandaloneNewsletterForm } from './form.tsx'
import { defaultTheme, themeCss } from '../theme.ts'

export const NewsletterArea = clientEntry(
  assets.newsletter + '#NewsletterArea',
  NewsletterAreaComponent,
)
const NewsletterForm = clientEntry(
  assets.newsletter + '#StandaloneNewsletterForm',
  StandaloneNewsletterForm,
)

export function NewsletterPage(props: {
  state: NewsletterState
  message?: string
  result?: NewsletterResult
  emailValue?: string
}) {
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
        <title>Login to hannesdiem.de</title>
        <link
          rel="stylesheet"
          href={assets.style}
        />
        <link
          rel="icon"
          href={assets.mark}
          type="image/svg+xml"
        />
        <style>{themeCss(defaultTheme)}</style>
        <script
          type="module"
          src={assets.entry}
        ></script>
      </head>
      <body>
        <main class="newsletter-page">
          <div class="newsletter-card">
            <a href="/">Hannes Diem</a>
            <h1>Login to hannesdiem.de</h1>
            <p>Receive updates about new releases, concerts, events, and workshops.</p>
            {props.message && !props.result && (
              <p
                class="newsletter-feedback"
                role="status"
              >
                {props.message}
              </p>
            )}
            <NewsletterForm
              state={props.state}
              result={props.result}
              emailValue={props.emailValue}
            />
          </div>
        </main>
      </body>
    </html>
  )
}
