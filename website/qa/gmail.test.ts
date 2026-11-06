import assert from 'node:assert/strict'
import { test } from 'node:test'
import { findLoginLink, openGmailInbox, type GmailCredentials, type GmailMessage } from './gmail.ts'

const origin = 'https://website.example.test'
const token = 'a'.repeat(64)
const link = `${origin}/login/api?token=${token}`
const since = 1_700_000_000_000
const credentials: GmailCredentials = {
  email: 'qa@example.test',
  name: 'Synthetic QA',
  client_id: 'synthetic-client',
  client_secret: 'synthetic-secret',
  refresh_token: 'synthetic-refresh',
}
function message(text: string, time = since): GmailMessage {
  return {
    internalDate: String(time),
    payload: {
      mimeType: 'multipart/alternative',
      parts: [{ mimeType: 'text/plain', body: { data: Buffer.from(text).toString('base64url') } }],
    },
  }
}

test('QA finds a fresh login link inside multipart mail for exactly the intended origin', () => {
  assert.equal(findLoginLink(message(`Confirm: ${link}`), origin, since), link)
  assert.equal(findLoginLink(message(`Confirm: ${link}`, since - 1), origin, since), undefined)
  for (const invalid of [
    'https://other.example.test/login/api?token=' + token,
    origin + '/other?token=' + token,
    origin + '/login/api?token=invalid',
    'https://user:password@website.example.test/login/api?token=' + token,
  ])
    assert.equal(findLoginLink(message(invalid), origin, since), undefined)
  assert.equal(
    findLoginLink({ internalDate: 'invalid', payload: message(link).payload }, origin, since),
    undefined,
  )
})

test('QA archives only the matched login message when explicitly requested after use', async () => {
  const calls: { url: URL; init: RequestInit }[] = []
  const transport: typeof fetch = async (input, init = {}) => {
    const url = new URL(String(input))
    calls.push({ url, init })
    assert.equal(init.redirect, 'error')
    if (url.pathname === '/token') {
      assert.equal(init.method, 'POST')
      assert.equal(new URLSearchParams(String(init.body)).get('grant_type'), 'refresh_token')
      return Response.json({
        access_token: 'synthetic-access',
        scope: 'https://www.googleapis.com/auth/gmail.modify',
      })
    }
    if (url.pathname.endsWith('/modify')) {
      assert.equal(url.pathname, '/gmail/v1/users/me/messages/this-target/modify')
      assert.equal(init.method, 'POST')
      assert.deepEqual(JSON.parse(String(init.body)), { removeLabelIds: ['INBOX'] })
      return Response.json({ id: 'this-target' })
    }
    assert.equal(init.method ?? 'GET', 'GET')
    if (url.pathname.endsWith('/profile')) return Response.json({ emailAddress: credentials.email })
    if (url.pathname.endsWith('/messages')) {
      assert.match(url.searchParams.get('q')!, /from:hi@hannesdiem\.de/)
      return Response.json({ messages: [{ id: 'other-target' }, { id: 'this-target' }] })
    }
    return Response.json(
      message(
        url.pathname.endsWith('/other-target')
          ? link.replace(origin, 'http://localhost:8787')
          : link,
        Date.now() + 1_000,
      ),
    )
  }
  const inbox = await openGmailInbox(credentials, transport)
  const login = await inbox.waitForLogin(origin, Date.now())
  assert.equal(login.link, link)
  assert.equal(calls.length, 5)
  assert.equal(
    calls.some(({ url }) => url.pathname.endsWith('/modify')),
    false,
  )
  await login.archive()
  assert.equal(calls.length, 6)
  assert.equal(calls.at(-1)!.url.pathname, '/gmail/v1/users/me/messages/this-target/modify')
})

test('QA rejects broader OAuth grants and hides provider response bodies and credentials', async () => {
  for (const scope of [
    'https://mail.google.com/',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.send',
  ])
    await assert.rejects(
      openGmailInbox(credentials, async () => Response.json({ access_token: 'synthetic', scope })),
      /only gmail.modify/,
    )
  await assert.rejects(
    openGmailInbox(
      credentials,
      async () => new Response(credentials.refresh_token, { status: 401 }),
    ),
    (error: Error) =>
      error.message.includes('Gmail request failed') &&
      !error.message.includes(credentials.refresh_token),
  )
})

test('QA reports archive failures without exposing provider responses or tokens', async () => {
  const inbox = await openGmailInbox(credentials, async (input) => {
    const url = new URL(String(input))
    if (url.pathname === '/token')
      return Response.json({
        access_token: 'synthetic-access',
        scope: 'https://www.googleapis.com/auth/gmail.modify',
      })
    if (url.pathname.endsWith('/profile')) return Response.json({ emailAddress: credentials.email })
    if (url.pathname.endsWith('/messages'))
      return Response.json({ messages: [{ id: 'matched-message' }] })
    if (url.pathname.endsWith('/modify'))
      return new Response('synthetic-access ' + credentials.refresh_token, { status: 403 })
    return Response.json(message(link, Date.now() + 1_000))
  })
  const login = await inbox.waitForLogin(origin, Date.now())
  await assert.rejects(
    login.archive(),
    (error: Error) =>
      error.message.includes('Gmail request failed') &&
      !error.message.includes('synthetic-access') &&
      !error.message.includes(credentials.refresh_token),
  )
})
