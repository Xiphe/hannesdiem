import { cp } from 'node:fs/promises'
import { basename } from 'node:path'

await cp('.generated/media', 'dist/media', {
  recursive: true,
  filter: (path) => basename(path) !== '.cmx',
})
