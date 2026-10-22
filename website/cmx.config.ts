import type { CmxConfig } from '@cmx-tools/contracts'
import config from '../contracts/cmx.ts'

export default {
  ...config,
  externals: [
    {
      contract: '@hannesdiem/content-components',
      implementation: { '.': '../website/app/ui-library/components.ts' },
    },
  ],
} satisfies CmxConfig
