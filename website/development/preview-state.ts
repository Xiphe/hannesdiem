import { resolve } from 'node:path'

/** Keep the authored review's local state separate from ordinary dev and tests. */
export function previewPersistence(directory: string) {
  return { resourcePersistencePath: resolve(directory) }
}
