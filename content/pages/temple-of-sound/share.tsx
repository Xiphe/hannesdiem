import Temple, { metadata as templeMetadata } from './index.tsx'
export { title } from './index.tsx'
export const metadata = { ...templeMetadata, verseShares: undefined, ogTitle: 'Share' }

export default function Content() {
  return Temple({ view: 'inside', section: 'share' })
}
