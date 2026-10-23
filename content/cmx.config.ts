import type { CmxConfig } from '@cmx-tools/contracts'
import { readFileSync } from 'node:fs'
import config from '../contracts/cmx.ts'
import sources from './media.json' with { type: 'json' }
import savedPalettes from './palettes.json' with { type: 'json' }
import { imageLoader, mediaBase, type Palette } from './preparation/image-loader.ts'

let processedPalettes: Record<string, Palette> = {}
try {
  processedPalettes = JSON.parse(readFileSync('.generated/palettes.json', 'utf8'))
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
}

export default {
  ...config,
  exports: { ...config.exports, routes: { required: false } },
  assets: {
    cacheDir: '.cmx/assets',
    loaders: {
      image: {
        ...imageLoader,
        options: {
          directory: '.generated/media',
          base: mediaBase(process.env.MEDIA_BASE_URL ?? '/media'),
          sources,
          palettes: savedPalettes,
          processedPalettes,
        },
      },
    },
  },
} satisfies CmxConfig
