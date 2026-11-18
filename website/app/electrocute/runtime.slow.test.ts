import assert from 'node:assert/strict'
import { test } from 'node:test'
import { build } from 'esbuild'
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'
import { createCookie } from 'remix/cookie'
import type { HighlightState } from './contract.ts'

async function harness() {
  const compiled = await build({
    stdin: {
      contents: `
        import {createContentSource} from './website/app/document-host/index.ts';
        import {handleHighlights} from './website/app/electrocute/http.ts';
        import {documents} from './website/tests/browser-fixture.ts';
        export {NewsletterState} from './website/app/newsletter/cloudflare.ts';
        export {ElectroCuteState} from './website/app/electrocute/cloudflare.ts';
        const load=createContentSource(documents);
        export default {async fetch(request,env){return await handleHighlights(request,{...env,CIRCLE_STATE:{getByName:()=>env.CIRCLE_FIXTURE}},load) ?? new Response(null,{status:404})}};
      `,
      resolveDir: process.cwd(),
      sourcefile: 'synthetic-highlight-worker.ts',
      loader: 'ts',
    },
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    external: ['cloudflare:workers'],
    jsx: 'automatic',
    jsxImportSource: 'remix/component',
  })
  const secret = 'synthetic-highlight-session-secret'
  const circleCalls: string[] = []
  const mf = new Miniflare(
    convertV4MiniflareOptions({
      modules: true,
      script: compiled.outputFiles[0].text,
      compatibilityDate: '2026-10-18',
      durableObjects: {
        NEWSLETTER_STATE: { className: 'NewsletterState', useSQLite: true },
        ELECTROCUTE_STATE: { className: 'ElectroCuteState', useSQLite: true },
      },
      bindings: {
        NEWSLETTER_SESSION_SECRET: secret,
        ELECTROCUTE_ARTIST_EMAIL: 'artist@example.org',
      },
      // Narrow read-only Circle suggestion fixture, no Resend or subscriptions.
      serviceBindings: {
        CIRCLE_FIXTURE: async (request) => {
          circleCalls.push(new URL(request.url).pathname)
          return Response.json({ places: [], own: { spot: 1, alias: 'Circle fixture alias' } })
        },
      },
      outboundService: async () => {
        throw new Error('Unexpected external request')
      },
    }),
  )
  await mf.ready
  const path = '/electrocute-api/test-session-1'
  const request = (suffix = path, init?: Parameters<typeof mf.dispatchFetch>[1]) =>
    mf.dispatchFetch(`https://example.org${suffix}`, init)
  async function identity(email?: string) {
    let cookie: string | undefined
    if (email) {
      const id = crypto.randomUUID()
      const bindings = await mf.getBindings<{ NEWSLETTER_STATE: DurableObjectNamespace }>()
      const seeded = await bindings.NEWSLETTER_STATE.getByName('newsletter').fetch(
        `https://newsletter.internal/sessions/${id}`,
        {
          method: 'PUT',
          body: JSON.stringify({ data: [{ email }, {}] }),
        },
      )
      assert.equal(seeded.status, 204)
      cookie = (await createCookie('hdm_user_session', { secrets: [secret] }).serialize(id)).split(
        ';',
      )[0]
    }
    const response = await request(path, {
      headers: { Accept: 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    })
    assert.equal(response.status, 200)
    const state = (await response.json()) as HighlightState
    cookie = response.headers.getSetCookie()[0]?.split(';')[0] ?? cookie!
    return { cookie, state }
  }
  const submit = (
    user: Awaited<ReturnType<typeof identity>>,
    payload: object,
    intent = 'save',
    override: Record<string, string> = {},
  ) =>
    request(path, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Origin: 'https://example.org',
        Cookie: user.cookie,
        ...override,
      },
      body: new URLSearchParams({
        _csrf: user.state.csrfToken!,
        intent,
        payload: JSON.stringify(payload),
      }),
    })
  return { request, identity, submit, mf, circleCalls }
}
const data = () => ({
  id: crypto.randomUUID(),
  title: 'Runtime synthetic passage',
  alias: 'Public fixture',
  start: 10,
  end: 40,
})

test('runtime API uses the shared verified session, private responses, CSRF and server-resolved roles and bounds', async () => {
  const h = await harness()
  try {
    const anonymous = await h.identity()
    assert.equal(anonymous.state.email, undefined)
    assert.equal((await h.submit(anonymous, data())).status, 401)
    const artist = await h.identity('artist@example.org')
    assert.equal(artist.state.artist, true)
    const clip = data()
    const saved = await h.submit(artist, clip)
    assert.equal(saved.status, 200)
    assert.equal(saved.headers.get('Cache-Control'), 'no-store')
    assert.equal(((await saved.json()) as HighlightState).highlights[0].status, 'approved')
    const visitor = await h.identity('visitor@example.org')
    assert.equal(visitor.state.highlights[0].canEdit, false)
    assert.equal(
      (
        await h.submit(visitor, {
          ...clip,
          revision: 1,
          artist: true,
          owner: 'visitor@example.org',
        })
      ).status,
      403,
    )
    assert.equal((await h.submit(artist, { ...data(), end: 200, duration: 9999 })).status, 400)
    assert.equal(
      (
        await h.submit(artist, { id: clip.id, revision: 1 }, 'hide', {
          Origin: 'https://attacker.example.org',
        })
      ).status,
      403,
    )
    const badToken = { ...artist, state: { ...artist.state, csrfToken: 'forged' } }
    const denied = await h.submit(badToken, { id: clip.id, revision: 1 }, 'hide')
    assert.equal(denied.status, 403)
    assert.equal(denied.headers.get('X-Hdm-Csrf-Rejected'), 'invalid-token')
    assert.equal((await h.submit(artist, { id: clip.id, revision: 1 }, 'hide')).status, 200)
    assert.equal((await h.identity()).state.highlights.length, 0)
    assert.equal((await h.submit(artist, { id: clip.id, revision: 2 }, 'restore')).status, 200)
    const publicState = (await h.identity()).state
    assert.equal(publicState.highlights.length, 1)
    assert.ok(!JSON.stringify(publicState).includes('artist@example.org'))
    assert.equal((await h.request('/electrocute-api/not-a-session')).status, 404)
    assert.equal(
      (
        await h.request('/electrocute-api/test-session-1', {
          method: 'POST',
          headers: {
            Origin: 'https://example.org',
            Cookie: artist.cookie,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: 'payload=' + 'x'.repeat(5000),
        })
      ).status,
      413,
    )
  } finally {
    await h.mf.dispose()
  }
})

test('missing model binding persists private contributions and confirmed aliases never use private contact names', async () => {
  const h = await harness()
  try {
    const user = await h.identity('visitor@example.org')
    assert.equal(user.state.suggestedAlias, 'Circle fixture alias')
    assert.deepEqual(h.circleCalls, ['/view'])
    const clip = data()
    const saved = await h.submit(user, clip)
    assert.equal(saved.status, 200)
    const pending = (await saved.json()) as HighlightState
    assert.equal(pending.highlights[0].status, 'pending')
    assert.equal(pending.highlights[0].own, true)
    assert.equal(pending.alias, undefined, 'unreviewed name is not a confirmed profile alias')
    assert.equal((await h.identity()).state.highlights.length, 0)
    assert.equal((await h.identity('visitor@example.org')).state.highlights[0].id, clip.id)
    const artist = await h.identity('artist@example.org')
    await h.submit(artist, data())
    assert.equal((await h.identity('artist@example.org')).state.alias, 'Public fixture')
    assert.equal(
      (await h.submit(user, { ...clip, revision: 1, title: 'Corrected fixture' })).status,
      200,
    )
    assert.equal(
      (await h.submit(user, { ...clip, revision: 1, title: 'Stale fixture' })).status,
      409,
    )
  } finally {
    await h.mf.dispose()
  }
})
