import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  hasEnteredTemple,
  rememberTempleEntry,
  templeEntryStorageKey,
  watchReturnHref,
} from '../app/temple/entry-state.ts'

test('Temple entry is an explicit persisted preference shared with the feed return', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  const values = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    },
  })
  try {
    assert.equal(hasEnteredTemple(), false)
    assert.equal(watchReturnHref(), '/temple-of-sound')
    values.set(templeEntryStorageKey, 'false')
    assert.equal(hasEnteredTemple(), false)
    rememberTempleEntry()
    assert.equal(values.get('hannesdiem.temple.entered'), 'true')
    assert.equal(hasEnteredTemple(), true)
    assert.equal(watchReturnHref(), '/temple-of-sound/watch')
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  }
})

test('unavailable browser storage leaves Temple entry and feed return usable', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() {
      throw new DOMException('Storage is disabled', 'SecurityError')
    },
  })
  try {
    assert.equal(hasEnteredTemple(), false)
    assert.doesNotThrow(rememberTempleEntry)
    assert.equal(watchReturnHref(), '/temple-of-sound')
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  }
})
