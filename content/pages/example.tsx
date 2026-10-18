import { Counter } from '@hannesdiem/content-components'

export const title = 'Another example'

export default function Example() {
  return (
    <>
      <article id="content">
        <span class="eyebrow">Content meets interaction</span>
        <h1>{title}</h1>
        <p>This page is authored in CMX, including the interactive counter below.</p>
        <p>Its initial count travels through the CMX document into a Remix island.</p>
        <a href="/">Back home</a>
      </article>
      <section id="island" data-rmx-key="example-counter" aria-label="Interactive counter">
        <Counter initialCount={10} />
      </section>
    </>
  )
}
