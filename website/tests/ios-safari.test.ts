import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isIOSSafari } from '../app/temple/ios-safari.ts'

const safari = 'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1'
const iphone = `Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) ${safari}`
const mac = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ${safari}`

for (const [name, userAgent, platform, maxTouchPoints, expected] of [
  ['iPhone Safari', iphone, 'iPhone', 5, true],
  ['iPad Safari', `Mozilla/5.0 (iPad; CPU OS 18_6 like Mac OS X) ${safari}`, 'iPad', 5, true],
  ['iPad desktop-mode Safari', mac, 'MacIntel', 5, true],
  ['Mac Safari', mac, 'MacIntel', 0, false],
  ['Chrome on iPhone', iphone.replace('Version/26.0', 'CriOS/140.0'), 'iPhone', 5, false],
  ['Firefox on iPhone', iphone.replace('Version/26.0', 'FxiOS/140.0'), 'iPhone', 5, false],
  ['Edge on iPhone', iphone.replace('Version/26.0', 'EdgiOS/140.0'), 'iPhone', 5, false],
  ['Opera on iPhone', iphone.replace('Version/26.0', 'OPiOS/4.0'), 'iPhone', 5, false],
  ['DuckDuckGo on iPhone', `${iphone} DuckDuckGo/7`, 'iPhone', 5, false],
  ['Google app on iPhone', `${iphone} GSA/400.0`, 'iPhone', 5, false],
  ['Chrome on desktop-mode iPad', `${mac} CriOS/140.0`, 'MacIntel', 5, false],
  [
    'iOS web view',
    iphone.replace('Version/26.0 ', '').replace(' Safari/604.1', ''),
    'iPhone',
    5,
    false,
  ],
  ['Android browser', `Mozilla/5.0 (Linux; Android 15) ${safari}`, 'Linux armv8l', 5, false],
] as const) {
  test(`Safari toolbar detection: ${name}`, () => {
    assert.equal(isIOSSafari({ userAgent, platform, maxTouchPoints }), expected)
  })
}
