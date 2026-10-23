import type { CmxConfig } from '@cmx-tools/contracts'
import { readFileSync } from 'node:fs'
import config from '../contracts/cmx.ts'
import sources from './media.json' with { type: 'json' }
import savedPalettes from './palettes.json' with { type: 'json' }
import { imageLoader, mediaBase, type Palette } from './preparation/image-loader.ts'
import type { MediaStorage } from './preparation/media-storage.ts'

let processedPalettes: Record<string, Palette> = {}
try {
  processedPalettes = JSON.parse(readFileSync('.generated/palettes.json', 'utf8'))
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
}

const storage: MediaStorage =
  process.env.MEDIA_STORAGE === 'r2'
    ? {
        base: mediaBase(process.env.MEDIA_BASE_URL ?? ''),
        account: process.env.R2_ACCOUNT_ID ?? '',
        bucket: 'hannesdiem-media',
      }
    : { base: '/media', directory: '.generated/media' }

export default {
  ...config,
  exports: { ...config.exports, routes: { required: false } },
  assets: {
    cacheDir: 'directory' in storage ? `${storage.directory}/.cmx` : '.cmx/assets',
    loaders: {
      image: {
        ...imageLoader,
        options: {
          storage,
          sources,
          palettes: savedPalettes,
          processedPalettes,
        },
      },
    },
  },
} satisfies CmxConfig
