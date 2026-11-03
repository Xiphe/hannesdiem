import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createApp } from '../app/router.tsx'
import { createContentSource } from '../app/document-host/index.ts'
import { documents, site } from './browser-fixture.ts'

test('contact card uses publication messaging links and preserves the CTA email', async () => {
  const app = createApp(createContentSource(documents, 'contact-fixture'))
  const url =
    'https://example.org/_contact?email=' +
    encodeURIComponent('mailto:retreat@example.org?subject=Fixture')
  const response = await app.fetch(url)
  const html = await response.text()
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('Cache-Control'), 'no-store')
  assert.match(html, /<html/)
  assert.match(html, /mailto:retreat@example.org\?subject=Fixture/)
  assert.ok(html.includes(site.contact!.signal.href))
  assert.ok(html.includes(site.contact!.telegram.href))
  assert.doesNotMatch(html, /Add contact card|contact-save|contact\.vcf|data:text\/vcard/)
  assert.match(html, /class="contact-portrait"/)
  const overlay = await app.fetch(new Request(url, { headers: { 'X-Remix-Target': 'overlay' } }))
  const fragment = await overlay.text()
  assert.doesNotMatch(fragment, /<html/)
  assert.match(fragment, /data-close-overlay/)
  assert.equal(
    (await app.fetch('https://example.org/_contact?email=javascript:alert(1)')).status,
    400,
  )
  const page = await app.fetch('https://example.org/fixture-contact')
  const pageHtml = await page.text()
  assert.equal((pageHtml.match(/data-contact-modal/g) ?? []).length, 2)
})
