import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  forgetTempleEntry,
  hasEnteredTemple,
  rememberTempleEntry,
  templeEntryStorageKey,
} from '../app/temple/entry-state.ts'

test('Temple entry persists the existing preference and can explicitly clear it', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  const values = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    },
  })
  try {
    assert.equal(hasEnteredTemple(), false)
    values.set(templeEntryStorageKey, 'false')
    assert.equal(hasEnteredTemple(), false)
    rememberTempleEntry()
    assert.equal(values.get('hannesdiem.temple.entered'), 'true')
    assert.equal(hasEnteredTemple(), true)
    forgetTempleEntry()
    assert.equal(hasEnteredTemple(), false)
    assert.equal(values.size, 0)
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  }
})

test('unavailable browser storage leaves Temple entry and return usable', () => {
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
    assert.doesNotThrow(forgetTempleEntry)
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  }
})
