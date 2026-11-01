import type { CmxConfig } from '@cmx-tools/contracts'

const node = { from: '@cmx-tools/contracts', import: 'CmxNode' }

export default {
  exports: {
    default: { required: false, type: node },
    title: { required: false, type: node },
    song: { required: false },
    release: { required: false },
    metadata: { required: false },
    site: { required: false },
    redirects: { required: false },
  },
  externals: ['@hannesdiem/content-components'],
} satisfies CmxConfig
