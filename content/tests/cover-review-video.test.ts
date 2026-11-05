import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { searchRendition, serveSearchVideo } from '../development/cover-review-video.ts'
import { stepFrame } from '../development/cover-review/transport.js'

test('scene search selects the smallest rendition and preserves its frame rate', () => {
  const source = 'https://example.invalid/synthetic/manifest/video.m3u8'
  const manifest =
    '#EXTM3U\n#EXT-X-STREAM-INF:RESOLUTION=1080x1920,FRAME-RATE=60.000\nlarge.m3u8\n#EXT-X-STREAM-INF:RESOLUTION=240x426,FRAME-RATE=30.000\nsmall.m3u8\n'
  assert.deepEqual(searchRendition(manifest, source), {
    url: 'https://example.invalid/synthetic/manifest/small.m3u8',
    pixels: 240 * 426,
    frameRate: 30,
  })
  assert.throws(() => searchRendition('#EXTM3U', source), /rendition/)
})

test('frame stepping uses the latest playhead and remains stable at subsecond boundaries', () => {
  assert.equal(stepFrame(10.017, 1, 30, 20), 301 / 30)
  assert.equal(stepFrame(10.017, -1, 30, 20), 10)
  assert.equal(stepFrame(0, -1, 30, 20), 0)
  assert.equal(stepFrame(19.999, 1, 30, 20), 599 / 30)
  let time = 10
  for (let count = 0; count < 30; count++) time = Math.round(stepFrame(time, 1, 30, 20) * 1e6) / 1e6
  assert.equal(time, 11)
  for (let count = 0; count < 30; count++)
    time = Math.round(stepFrame(time, -1, 30, 20) * 1e6) / 1e6
  assert.equal(time, 10)
})

test('cached search video supports native seek ranges, suffixes and HEAD probes', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'cover-search-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const file = join(directory, 'synthetic.mp4')
  await writeFile(file, '0123456789')
  const server = createServer((request, response) => {
    void serveSearchVideo(request, response, file).catch(() => response.destroy())
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  t.after(() => {
    server.closeAllConnections()
    server.close()
  })
  const address = server.address() as { port: number }
  const url = `http://127.0.0.1:${address.port}`
  for (const [range, expected] of [
    ['bytes=2-5', '2345'],
    ['bytes=7-', '789'],
    ['bytes=-3', '789'],
  ]) {
    const response = await fetch(url, { headers: { Range: range } })
    assert.equal(response.status, 206)
    assert.equal(await response.text(), expected)
  }
  for (const range of ['bytes=10-', 'bytes=9-2', 'bytes=-0', 'bytes=0-2,4-6']) {
    const response = await fetch(url, { headers: { Range: range } })
    assert.equal(response.status, 416)
    assert.equal(response.headers.get('Content-Range'), 'bytes */10')
  }
  const head = await fetch(url, { method: 'HEAD', headers: { Range: 'bytes=0-1' } })
  assert.equal(head.status, 206)
  assert.equal(head.headers.get('Content-Length'), '2')
  assert.equal(await head.text(), '')
})
