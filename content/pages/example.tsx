import { Counter } from '@hannesdiem/content-components'
import media from '../../.generated/media.json' with { type: 'json' }

export const title = 'Another example'

export default function Example() {
  return (
    <>
      <article id="content">
        <span class="eyebrow">Content meets interaction</span>
        <h1>{title}</h1>
        <p>This page is authored in CMX, including the interactive counter below.</p>
        <p>Its initial count travels through the CMX document into a Remix island.</p>
        <figure>
          <img
            {...media.landscape}
            sizes="(max-width: 864px) calc(100vw - 48px), 816px"
            alt="An illustrated landscape with a warm sun above layered blue and green hills."
            decoding="async"
          />
          <figcaption>Content media: responsive WebP variants served independently from R2.</figcaption>
        </figure>
        <a href="/">Back home</a>
      </article>
      <section id="island" data-rmx-key="example-counter" aria-label="Interactive counter">
        <Counter initialCount={10} />
      </section>
    </>
  )
}
