// Accepted local opener prototype and retained specimens; outside the Worker routes.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const root = new URL('./', import.meta.url)
const catalog = JSON.parse(await readFile(new URL('typefaces.json', root), 'utf8')) as {
  file: string
}[]
const photo = new URL('assets/forest.webp', root)
const files = new Map([
  ['/prototype/temple-lettering', { file: new URL('index.html', root), type: 'text/html' }],
  ['/style.css', { file: new URL('style.css', root), type: 'text/css' }],
  ['/specimens.js', { file: new URL('specimens.js', root), type: 'text/javascript' }],
  ['/preview.js', { file: new URL('preview.js', root), type: 'text/javascript' }],
  ['/glitch.js', { file: new URL('glitch.js', root), type: 'text/javascript' }],
  ['/layers.js', { file: new URL('layers.js', root), type: 'text/javascript' }],
  ['/forest.js', { file: new URL('forest.js', root), type: 'text/javascript' }],
  ['/typefaces.json', { file: new URL('typefaces.json', root), type: 'application/json' }],
  ['/forest.webp', { file: photo, type: 'image/webp' }],
  ...catalog.map(
    ({ file: name }) =>
      [
        `/fonts/${name}.ttf`,
        { file: new URL(`fonts/${name}.ttf`, root), type: 'font/ttf' },
      ] as const,
  ),
])

createServer(async (request, response) => {
  const path = new URL(request.url ?? '/', 'http://localhost').pathname
  if (path === '/') {
    response.writeHead(302, { Location: '/prototype/temple-lettering' }).end()
    return
  }
  const asset = files.get(path)
  if (!asset) {
    response.writeHead(404).end('Not found')
    return
  }
  try {
    const body = await readFile(fileURLToPath(asset.file))
    response
      .writeHead(200, {
        'Content-Type': asset.type,
        'Cache-Control': 'no-store',
      })
      .end(body)
  } catch {
    response.writeHead(404).end('Local specimen asset unavailable')
  }
}).listen(8787, '0.0.0.0', () => {
  console.log('Lettering specimens: http://localhost:8787/prototype/temple-lettering')
})
