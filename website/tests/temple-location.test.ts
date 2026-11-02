import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mapLink, projectVenue } from '../app/temple/location/maps.ts'

const venue = {
  name: 'Synthetic studio & room',
  href: 'https://example.com/studio',
  travel: 'Synthetic travel information',
  latitude: 52.5,
  longitude: 13.4,
}

test('location pin chooses the device map and retains venue coordinates', () => {
  for (const device of [
    { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', platform: 'iPhone' },
    { userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)', platform: 'iPad' },
    { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', platform: 'MacIntel' },
  ]) {
    const url = new URL(mapLink(venue, device))
    assert.equal(url.hostname, 'maps.apple.com')
    assert.equal(url.searchParams.get('ll'), '52.5,13.4')
    assert.equal(url.searchParams.get('q'), venue.name)
  }
  const android = new URL(
    mapLink(venue, { userAgent: 'Mozilla/5.0 (Linux; Android 15)', platform: 'Linux armv8l' }),
  )
  assert.equal(android.hostname, 'www.google.com')
  assert.equal(android.searchParams.get('query'), '52.5,13.4')
  assert.equal(android.searchParams.get('api'), '1')
  for (const device of [
    undefined,
    { userAgent: 'Mozilla/5.0 (Windows NT 10.0)', platform: 'Win32' },
    { userAgent: 'Mozilla/5.0 (X11; Linux x86_64)', platform: 'Linux' },
  ]) {
    const url = new URL(mapLink(venue, device))
    assert.equal(url.hostname, 'www.openstreetmap.org')
    assert.equal(url.searchParams.get('mlat'), '52.5')
    assert.equal(url.searchParams.get('mlon'), '13.4')
  }
})

test('location projection uses the same coordinates for geography and pin', () => {
  assert.deepEqual(projectVenue({ ...venue, latitude: 51.2, longitude: 10.4 }), { x: 500, y: 500 })
  const shifted = projectVenue({ ...venue, latitude: 52.2, longitude: 11.4 })
  assert.ok(Math.abs(shifted.x - 565) < 1e-9)
  assert.ok(Math.abs(shifted.y - 400) < 1e-9)
})
