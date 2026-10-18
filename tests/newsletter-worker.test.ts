import assert from 'node:assert/strict'
import { test } from 'node:test'
import { build } from 'esbuild'
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'

test('newsletter sends in Workers and rejects provider redirects without following them', async (t) => {
  const { outputFiles } = await build({
    entryPoints: ['app/worker.ts'],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'browser',
    external: ['cloudflare:workers'],
    jsx: 'automatic',
    jsxImportSource: 'remix/component',
  })
  let deliveryStatus = 200
  const outboundUrls: string[] = []
  const deliveries: Record<string, unknown>[] = []
  const runtime = new Miniflare(
    convertV4MiniflareOptions({
      modules: true,
      script: outputFiles[0].text,
      compatibilityDate: '2026-10-18',
      durableObjects: {
        NEWSLETTER_STATE: { className: 'NewsletterState', useSQLite: true },
      },
      unsafeEphemeralDurableObjects: true,
      bindings: {
        NEWSLETTER_SESSION_SECRET: 'test-only-secret-at-least-thirty-two-bytes',
        RESEND_HANNESDIEM_DE_API_KEY: 'test-only-key',
        RESEND_HANNESDIEM_DE_SEGMENT_ID: 'test-only-segment',
      },
      outboundService: async (request) => {
        outboundUrls.push(request.url)
        assert.equal(request.url, 'https://api.resend.com/emails')
        assert.equal(request.method, 'POST')
        assert.equal(request.headers.get('Authorization'), 'Bearer test-only-key')
        deliveries.push((await request.json()) as Record<string, unknown>)
        if (deliveryStatus === 302)
          return new Response(null, {
            status: 302,
            headers: { Location: 'https://unexpected.example/emails' },
          })
        return Response.json({ id: 'mock-email' })
      },
    }),
  )
  t.after(() => runtime.dispose())

  const initial = await runtime.dispatchFetch('https://example.com/login', {
    headers: { Accept: 'application/json' },
  })
  const { csrfToken } = (await initial.json()) as { csrfToken: string }
  const submit = (email: string) =>
    runtime.dispatchFetch('https://example.com/login', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Origin: 'https://example.com',
        Cookie: initial.headers.get('Set-Cookie')!.split(';')[0],
      },
      body: new URLSearchParams({ email, _csrf: csrfToken }),
    })

  const sent = await submit('test@example.org')
  assert.equal(sent.status, 200)
  assert.equal(((await sent.json()) as { type: string }).type, 'success')
  assert.equal(deliveries.length, 1)
  assert.deepEqual(deliveries[0].to, ['test@example.org'])
  assert.match(String(deliveries[0].html), /Confirm Email/)

  deliveryStatus = 302
  const redirected = await submit('retry@example.org')
  assert.equal(redirected.status, 503)
  assert.equal(((await redirected.json()) as { type: string }).type, 'error')
  assert.equal(deliveries.length, 2)
  assert.deepEqual(outboundUrls, ['https://api.resend.com/emails', 'https://api.resend.com/emails'])

  deliveryStatus = 200
  assert.equal((await submit('retry@example.org')).status, 200)
  assert.equal(deliveries.length, 3)
})
