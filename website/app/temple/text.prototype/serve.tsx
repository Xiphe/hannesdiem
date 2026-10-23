// LOCAL THROWAWAY SERVER. Deliberately outside the Worker/router/publication.
import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { renderToString } from 'remix/component/server'
import { Review } from './studies.tsx'

const root = new URL('./', import.meta.url)
const types: Record<string, string> = { css: 'text/css', js: 'text/javascript', ttf: 'font/ttf' }
const files = new Map([
  ['/style.css', new URL('style.css', root)],
  ['/review.js', new URL('review.js', root)],
  ...['fraunces.ttf', 'kalam-bold.ttf', 'barlowcondensed.ttf', 'cormorant-italic.ttf'].map(
    (file) => [`/fonts/${file}`, new URL(`fonts/${file}`, root)] as const,
  ),
  ...['bricolage.ttf', 'unbounded.ttf'].map(
    (file) => [`/fonts/${file}`, new URL(`../../assets/temple/${file}`, root)] as const,
  ),
])
createServer(async (request, response) => {
  const url = new URL(request.url!, 'http://localhost')
  response.setHeader('Cache-Control', 'no-store')
  const file = files.get(url.pathname)
  if (file) {
    response.setHeader('Content-Type', types[url.pathname.split('.').pop()!] ?? 'text/plain')
    response.end(readFileSync(fileURLToPath(file)))
  } else if (url.pathname === '/' || url.pathname === '/temple-of-sound') {
    response.setHeader('Content-Type', 'text/html; charset=utf-8')
    response.end(
      '<!doctype html>' +
        (await renderToString(
          <Review
            variant={url.searchParams.get('variant') ?? 'all'}
            embedded={url.searchParams.has('embedded')}
          />,
        )),
    )
  } else {
    response.writeHead(404)
    response.end()
  }
}).listen(8790, '0.0.0.0', () =>
  console.log('Local text prototype: http://localhost:8790/temple-of-sound'),
)
