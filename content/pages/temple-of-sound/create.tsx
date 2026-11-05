import Temple, { metadata as templeMetadata } from './index.tsx'
export { title } from './index.tsx'
export const metadata = { ...templeMetadata, verseShares: undefined, ogTitle: 'Create' }

export default function Content() {
  return Temple({ view: 'inside', section: 'create' })
}
