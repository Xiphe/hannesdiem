import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { test } from 'node:test'
import { request } from '@playwright/test'

test('local preview starts with simulated Circle authentication and provider writes', async (t) => {
  const child = spawn(process.execPath, ['website/development/preview.mjs'], {
    env: { ...process.env, WEBSITE_TEST: 'true', PREVIEW_PORT: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  t.after(async () => {
    if (child.exitCode !== null || child.signalCode !== null) return
    child.kill('SIGTERM')
    await once(child, 'exit')
  })
  let output = ''
  let errors = ''
  child.stderr.on('data', (chunk) => {
    errors += String(chunk)
  })
  const baseURL = await new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Preview did not start')), 20_000)
    child.stdout.on('data', (chunk) => {
      output += String(chunk)
      const port = output.match(/Local preview on port (\d+);/)
      if (port) {
        clearTimeout(timeout)
        resolve(`http://127.0.0.1:${port[1]}`)
      }
    })
    child.once('error', reject)
    child.once('exit', () => {
      clearTimeout(timeout)
      reject(new Error(`Preview exited before starting: ${errors}`))
    })
  })
  const api = await request.newContext({
    baseURL,
    extraHTTPHeaders: { Accept: 'application/json' },
  })
  t.after(() => api.dispose())
  const initial = await api.get('/circle')
  assert.equal(initial.status(), 200)
  const state = await initial.json()
  assert.equal(state.ready, true)
  assert.deepEqual(state.places, [])
  const sent = await api.post('/circle', {
    headers: { Origin: baseURL },
    form: {
      _csrf: state.csrfToken,
      intent: 'verify',
      name: 'Synthetic preview visitor',
      email: 'synthetic-preview@example.org',
      spot: '7',
    },
  })
  assert.equal(sent.status(), 200)
  assert.equal((await sent.json()).confirmationPending, true)
  const email = await api.get('/__preview/email')
  assert.equal(email.status(), 200)
  const html = await email.text()
  const link = html.match(/href="([^"]*\/login\/api\?[^\"]+)"/)?.[1].replaceAll('&amp;', '&')
  assert.ok(link)
  assert.equal(new URL(link).origin, baseURL)
  const confirmed = await api.get(link, { maxRedirects: 0 })
  assert.equal(confirmed.status(), 303)
  const authenticated = await (await api.get('/circle')).json()
  assert.equal(authenticated.email, 'synthetic-preview@example.org')
  const claimed = await api.post('/circle', {
    headers: { Origin: baseURL },
    form: {
      _csrf: authenticated.csrfToken,
      intent: 'claim',
      spot: '7',
      alias: 'Synthetic visitor',
    },
  })
  assert.equal(claimed.status(), 200)
  const claimedState = (await claimed.json()).state
  assert.equal(claimedState.own.spot, 7)
  assert.equal(claimedState.own.alias, 'Synthetic visitor')
})
