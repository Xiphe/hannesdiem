import type { Handle } from 'remix/component'
import assets from '../.generated/assets.json' with { type: 'json' }
import type { NewsletterState } from './newsletter.ts'
import { defaultTheme, themeCss } from './theme.ts'

interface FormProps {
  state: NewsletterState
  signup?: boolean
}

function NewsletterForm(handle: Handle<FormProps>) {
  return () => (
    <form class="newsletter-form" method="post" action="/login">
      <input type="hidden" name="_csrf" value={handle.props.state.csrfToken ?? ''} />
      <label class="sr-only" htmlFor={handle.props.signup ? 'newsletter-email' : 'login-email'}>Email address</label>
      <div class="newsletter-controls">
        <input id={handle.props.signup ? 'newsletter-email' : 'login-email'} name="email" type="email"
          autoComplete="email" maxLength={254} required disabled={!handle.props.state.ready}
          placeholder={handle.props.signup ? 'Enter your email for updates...' : 'Enter your email address'} />
        <button type="submit" disabled={!handle.props.state.ready}>{handle.props.signup ? 'Signup' : 'Get Login Link'}</button>
      </div>
      {!handle.props.state.ready && <p class="newsletter-feedback" role="status">Newsletter signup is temporarily unavailable. Please try again later.</p>}
    </form>
  )
}

export function NewsletterArea(handle: Handle<{ state: NewsletterState }>) {
  return () => (
    <section class="newsletter-area" aria-label="Newsletter">
      {handle.props.state.email ? <>
        <p><strong>{handle.props.state.email}</strong></p>
        <form method="post" action="/logout">
          <input type="hidden" name="_csrf" value={handle.props.state.csrfToken ?? ''} />
          <button type="submit">Logout</button>
        </form>
      </> : <>
        <h3>Let’s stay in touch.</h3>
        <ul>
          <li>Receive updates about new releases</li>
          <li>Get invited to my events and workshops</li>
        </ul>
        <NewsletterForm state={handle.props.state} signup />
      </>}
    </section>
  )
}

export function NewsletterPage(props: { state: NewsletterState; message?: string }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex" />
        <title>Login to hannesdiem.de</title>
        <link rel="stylesheet" href={assets.style} />
        <link rel="icon" href={assets.mark} type="image/svg+xml" />
        <style>{themeCss(defaultTheme)}</style>
      </head>
      <body>
        <main class="newsletter-page">
          <div class="newsletter-card">
            <a href="/">Hannes Diem</a>
            <h1>Login to hannesdiem.de</h1>
            <p>Receive updates about new releases, concerts, events, and workshops.</p>
            {props.message && <p class="newsletter-feedback" role="status">{props.message}</p>}
            <NewsletterForm state={props.state} />
          </div>
        </main>
      </body>
    </html>
  )
}
