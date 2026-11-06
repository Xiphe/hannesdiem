import http from 'node:http'
import { readFile } from 'node:fs/promises'
import { build } from 'esbuild'

const directory = new URL('.', import.meta.url)
const port = Number(process.env.BUTTON_STUDY_PORT || 8795)
const bundle = await build({
  entryPoints: [new URL('study.ts', directory).pathname],
  bundle: true,
  write: false,
  format: 'iife',
})
const script = bundle.outputFiles[0].text
const css = await readFile(new URL('study.css', directory), 'utf8')
// This is a local visual-review overlay. The existing CMX document and runtime
// still supply all content, links, artwork and media; no alternate content index.
http
  .createServer(async (request, response) => {
    try {
      if (request.url === '/') {
        response.writeHead(302, { location: '/temple-of-sound?button-study' }).end()
        return
      }
      if (request.url === '/__button-study.js') {
        response
          .writeHead(200, {
            'content-type': 'text/javascript',
            'cache-control': 'no-store',
          })
          .end(script)
        return
      }
      if (request.url === '/__button-study.css') {
        response
          .writeHead(200, {
            'content-type': 'text/css',
            'cache-control': 'no-store',
          })
          .end(css)
        return
      }
      if (request.url?.startsWith('/__button-fixture')) {
        response
          .writeHead(200, { 'content-type': 'text/html' })
          .end(
            `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/__button-study.css"><style>body{margin:0;background:#fffefd;color:#1e2933;font:16px system-ui}.temple-entry-welcome{padding-top:30vh;text-align:center}.fact-action a{display:inline-block;padding:14px 26px;text-decoration:none}a{color:inherit}</style></head><body><main class="temple-artwork" data-state="ready"><div class="temple-entry-welcome"><div class="fact-action"><a href="/__button-fixture?activated">Synthetic action</a></div></div><div style="height:140vh"></div></main><script src="/__button-study.js" defer></script></body></html>`,
          )
        return
      }
      const path = request.url === '/' ? '/temple-of-sound?button-study' : request.url
      const upstream = await fetch(`http://127.0.0.1:8787${path}`, {
        headers: { 'accept-encoding': 'identity' },
        redirect: 'manual',
      })
      const headers = Object.fromEntries(upstream.headers)
      delete headers['content-encoding']
      delete headers['content-length']
      headers['cache-control'] = 'no-store'
      let body
      if (headers['content-type']?.includes('text/html')) {
        body = await upstream.text()
        // A light-only review must use light material even on a dark host system.
        const theme = `<script>const studyMatchMedia=window.matchMedia.bind(window);window.matchMedia=(query)=>{const result=studyMatchMedia(query);if(/prefers-color-scheme/.test(query))Object.defineProperty(result,'matches',{value:query.includes('light')});return result}</script><link rel="stylesheet" href="/__button-study.css">`
        body = body.replace('</head>', `${theme}</head>`)
        body = body.replace('</body>', '<script src="/__button-study.js" defer></script></body>')
      } else body = Buffer.from(await upstream.arrayBuffer())
      response.writeHead(upstream.status, headers).end(body)
    } catch (error) {
      console.error(error)
      response.writeHead(502).end('Preview unavailable')
    }
  })
  .listen(port, '0.0.0.0', () => console.log(`Light button study: http://localhost:${port}`))
