import { Release } from '@hannesdiem/content-components'
import { release } from './halbkreis.ts'

export const title = release.title

export default function Content() {
  return (
    <>
      <Release {...release}>
        <h3>{'My debut EP'}</h3>
        <p>
          {
            'In many ways the cornerstone for my work today. One year later this project has become the band "Kaleidos Chaos" and we played the tracks until we split up in summer 2014. During the studio work with Jan I have not only had a whole lot of fun but also learned a lot 💜'
          }
        </p>
      </Release>
    </>
  )
}
