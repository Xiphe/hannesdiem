export const templeEntryStorageKey = 'hannesdiem.temple.entered'

/** Browser-only preference; unavailable storage keeps the public entry usable. */
export function hasEnteredTemple() {
  try {
    return localStorage.getItem(templeEntryStorageKey) === 'true'
  } catch {
    return false
  }
}

export function rememberTempleEntry() {
  try {
    localStorage.setItem(templeEntryStorageKey, 'true')
  } catch {
    // Privacy settings may block storage without preventing a Temple visit.
  }
}

export function forgetTempleEntry() {
  try {
    localStorage.removeItem(templeEntryStorageKey)
  } catch {
    // Returning to the manifesto also works when storage is unavailable.
  }
}
