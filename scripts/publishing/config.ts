import type { CmxConfig } from '@cmx-tools/contracts'
import { publicationFetch } from './transport.ts'

export default { publish: { fetch: publicationFetch } } satisfies CmxConfig
