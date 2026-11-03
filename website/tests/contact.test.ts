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
  assert.match(html, /href="\/_contact\.vcf\?email=/)
  assert.match(html, /data-rmx-document/)
  assert.doesNotMatch(html, /download="|href="data:/)
  const fileResponse = await app.fetch(url.replace('/_contact?', '/_contact.vcf?'))
  assert.equal(fileResponse.status, 200)
  assert.equal(fileResponse.headers.get('Content-Type'), 'text/vcard; charset=utf-8')
  assert.equal(fileResponse.headers.get('Content-Disposition'), 'inline; filename="contact.vcf"')
  assert.equal(fileResponse.headers.get('Cache-Control'), 'no-store')
  const vcard = (await fileResponse.text()).replaceAll('\r\n ', '')
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
  for (const email of ['', 'javascript:alert(1)', 'mailto:fixture@example.org\r\nTEL:private']) {
    assert.equal(
      (await app.fetch('https://example.org/_contact.vcf?email=' + encodeURIComponent(email)))
        .status,
      400,
    )
  }
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
