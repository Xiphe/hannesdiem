import { Counter } from '@hannesdiem/content-components'

export const title = 'Hannes Diem'

export default function Home() {
  return (
    <>
      <article id="content">
        <span class="eyebrow">A small beginning</span>
        <h1>{title}</h1>
        <p>Music, words, and a place to share what comes next.</p>
        <p>This is placeholder content for the Remix and Cloudflare spike.</p>
        <a href="/example">Another example</a>
      </article>
      <section id="island" data-rmx-key="home-counter" aria-label="Interactive counter">
        <Counter initialCount={0} />
      </section>
    </>
  )
}
