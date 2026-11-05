import Temple, { metadata as templeMetadata } from './index.tsx'
export { title } from './index.tsx'
export const metadata = {
  ...templeMetadata,
  openerShare: undefined,
  verseShares: undefined,
  ogTitle: 'Step into the circle',
}

export default function Content() {
  return Temple({ view: 'inside', section: 'share' })
}
