import { people } from '../people.ts'
import { description } from '../site.ts'
import type { PageMetadata } from '../types.ts'

export const metadata = {
  title: people.hannesDiem.name,
  theme: 'electrocute',
  description,
  ogType: 'profile',
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
