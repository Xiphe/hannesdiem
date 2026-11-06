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

test('QA reads mail without mailbox mutations and ignores other target links', async () => {
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
        scope: 'https://www.googleapis.com/auth/gmail.readonly',
      })
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
  assert.equal(await inbox.waitForLogin(origin, Date.now()), link)
  assert.equal(calls.length, 5)
})

test('QA rejects broader OAuth grants and hides provider response bodies and credentials', async () => {
  await assert.rejects(
    openGmailInbox(credentials, async () =>
      Response.json({ access_token: 'synthetic', scope: 'https://mail.google.com/' }),
    ),
    /only gmail.readonly/,
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
