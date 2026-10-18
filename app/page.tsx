import type { Handle } from 'remix/component'
import assets from '../.generated/assets.json' with { type: 'json' }
import type { PageContent } from './content.ts'

export function Page(handle: Handle<PageContent>) {
  return () => (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{handle.props.title}</title>
        <link rel="icon" href={assets.mark} type="image/svg+xml" />
        <link rel="stylesheet" href={assets.style} />
        <script type="module" src={assets.entry}></script>
      </head>
      <body>
        <main>
          <a href="/" aria-label="Home" class="site-mark"><img src={assets.mark} width="40" height="40" alt="" /></a>
          {handle.props.body}
        </main>
      </body>
    </html>
  )
}
