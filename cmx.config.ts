import type { CmxConfig } from '@cmx-tools/contracts'
import { publicationFetch } from './scripts/publish-transport.ts'

const node = { from: '@cmx-tools/contracts', import: 'CmxNode' }

export default {
  publish: { fetch: publicationFetch },
  exports: {
    default: { required: true, type: node },
    title: { required: true, type: node },
    song: { required: false },
    release: { required: false },
  },
  externals: [
    {
      contract: '@hannesdiem/content-components',
      implementation: { '.': '../app/cmx-components.ts' },
    },
  ],
} satisfies CmxConfig
