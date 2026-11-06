import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  hasEnteredTemple,
  rememberTempleEntry,
  templeEntryStorageKey,
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
    values.set(templeEntryStorageKey, 'false')
    assert.equal(hasEnteredTemple(), false)
    rememberTempleEntry()
    assert.equal(values.get('hannesdiem.temple.entered'), 'true')
    assert.equal(hasEnteredTemple(), true)
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
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  }
})
