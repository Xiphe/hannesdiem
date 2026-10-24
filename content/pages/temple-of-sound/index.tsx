import type { PageMetadata } from '../../types.ts'

import { PoemCanvas, PoemOpening } from '@hannesdiem/content-components'

import forest from '../../media/IMG_6257.JPG'

export const metadata = { kind: 'temple', image: forest } satisfies PageMetadata

export const title = 'Temple of Sound'

export default function Content() {
  return (
    <PoemCanvas>
      <PoemOpening
        id="verse-1"
        title={title}
        dates={{ start: '2026-11-01', end: '2026-12-20' }}
        image={forest}
        lightSource={{ x: 53.24, y: 54.07 }}
      />
    </PoemCanvas>
  )
}
