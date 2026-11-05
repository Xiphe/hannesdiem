import { build } from 'esbuild'
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'
import { createServer } from 'node:http'
import { basename, resolve } from 'node:path'
import { cp, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'

// This preview never reads runtime credentials or forwards provider requests.
const port = Number(process.env.PREVIEW_PORT ?? 8787)
const compiled = await build({
  entryPoints: [
    process.env.WEBSITE_TEST === 'true'
      ? 'website/tests/worker.ts'
      : 'content/development/worker.ts',
  ],
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  external: ['cloudflare:workers'],
  jsx: 'automatic',
  jsxImportSource: 'remix/component',
})
const contacts = new Map()
const emails = []
// Keep the manifest and its files together while other agents rebuild dist.
const previewAssets = await mkdtemp(resolve(tmpdir(), 'hannesdiem-preview-assets-'))
await cp(resolve('dist'), previewAssets, { recursive: true })
// Asset-only builds replace dist. Pair the authored Publication with its prepared
// media directly rather than relying on a previous development-media copy.
if (process.env.WEBSITE_TEST !== 'true')
  await cp(resolve('.generated/media'), resolve(previewAssets, 'media'), {
    recursive: true,
    filter: (path) => basename(path) !== '.cmx',
  })
const mf = new Miniflare(
  convertV4MiniflareOptions({
    modules: true,
    script: compiled.outputFiles[0].text,
    compatibilityDate: '2026-10-18',
    assets: { directory: previewAssets, routerConfig: { has_user_worker: true } },
    durableObjects: {
      NEWSLETTER_STATE: { className: 'NewsletterState', useSQLite: true },
      CIRCLE_STATE: { className: 'CircleState', useSQLite: true },
      CONTENT_STATE: { className: 'ContentState', useSQLite: true },
    },
    bindings: {
      CMX_PUBLISH_PUBLIC_KEYS: '{}',
      NEWSLETTER_SESSION_SECRET: 'local-preview-only-session-secret-for-this-process',
      RESEND_HANNESDIEM_DE_API_KEY: 'local-preview-only',
      RESEND_HANNESDIEM_DE_SEGMENT_ID: '38f5bf95-30c9-4aac-aeb3-db79f71baf03',
    },
    outboundService: async (request) => {
      const url = new URL(request.url)
      if (url.origin !== 'https://api.resend.com') return new Response(null, { status: 502 })
      const raw = request.method === 'GET' ? '' : await request.text()
      const body = raw ? JSON.parse(raw) : undefined
      if (url.pathname === '/emails') {
        emails.push(body)
        return Response.json({ id: `preview-${emails.length}` })
      }
      if (url.pathname === '/contacts' && request.method === 'POST') {
        contacts.set(body.email.toLowerCase(), {
          first_name: body.first_name ?? '',
          unsubscribed: body.unsubscribed ?? false,
          topics: body.topics ?? [],
          segments: body.segments ?? [],
        })
        return Response.json({ id: 'preview-contact' })
      }
      const match = url.pathname.match(/^\/contacts\/([^/]+)(.*)$/)
      const contact = match && contacts.get(decodeURIComponent(match[1]).toLowerCase())
      if (!contact) return new Response(null, { status: 404 })
      if (request.method === 'GET' && match[2] === '/segments')
        return Response.json({ data: contact.segments ?? [], has_more: false })
      if (request.method === 'GET')
        return Response.json(
          match[2] === '/topics' ? { data: contact.topics, has_more: false } : contact,
        )
      if (match[2] === '/topics') {
        for (const topic of body) {
          contact.topics = contact.topics.filter((existing) => existing.id !== topic.id)
          contact.topics.push(topic)
        }
      } else if (match[2].startsWith('/segments/')) {
        const id = match[2].slice('/segments/'.length)
        contact.segments = [
          ...(contact.segments ?? []).filter((segment) => segment.id !== id),
          { id },
        ]
      } else if (!match[2]) Object.assign(contact, body)
      return Response.json({ id: 'preview-contact' })
    },
  }),
)
await mf.ready
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`)
    if (url.pathname === '/__preview/cursor') {
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      })
      res.end(await readFile(new URL('./cursor-check.html', import.meta.url)))
      return
    }
    if (url.pathname === '/__preview/email') {
      const email = [...emails].reverse().find((mail) => mail.html)
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      })
      res.end(
        email?.html ??
          '<p>No confirmation requested yet. Submit the Watch or Share form first.</p>',
      )
      return
    }
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    const body = chunks.length ? Buffer.concat(chunks) : undefined
    const response = await mf.dispatchFetch(url.href, {
      method: req.method,
      headers: req.headers,
      body,
      redirect: 'manual',
    })
    const headers = Object.fromEntries(response.headers)
    if (response.headers.getSetCookie().length)
      headers['set-cookie'] = response.headers.getSetCookie()
    res.writeHead(response.status, headers)
    res.end(Buffer.from(await response.arrayBuffer()))
  } catch {
    res.writeHead(500)
    res.end('Preview request failed.')
  }
})
server.listen(port, '0.0.0.0', () =>
  console.log(
    `Local preview on port ${server.address().port}; provider requests are simulated. Confirmation email: /__preview/email`,
  ),
)
async function stop() {
  server.close()
  await mf.dispose()
  await rm(previewAssets, { recursive: true, force: true })
  process.exit(0)
}
process.on('SIGTERM', stop)
process.on('SIGINT', stop)
