// THROWAWAY: develop Alongside inside the accepted page, ?variant=A.
// Proxy the running CMX page; none of this enters the website's build or publication.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import {
  watchFragments,
  watchActionContext,
} from '../../../../content/pages/temple-of-sound/_watch.ts'
import { createCopy } from '../../../../content/pages/temple-of-sound/_create.ts'

const upstream = process.env.TEMPLE_PREVIEW ?? 'http://127.0.0.1:8791'
const port = Number(process.env.WATCH_PORT ?? 8793)
const root = new URL('../../../../', import.meta.url)
const local = new URL('./', import.meta.url)

createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost')
    const name = url.pathname.replace('/__watch/', '')
    if (url.pathname.startsWith('/__watch/')) {
      response.setHeader('Cache-Control', 'no-store')
      if (name === 'material.js') {
        response.setHeader('Content-Type', 'text/javascript')
        response.end(
          `export const fragments = ${JSON.stringify(watchFragments)}; export const actionContext = ${JSON.stringify(watchActionContext)}; export const createCopy = ${JSON.stringify(createCopy)};`,
        )
      } else if (['study.js', 'study.css', 'create.js', 'reading-material.js'].includes(name)) {
        response.setHeader('Content-Type', name.endsWith('.js') ? 'text/javascript' : 'text/css')
        response.end(await readFile(new URL(name, local)))
      } else if (
        [
          'tos2.jpg',
          'tos4.jpg',
          'tos.jpg',
          'mixing-scene-one-week-retreat-1803-2fadbcefea805a0a.webp',
        ].includes(name)
      ) {
        response.setHeader('Content-Type', name.endsWith('.webp') ? 'image/webp' : 'image/jpeg')
        response.end(await readFile(new URL(`content/media/${name}`, root)))
      } else {
        response.writeHead(404).end()
      }
      return
    }
    const source = await fetch(new URL(request.url, upstream))
    response.statusCode = source.status
    for (const [key, value] of source.headers) {
      if (!['content-length', 'content-encoding', 'transfer-encoding'].includes(key)) {
        response.setHeader(key, value)
      }
    }
    if (url.pathname.replace(/\/$/, '') === '/temple-of-sound') {
      const html = (await source.text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, (script) =>
        script.includes('initLiveReload') ? '' : script,
      )
      response.setHeader('Cache-Control', 'no-store')
      response.end(
        html.replace(
          '</body>',
          '<link rel="stylesheet" href="/__watch/study.css"><script type="module" src="/__watch/study.js"></script></body>',
        ),
      )
    } else {
      response.end(Buffer.from(await source.arrayBuffer()))
    }
  } catch (error) {
    console.error(error)
    response.writeHead(502).end('Start the regular Temple preview on port 8791 first.')
  }
}).listen(port, '0.0.0.0', () => {
  console.log(`Watch studies: http://localhost:${port}/temple-of-sound?variant=A#watch`)
})
