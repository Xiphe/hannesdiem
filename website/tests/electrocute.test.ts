import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createApp } from '../app/router.tsx'
import { createContentSource } from '../app/document-host/index.ts'
import { sessionDocument } from '../app/electrocute/document.ts'
import {
  clock,
  defaultRange,
  parseClock,
  readDrafts,
  readProgress,
  validateSessions,
} from '../app/electrocute/model.ts'
import { contentTheme } from '../app/ui-library/render.ts'
import { defaultTheme } from '../app/theme.ts'
import { documents, site } from './browser-fixture.ts'
import { electroCuteSessions as sessions } from './electrocute-fixture.ts'

test('session links select within an unchanged CMX publication and missing sessions stay 404', async () => {
  const source = documents.electrocute
  const before = structuredClone(source)
  const selected = await sessionDocument(source, 'test-session-1')
  assert.equal(selected?.session.title, 'Test session 01')
  assert.deepEqual(source, before)
  const app = createApp(createContentSource(documents))
  const response = await app.fetch(
    'https://example.org/electrocute/test-session-1?highlight=test-highlight-b',
  )
  assert.equal(response.status, 200)
  const html = await response.text()
  assert.match(html, /<title>Test session 01/)
  assert.match(html, /rel="canonical" href="https:\/\/hannesdiem.de\/electrocute\/test-session-1"/)
  assert.match(html, /Test highlight B/)
  for (const path of ['missing', '%E0%A4%A', 'test%2Fsession'])
    assert.equal((await app.fetch(`https://example.org/electrocute/${path}`)).status, 404)
})

test('long sessions and minute defaults respect real passage boundaries', () => {
  assert.equal(clock(7427), '2:03:47')
  assert.equal(parseClock('2:03:47'), 7427)
  assert.equal(parseClock('1:60'), undefined)
  assert.equal(parseClock('invalid'), undefined)
  assert.deepEqual(defaultRange(90, 96), { start: 90, end: 96 })
  assert.deepEqual(defaultRange(500, 96), { start: 95, end: 96 })
})

test('optional local storage rejects damaged, unknown and completed progress', () => {
  assert.deepEqual(readProgress('not-json', sessions), { positions: {} })
  assert.deepEqual(
    readProgress(
      JSON.stringify({
        positions: {
          'test-session-1': 22,
          'test-session-2': -1,
          'test-session-3': 96,
          unknown: 10,
        },
        latest: 'unknown',
      }),
      sessions,
    ),
    { positions: { 'test-session-1': 22 } },
  )
  assert.deepEqual(readProgress('{"latest":"constructor"}', sessions), { positions: {} })
  const drafts = [
    { id: 'valid', title: 'Test', person: 'Listener', start: 12, end: 50 },
    { id: 'bad', title: 'Test', person: 'Listener', start: 50, end: 12 },
    { id: 'outside', title: 'Test', person: 'Listener', start: 50, end: 120 },
  ]
  assert.deepEqual(readDrafts(JSON.stringify(drafts), 96), [drafts[0]])
})

test('unsafe media URLs and duplicate identities cannot enter a publication', () => {
  assert.doesNotThrow(() => validateSessions(sessions))
  for (const frameRate of [0, -1, Infinity, NaN])
    assert.throws(() => validateSessions([{ ...sessions[0], frameRate }]))
  assert.throws(() => validateSessions([...sessions, sessions[0]]))
  assert.throws(() => validateSessions([{ ...sessions[0], src: 'javascript:alert(1)' }]))
  assert.throws(() => validateSessions([{ ...sessions[0], src: 'http://example.org/video.mp4' }]))
  assert.throws(() => validateSessions([{ ...sessions[0], recordedAt: '2023-02-31' }]))
  assert.throws(() =>
    validateSessions([{ ...sessions[0], src: 'https://example.org/Ignore%20This.mp4' }]),
  )
})

test('ElectroCute retains its palette even when a session supplies another artwork palette', () => {
  assert.equal(
    contentTheme(site, {
      path: '/electrocute/test-session-1',
      document: 'electrocute',
      title: 'Test',
      kind: 'project',
      theme: 'beach',
      image: {
        src: '/fixture.svg',
        width: 1,
        height: 1,
        palette: [{ name: 'Vibrant', hsl: [0.2, 0.5, 0.4] }],
      },
    }),
    defaultTheme,
  )
})

test('Work includes project pages beside releases while release-only collections remain compatible', async () => {
  const app = createApp(createContentSource(documents))
  const html = await (await app.fetch('https://example.org/fixture-release')).text()
  const work = html.slice(html.indexOf('>Work<'))
  assert.match(work, /href="\/electrocute"/)
  assert.match(work, /href="\/fixture-release"/)
})
