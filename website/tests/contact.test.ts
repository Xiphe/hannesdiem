import assert from 'node:assert/strict'
import { test } from 'node:test'
import { contactVcard } from '../app/contact/vcard.ts'
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
  const encoded = html.match(/data:text\/vcard;charset=utf-8,([^"]+)/)![1]
  const vcard = decodeURIComponent(encoded).replaceAll('\r\n ', '')
  assert.match(vcard, /FN:Fixture Person\r\n/)
  assert.match(vcard, /EMAIL;TYPE=INTERNET:retreat@example.org\r\n/)
  assert.doesNotMatch(vcard, /(?:TEL|ADR):|subject=/)
  assert.ok(vcard.includes(site.contact!.signal.href))
  assert.match(vcard, /URL:https:\/\/fixture.example.org\r\n/)
  assert.match(vcard, /PHOTO;ENCODING=b;TYPE=JPEG:c3ludGhldGljLXBob3Rv\r\n/)
  assert.match(html, /class="contact-portrait"/)
  const overlay = await app.fetch(new Request(url, { headers: { 'X-Remix-Target': 'overlay' } }))
  const fragment = await overlay.text()
  assert.doesNotMatch(fragment, /<html/)
  assert.match(fragment, /data-close-overlay/)
  assert.equal(
    (await app.fetch('https://example.org/_contact?email=javascript:alert(1)')).status,
    400,
  )
})

test('vCard escapes values and folds long Unicode lines without adding fields', () => {
  const contact = structuredClone(site.contact!)
  contact.name = 'Fixture, Person;\\\nTEL:private' + 'ä'.repeat(70)
  const vcard = contactVcard(contact, 'fixture@example.org')
  for (const line of vcard.split('\r\n')) assert.ok(new TextEncoder().encode(line).length <= 75)
  assert.match(vcard, /FN:Fixture\\, Person\\;/)
  assert.doesNotMatch(vcard, /\r\nTEL:/)
  assert.ok(vcard.endsWith('END:VCARD\r\n'))
})
