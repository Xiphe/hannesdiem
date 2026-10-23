import type { CmxConfig } from '@cmx-tools/contracts'
import config from '../contracts/cmx.ts'
import sources from './media.json' with { type: 'json' }
import { imageLoader, mediaBase } from './preparation/image-loader.ts'
import type { MediaStorage } from './preparation/media-storage.ts'

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
        },
      },
    },
  },
} satisfies CmxConfig
