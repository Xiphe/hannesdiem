import assert from 'node:assert/strict'
import { test } from 'node:test'
import { build } from 'esbuild'
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'
import { Webhook } from 'standardwebhooks'
import { circleTopic } from './contract.ts'
import { templeTopic, templeSegment } from '../newsletter/temple-config.ts'

async function harness() {
  const compiled = await build({
    stdin: {
      contents: `
    import {handleNewsletter} from './website/app/newsletter/http.ts';
    import {handleCircleWebhook} from './website/app/circle/webhook.ts';
    export {NewsletterState} from './website/app/newsletter/cloudflare.ts';
    export {CircleState} from './website/app/circle/cloudflare.ts';
    export default {async fetch(request,env){return await handleCircleWebhook(request,env) ?? await handleNewsletter(request,env) ?? new Response(null,{status:404})}};
  `,
      resolveDir: process.cwd(),
      sourcefile: 'synthetic-circle-worker.ts',
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
  const contacts = new Map<
    string,
    { unsubscribed: boolean; first_name: string; subscribed: boolean; templeSubscribed?: boolean }
  >()
  const emails: {
    text: string
    subject: string
    reply_to?: string
    to: string[]
    key: string | null
  }[] = []
  let failUnsubscribe = false
  let failReleaseNotification = false
  const secret = 'whsec_' + Buffer.from('synthetic-webhook-secret-for-tests').toString('base64')
  const mf = new Miniflare(
    convertV4MiniflareOptions({
      modules: true,
      script: compiled.outputFiles[0].text,
      compatibilityDate: '2026-10-18',
      durableObjects: {
        NEWSLETTER_STATE: { className: 'NewsletterState', useSQLite: true },
        CIRCLE_STATE: { className: 'CircleState', useSQLite: true },
      },
      bindings: {
        NEWSLETTER_SESSION_SECRET: 'synthetic-session-secret-thirty-two-characters',
        RESEND_HANNESDIEM_DE_API_KEY: 'synthetic-resend-key',
        RESEND_HANNESDIEM_DE_SEGMENT_ID: 'synthetic-segment',
        RESEND_CIRCLE_WEBHOOK_SECRET: secret,
      },
      outboundService: async (request) => {
        const url = new URL(request.url)
        assert.equal(url.origin, 'https://api.resend.com')
        const raw = request.method === 'GET' ? '' : await request.text()
        const body = raw ? (JSON.parse(raw) as Record<string, unknown>) : undefined
        if (url.pathname === '/emails') {
          if (
            failReleaseNotification &&
            request.headers.get('Idempotency-Key')?.startsWith('circle-release-')
          )
            return new Response(null, { status: 503 })
          emails.push({
            ...(body as { text: string; subject: string; reply_to?: string; to: string[] }),
            key: request.headers.get('Idempotency-Key'),
          })
          return Response.json({ id: 'synthetic-mail' })
        }
        if (url.pathname === '/contacts') {
          contacts.set(String(body!.email), {
            unsubscribed: false,
            first_name: String(body!.first_name ?? ''),
            subscribed: ((body!.topics ?? []) as { id: string; subscription: string }[]).some(
              (topic) => topic.id === circleTopic && topic.subscription === 'opt_in',
            ),
            templeSubscribed: ((body!.topics ?? []) as { id: string; subscription: string }[]).some(
              (topic) => topic.id === templeTopic && topic.subscription === 'opt_in',
            ),
          })
          return Response.json({ id: 'synthetic-contact' })
        }
        const match = url.pathname.match(/^\/contacts\/([^/]+)(.*)$/)
        assert.ok(match)
        const email = decodeURIComponent(match[1])
        const contact = contacts.get(email)
        if (!contact) return Response.json({ error: 'not_found' }, { status: 404 })
        if (request.method === 'GET' && match[2] === '/segments')
          return Response.json({ data: [{ id: templeSegment }], has_more: false })
        if (request.method === 'GET')
          return Response.json(
            match[2] === '/topics'
              ? {
                  data: [
                    { id: circleTopic, subscription: contact.subscribed ? 'opt_in' : 'opt_out' },
                    {
                      id: templeTopic,
                      subscription: contact.templeSubscribed ? 'opt_in' : 'opt_out',
                    },
                  ],
                  has_more: false,
                }
              : contact,
          )
        if (match[2] === '/topics') {
          const change = body as unknown as { id: string; subscription: string }[]
          assert.ok([circleTopic, templeTopic].includes(change[0].id))
          if (failUnsubscribe && change[0].subscription === 'opt_out')
            return new Response(null, { status: 503 })
          if (change[0].id === circleTopic) contact.subscribed = change[0].subscription === 'opt_in'
          else contact.templeSubscribed = change[0].subscription === 'opt_in'
        } else if (!match[2]) {
          if (body!.unsubscribed !== undefined) contact.unsubscribed = Boolean(body!.unsubscribed)
          if (body!.first_name !== undefined) contact.first_name = String(body!.first_name)
        }
        return Response.json({ id: 'synthetic-contact' })
      },
    }),
  )
  const request = (path: string, init?: Parameters<Miniflare['dispatchFetch']>[1]) =>
    mf.dispatchFetch(`https://example.org${path}`, init)
  const read = async (cookie?: string) => {
    const response = await request('/circle', {
      headers: { Accept: 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    })
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('Cache-Control'), 'no-store')
    return {
      state: (await response.json()) as {
        csrfToken: string
        places: { spot: number; alias: string }[]
        unavailable: number[]
        email?: string
        name?: string
        waiting?: boolean
        reactivation?: boolean
        own?: { spot: number; alias: string }
      },
      cookie: response.headers.getSetCookie()[0]?.split(';')[0] ?? cookie!,
    }
  }
  const submit = (cookie: string, csrfToken: string, fields: Record<string, string>) =>
    request('/circle', {
      method: 'POST',
      headers: { Accept: 'application/json', Origin: 'https://example.org', Cookie: cookie },
      body: new URLSearchParams({ _csrf: csrfToken, ...fields }),
    })
  const signIn = async (email: string, spot = 1) => {
    const initial = await read()
    const sent = await submit(initial.cookie, initial.state.csrfToken, {
      intent: 'verify',
      name: 'Fixture private name',
      email,
      spot: String(spot),
    })
    assert.equal(sent.status, 200)
    const text = emails.findLast((e) => e.to.includes(email))!.text
    const link = text.match(/(?:Confirm interest|Login): (https:\/\/\S+)/)![1]
    const confirmed = await mf.dispatchFetch(link, { redirect: 'manual' })
    assert.equal(confirmed.status, 303)
    assert.match(confirmed.headers.get('Location')!, /#share$/)
    const cookie = confirmed.headers.getSetCookie()[0].split(';')[0]
    return read(cookie)
  }
  const webhook = (event: unknown, valid = true) => {
    const raw = JSON.stringify(event),
      id = 'synthetic-event',
      time = new Date()
    return request('/circle/webhook', {
      method: 'POST',
      headers: {
        'svix-id': id,
        'svix-timestamp': String(Math.floor(+time / 1000)),
        'svix-signature': valid ? new Webhook(secret).sign(id, time, raw) : 'v1,invalid',
      },
      body: raw,
    })
  }
  return {
    request,
    read,
    submit,
    signIn,
    webhook,
    contacts,
    emails,
    async remove(spot: number) {
      const bindings = await mf.getBindings<{ CIRCLE_STATE: DurableObjectNamespace }>()
      return bindings.CIRCLE_STATE.getByName('temple-circle').fetch(
        'https://circle.internal/remove',
        {
          method: 'POST',
          body: JSON.stringify({ spot }),
        },
      )
    },
    dispose: () => mf.dispose(),
    setFailUnsubscribe(value: boolean) {
      failUnsubscribe = value
    },
    setFailReleaseNotification(value: boolean) {
      failReleaseNotification = value
    },
  }
}

test('verified claim uses shared auth, keeps alias private until confirmation, then emails and publishes it', async () => {
  const h = await harness()
  try {
    const user = await h.signIn('one@example.org')
    assert.equal((await h.read()).state.places.length, 0)
    const claimed = await h.submit(user.cookie, user.state.csrfToken, {
      intent: 'claim',
      spot: '1',
      alias: '<Public alias>',
    })
    assert.equal(claimed.status, 200)
    assert.deepEqual((await h.read()).state.places, [{ spot: 1, alias: '<Public alias>' }])
    assert.equal((await h.read()).state.email, undefined)
    assert.equal(h.emails.filter((e) => e.to.includes('sound@hannesdiem.de')).length, 1)
    assert.match(h.emails.at(-1)!.text, /one@example.org/)
    const own = await h.read(user.cookie)
    await h.submit(own.cookie, own.state.csrfToken, {
      intent: 'claim',
      spot: '2',
      alias: 'Ignored second place',
    })
    assert.equal((await h.read()).state.places.length, 1)
    assert.equal(h.emails.filter((e) => e.to.includes('sound@hannesdiem.de')).length, 1)
    const renamed = await h.submit(own.cookie, own.state.csrfToken, {
      intent: 'rename',
      spot: '1',
      alias: 'New alias',
    })
    assert.equal(renamed.status, 200)
    assert.equal(h.contacts.get('one@example.org')!.first_name, 'Fixture private name')
    const html = await h.request('/circle', { headers: { Cookie: own.cookie } })
    assert.match(await html.text(), /New alias/)
    const forgery = await h.submit(own.cookie, 'invalid', { intent: 'release' })
    assert.equal(forgery.status, 403)
    assert.equal((await h.read()).state.places.length, 1)
    const released = await h.submit(own.cookie, own.state.csrfToken, { intent: 'release' })
    assert.equal(released.status, 200)
    assert.equal(h.contacts.get('one@example.org')!.subscribed, false)
    assert.equal((await h.read()).state.places.length, 0)
    assert.deepEqual((await h.read()).state.unavailable, [1])
    assert.equal((await h.read(own.cookie)).state.own, undefined)
    const releaseMail = h.emails.at(-1)!
    assert.deepEqual(releaseMail.to, ['sound@hannesdiem.de'])
    assert.equal(releaseMail.reply_to, 'one@example.org')
    assert.equal(releaseMail.subject, 'Temple of Sound — circle release intent')
    assert.match(releaseMail.text, /New alias\none@example.org\nSpot 1\nRelease requested/)
    assert.match(releaseMail.key!, /^circle-release-/)
    const claimMail = h.emails.find((e) => e.key?.startsWith('circle-claim-'))!
    assert.equal(
      releaseMail.key!.replace('circle-release-', ''),
      claimMail.key!.replace('circle-claim-', ''),
    )
    await h.submit(own.cookie, own.state.csrfToken, { intent: 'release' })
    assert.equal(h.emails.filter((e) => e.key?.startsWith('circle-release-')).length, 1)
    const other = await h.signIn('other@example.org')
    const replacement = await h.submit(other.cookie, other.state.csrfToken, {
      intent: 'claim',
      spot: '1',
      alias: 'Other',
    })
    assert.equal(replacement.status, 200)
    assert.equal((await h.read(other.cookie)).state.own?.spot, 2)
  } finally {
    await h.dispose()
  }
})

test('simultaneous real Durable Object requests cannot reserve the same place twice', async () => {
  const h = await harness()
  try {
    const a = await h.signIn('one@example.org'),
      b = await h.signIn('two@example.org')
    const responses = await Promise.all([
      h.submit(a.cookie, a.state.csrfToken, { intent: 'claim', spot: '4', alias: 'Same' }),
      h.submit(b.cookie, b.state.csrfToken, { intent: 'claim', spot: '4', alias: 'Same' }),
    ])
    assert.deepEqual(
      responses.map((r) => r.status),
      [200, 200],
    )
    const places = (await h.read()).state.places
    assert.equal(places.length, 2)
    assert.equal(new Set(places.map((place) => place.spot)).size, 2)
    assert.equal(h.emails.filter((e) => e.to.includes('sound@hannesdiem.de')).length, 2)
  } finally {
    await h.dispose()
  }
})

test('native circle fallback selects a free place when the preferred place was taken', async () => {
  const h = await harness()
  try {
    const owner = await h.signIn('owner@example.org')
    await h.submit(owner.cookie, owner.state.csrfToken, {
      intent: 'claim',
      spot: '1',
      alias: 'Owner',
    })
    const visitor = await h.signIn('visitor@example.org')
    const response = await h.request('/circle?spot=1', { headers: { Cookie: visitor.cookie } })
    assert.equal(response.status, 200)
    const html = await response.text()
    assert.match(html, /name="spot" value="2"/)
  } finally {
    await h.dispose()
  }
})

test('signed external opt-out releases, partial updates and stale replays preserve a current claim', async () => {
  const h = await harness()
  try {
    const user = await h.signIn('one@example.org')
    await h.submit(user.cookie, user.state.csrfToken, { intent: 'claim', spot: '1', alias: 'One' })
    const event = {
      type: 'contact.topics.updated',
      data: { email: 'one@example.org', topics: [{ id: circleTopic, subscription: 'opt_out' }] },
    }
    assert.equal((await h.webhook(event, false)).status, 400)
    assert.equal((await h.read()).state.places.length, 1)
    const unrelated = {
      type: 'contact.topics.updated',
      data: {
        email: 'one@example.org',
        topics: [{ id: 'synthetic-other-topic', subscription: 'opt_out' }],
      },
    }
    h.contacts.get('one@example.org')!.subscribed = false
    assert.equal((await h.webhook(unrelated)).status, 204)
    assert.equal((await h.read()).state.places.length, 1)
    assert.equal((await h.webhook(event)).status, 204)
    assert.equal((await h.read()).state.places.length, 0)
    assert.deepEqual((await h.read()).state.unavailable, [1])
    assert.equal(h.emails.filter((e) => e.key?.startsWith('circle-release-')).length, 1)
    assert.equal((await h.remove(1)).status, 204)
    // Only the private operator control clears the hold; a later explicit claim
    // then remains safe from stale opt-out events for the same identity.
    const current = user
    await h.submit(current.cookie, current.state.csrfToken, {
      intent: 'claim',
      spot: '2',
      alias: 'One',
    })
    assert.equal((await h.webhook(event)).status, 204)
    assert.equal((await h.read()).state.places[0].spot, 2)
    h.setFailUnsubscribe(true)
    assert.equal(
      (await h.submit(current.cookie, current.state.csrfToken, { intent: 'release' })).status,
      200,
    )
    assert.equal((await h.read()).state.places.length, 0)
    assert.deepEqual((await h.read()).state.unavailable, [2])
    assert.equal(h.emails.filter((e) => e.key?.startsWith('circle-release-')).length, 2)
    h.setFailUnsubscribe(false)
    assert.equal(
      (await h.submit(current.cookie, current.state.csrfToken, { intent: 'release' })).status,
      200,
    )
    assert.equal((await h.read()).state.places.length, 0)
    assert.deepEqual((await h.read()).state.unavailable, [2])
  } finally {
    await h.dispose()
  }
})

test('release email failure preserves the private intent and capacity hold until a retry succeeds', async () => {
  const h = await harness()
  try {
    const user = await h.signIn('one@example.org')
    await h.submit(user.cookie, user.state.csrfToken, { intent: 'claim', spot: '1', alias: 'One' })
    h.setFailReleaseNotification(true)
    const released = await h.submit(user.cookie, user.state.csrfToken, { intent: 'release' })
    assert.equal(released.status, 200)
    assert.equal((await h.read(user.cookie)).state.own, undefined)
    assert.deepEqual((await h.read()).state.places, [])
    assert.deepEqual((await h.read()).state.unavailable, [1])
    assert.equal(h.emails.filter((e) => e.key?.startsWith('circle-release-')).length, 0)
    h.setFailReleaseNotification(false)
    await h.submit(user.cookie, user.state.csrfToken, { intent: 'release' })
    assert.equal(h.emails.filter((e) => e.key?.startsWith('circle-release-')).length, 1)
    assert.deepEqual((await h.read()).state.unavailable, [1])
  } finally {
    await h.dispose()
  }
})

test('globally unsubscribed contact explicitly verifies again before claiming, without renaming their contact', async () => {
  const h = await harness()
  try {
    h.contacts.set('one@example.org', {
      first_name: 'Private contact name',
      subscribed: false,
      unsubscribed: true,
    })
    const user = await h.signIn('one@example.org')
    assert.equal(user.state.reactivation, false)
    assert.equal(h.contacts.get('one@example.org')!.unsubscribed, true)
    assert.equal(
      (
        await h.submit(user.cookie, user.state.csrfToken, {
          intent: 'claim',
          spot: '1',
          alias: 'Public alias',
        })
      ).status,
      200,
    )
    assert.equal(h.contacts.get('one@example.org')!.first_name, 'Private contact name')
    assert.equal(h.contacts.get('one@example.org')!.unsubscribed, false)
    h.contacts.get('one@example.org')!.unsubscribed = true
    assert.equal(
      (
        await h.webhook({
          type: 'contact.updated',
          data: { email: 'one@example.org', unsubscribed: true },
        })
      ).status,
      204,
    )
    assert.equal((await h.read()).state.places.length, 0)
    const renewedClaim = await h.submit(user.cookie, user.state.csrfToken, {
      intent: 'claim',
      spot: '2',
      alias: 'Public alias',
    })
    assert.equal(renewedClaim.status, 409, 'a later global opt-out requires fresh confirmation')
    assert.equal(h.contacts.get('one@example.org')!.unsubscribed, true)
  } finally {
    await h.dispose()
  }
})

test('Watch and Share reuse verified identity while keeping their subscriptions and private name independent', async () => {
  const h = await harness()
  try {
    const watch = async (cookie?: string) => {
      const response = await h.request('/newsletter/temple', {
        headers: { Accept: 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
      })
      assert.equal(response.status, 200)
      return {
        state: (await response.json()) as {
          csrfToken: string
          email?: string
          name?: string
          waiting?: boolean
          subscribed?: boolean
        },
        cookie: response.headers.getSetCookie()[0]?.split(';')[0] ?? cookie!,
      }
    }
    const toggle = (cookie: string, csrfToken: string, fields: Record<string, string>) =>
      h.request('/newsletter/temple', {
        method: 'POST',
        headers: { Accept: 'application/json', Origin: 'https://example.org', Cookie: cookie },
        body: new URLSearchParams({ _csrf: csrfToken, ...fields }),
      })
    const initial = await watch()
    const sent = await toggle(initial.cookie, initial.state.csrfToken, {
      intent: 'subscribe',
      name: 'Synthetic private name',
      email: 'combined@example.org',
    })
    assert.equal(sent.status, 200)
    assert.equal(h.contacts.size, 0)
    const link = h.emails.at(-1)!.text.match(/https:\/\/example\.org\/login\/api\?\S+/)![0]
    const confirmed = await h.request(new URL(link).pathname + new URL(link).search, {
      redirect: 'manual',
    })
    assert.equal(confirmed.status, 303)
    const cookie = confirmed.headers.getSetCookie()[0].split(';')[0]
    const user = await h.read(cookie)
    assert.equal(user.state.email, 'combined@example.org')
    assert.equal(user.state.own, undefined)
    assert.equal(h.contacts.get('combined@example.org')!.subscribed, false)
    const claimed = await h.submit(user.cookie, user.state.csrfToken, {
      intent: 'claim',
      spot: '3',
      alias: 'Synthetic alias',
    })
    assert.equal(claimed.status, 200)
    assert.equal(h.emails.length, 2, 'shared identity needs no second verification email')
    assert.equal(h.contacts.get('combined@example.org')!.first_name, 'Synthetic private name')
    const subscribed = await watch(cookie)
    assert.equal(subscribed.state.subscribed, true)
    assert.equal(
      (await toggle(cookie, subscribed.state.csrfToken, { intent: 'unsubscribe' })).status,
      200,
    )
    assert.equal((await h.read()).state.places.length, 1)
    assert.equal(h.contacts.get('combined@example.org')!.subscribed, true)
    assert.equal(h.contacts.get('combined@example.org')!.templeSubscribed, false)
    assert.equal(
      (
        await toggle(cookie, subscribed.state.csrfToken, {
          intent: 'subscribe',
          name: 'Synthetic private name',
        })
      ).status,
      200,
    )
    assert.equal(
      (await h.submit(user.cookie, user.state.csrfToken, { intent: 'release' })).status,
      200,
    )
    assert.equal(h.contacts.get('combined@example.org')!.subscribed, false)
    assert.equal((await watch(cookie)).state.subscribed, true)
    assert.equal((await h.read()).state.places.length, 0)
  } finally {
    await h.dispose()
  }
})

test('verified private names prefill aliases, and moving retains one reservation without another notification', async () => {
  const h = await harness()
  try {
    const user = await h.signIn('profile@example.org', 6)
    assert.equal(user.state.name, 'Fixture private name')
    assert.equal(h.contacts.get('profile@example.org')!.subscribed, false)
    const invalid = await h.submit(user.cookie, user.state.csrfToken, {
      intent: 'claim',
      spot: '6',
      alias: 'x'.repeat(21),
    })
    assert.equal(invalid.status, 400)
    assert.equal((await h.read()).state.places.length, 0)
    assert.equal(
      (
        await h.submit(user.cookie, user.state.csrfToken, {
          intent: 'claim',
          spot: '6',
          alias: 'Public alias',
        })
      ).status,
      200,
    )
    assert.equal(
      (await h.submit(user.cookie, user.state.csrfToken, { intent: 'move', spot: '8' })).status,
      200,
    )
    assert.deepEqual((await h.read(user.cookie)).state.own, { spot: 8, alias: 'Public alias' })
    assert.equal(h.emails.filter((e) => e.to.includes('sound@hannesdiem.de')).length, 1)
    assert.equal(h.contacts.get('profile@example.org')!.first_name, 'Fixture private name')
    const anonymous = await h.read()
    assert.equal(
      (await h.submit(anonymous.cookie, anonymous.state.csrfToken, { intent: 'move', spot: '9' }))
        .status,
      401,
    )
  } finally {
    await h.dispose()
  }
})

test('a verified visitor can register full-circle interest without a Circle subscription or public alias', async () => {
  const h = await harness()
  try {
    for (let spot = 1; spot <= 10; spot++) {
      const user = await h.signIn(`fixture${spot}@example.org`, spot)
      assert.equal(
        (
          await h.submit(user.cookie, user.state.csrfToken, {
            intent: 'claim',
            spot: String(spot),
            alias: `Fixture ${spot}`,
          })
        ).status,
        200,
      )
    }
    const waiting = await h.signIn('waiting@example.org')
    for (let repeat = 0; repeat < 2; repeat++) {
      assert.equal(
        (
          await h.submit(waiting.cookie, waiting.state.csrfToken, {
            intent: 'claim',
            spot: '1',
            alias: 'Private waiting name',
          })
        ).status,
        200,
      )
    }
    assert.equal((await h.read(waiting.cookie)).state.waiting, true)
    assert.equal((await h.read()).state.waiting, false)
    assert.equal((await h.read()).state.places.length, 10)
    assert.equal(h.contacts.get('waiting@example.org')!.subscribed, false)
    const notices = h.emails.filter(
      (e) => e.to.includes('sound@hannesdiem.de') && e.text.includes('waiting@example.org'),
    )
    assert.equal(notices.length, 1)
    assert.match(notices[0].text, /Waiting list/)
  } finally {
    await h.dispose()
  }
})

test('circle verification asks for a missing name, preserves a known profile, and keeps the chosen spot', async () => {
  const h = await harness()
  try {
    for (const existing of [false, true]) {
      const email = existing ? 'legacy@example.org' : 'new@example.org'
      if (existing)
        h.contacts.set(email, { first_name: ' ', unsubscribed: false, subscribed: false })
      const initial = await h.read()
      const fields = { intent: 'verify', email, spot: '4' }
      const before = h.emails.length
      const next = await h.submit(initial.cookie, initial.state.csrfToken, fields)
      assert.equal(next.status, 200)
      assert.equal(((await next.json()) as { nameRequired: boolean }).nameRequired, true)
      assert.equal(h.emails.length, before)
      assert.equal(h.contacts.get(email)?.first_name, existing ? ' ' : undefined)
      const invalid = await h.submit(initial.cookie, initial.state.csrfToken, {
        ...fields,
        name: ' ',
      })
      assert.equal(invalid.status, 400)
      const sent = await h.submit(initial.cookie, initial.state.csrfToken, {
        ...fields,
        name: ' Private name ',
      })
      assert.equal(sent.status, 200)
      assert.equal(h.emails.length, before + 1)
      assert.equal(h.contacts.get(email)?.first_name, existing ? ' ' : undefined)
      const link = h.emails.at(-1)!.text.match(/https:\/\/example\.org\/login\/api\?\S+/)![0]
      const confirmed = await h.request(new URL(link).pathname + new URL(link).search, {
        redirect: 'manual',
      })
      assert.equal(
        confirmed.headers.get('Location'),
        '/temple-of-sound?circle=confirmed&spot=4#share',
      )
      assert.equal(h.contacts.get(email)!.first_name, 'Private name')
      assert.equal(h.contacts.get(email)!.subscribed, false)
    }
    const email = 'known@example.org'
    h.contacts.set(email, {
      first_name: 'Saved private name',
      unsubscribed: false,
      subscribed: false,
    })
    const initial = await h.read()
    const sent = await h.submit(initial.cookie, initial.state.csrfToken, {
      intent: 'verify',
      email,
      spot: '6',
    })
    assert.equal(sent.status, 200)
    assert.equal(
      ((await sent.json()) as { confirmationPending: boolean }).confirmationPending,
      true,
    )
    assert.match(h.emails.at(-1)!.text, /Hey Saved private name,/)
    const link = h.emails.at(-1)!.text.match(/https:\/\/example\.org\/login\/api\?\S+/)![0]
    await h.request(new URL(link).pathname + new URL(link).search, { redirect: 'manual' })
    assert.equal(h.contacts.get(email)!.first_name, 'Saved private name')
  } finally {
    await h.dispose()
  }
})

test('native circle verification preserves the entered email and spot in the name step', async () => {
  const h = await harness()
  try {
    const initial = await h.read()
    const next = await h.request('/circle', {
      method: 'POST',
      headers: { Origin: 'https://example.org', Cookie: initial.cookie },
      body: new URLSearchParams({
        email: 'new@example.org',
        spot: '5',
        intent: 'verify',
        _csrf: initial.state.csrfToken,
      }),
    })
    assert.equal(next.status, 200)
    const html = await next.text()
    assert.match(html, /name="name"[^>]*required/)
    assert.match(html, /name="email"[^>]*value="new@example.org"/)
    assert.match(html, /name="spot" value="5"/)
    assert.equal(h.emails.length, 0)
  } finally {
    await h.dispose()
  }
})
