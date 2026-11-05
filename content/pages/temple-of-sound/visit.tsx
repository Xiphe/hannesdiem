import Temple, { metadata as templeMetadata } from './index.tsx'
export { title } from './index.tsx'
export const metadata = {
  ...templeMetadata,
  openerShare: undefined,
  verseShares: undefined,
  ogTitle: 'Come visit us',
}

export default function Content() {
  return Temple({ view: 'inside', section: 'visit' })
}
