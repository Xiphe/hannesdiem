import type { CmxConfig } from '@cmx-tools/contracts'

const node = { from: '@cmx-tools/contracts', import: 'CmxNode' }

export default {
  exports: {
    default: { required: true, type: node },
    title: { required: true, type: node },
    song: { required: false },
    release: { required: false },
    metadata: { required: false },
  },
  externals: ['@hannesdiem/content-components'],
} satisfies CmxConfig
