export const title = 'Page not found'

export default function NotFound() {
  return (
    <article id="content">
      <span class="eyebrow">404</span>
      <h1>{title}</h1>
      <p>There is no page at this address.</p>
      <a href="/">Back home</a>
    </article>
  )
}
