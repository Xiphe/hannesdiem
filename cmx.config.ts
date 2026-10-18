import type { CmxConfig } from '@cmx-tools/contracts'

const node = { from: '@cmx-tools/contracts', import: 'CmxNode' }

export default {
  exports: {
    default: { required: true, type: node },
    title: { required: true, type: node },
  },
  externals: [
    {
      contract: '@hannesdiem/content-components',
      implementation: { '.': '../app/cmx-components.ts' },
    },
  ],
} satisfies CmxConfig
