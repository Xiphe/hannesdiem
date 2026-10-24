import type { PageMetadata } from '../types.ts'

export const metadata = {
  title: 'Hannes Diem',
  kind: 'page',
  theme: 'electrocute',
  description: '...about Music, Life, and Everything',
  ogType: 'profile',
  ogTitle: 'Hannes Diem',
  profile: {
    firstName: 'Hannes',
    lastName: 'Diem',
  },
} satisfies PageMetadata

export const title = 'About'

export default function Content() {
  return (
    <>
      <h1>{"Hi I'm Hannes. Don't really like to talk about myself..."}</h1>
    </>
  )
}
