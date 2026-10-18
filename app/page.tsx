import { clientEntry, type Handle } from 'remix/component'
import assets from '../.generated/assets.json' with { type: 'json' }
import type { PageContent } from './content.ts'
import { Counter as CounterComponent } from './counter.tsx'

const Counter = clientEntry(`${assets.counter}#Counter`, CounterComponent)

export function Page(handle: Handle<PageContent>) {
  return () => (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{handle.props.title}</title>
        <link rel="icon" href="data:," />
        <link rel="stylesheet" href={assets.style} />
        <script type="module" src={assets.entry}></script>
      </head>
      <body>
        <main>
          {handle.props.body}
          <section id="island" aria-label="Interactive counter">
            <Counter />
          </section>
        </main>
      </body>
    </html>
  )
}
