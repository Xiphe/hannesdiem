import type { PageMetadata } from '../../../types.ts'

import { Song } from '@hannesdiem/content-components'
import { people } from '../../../people.ts'
import type { SongDefinition } from '../../../types.ts'

export const metadata = {
  kind: 'song',
  ogType: 'music.song',
  updatedAt: '2025-02-27T15:59:34.886+00:00',
  sourceId: '39caac18-8290-4523-9150-21dad0b1b4e3',
} satisfies PageMetadata

export const song = {
  slug: 'song/irgendwann/reprise',
  title: 'Irgendwann - Reprise',
  subtitle: '',
  creationDate: '2022-05-06T12:00:00+00:00',
  hideCreationDay: false,
  authors: [people.hannesDiem],
} satisfies SongDefinition

const { slug, ...lyrics } = song

export const title = song.title

export default function Content() {
  return (
    <>
      <Song {...lyrics}>
        <p>
          {'Und irgendwann sahen wir uns wieder'}
          <br />
          {'Irgendwann kam unser Glück zurück'}
          <br />
          {'Irgendwann hat die Sache sich entspannt'}
          <br />
          {'Und wir gingen Stück für Stück  '}
        </p>
        <p>
          {'Und auch wenn einige der großen Fragen'}
          <br />
          {"Heut' noch auf 'ne Antwort warten"}
          <br />
          {"Gab's irgendwann den Punkt, an dem wir uns vertragen haben"}
        </p>
        <p>
          {'Irgendwann bliebst du mir und ich bei dir im Guten'}
          <br />
          {'Irgendwann konnten wir verzeihen und aufhören zu vermuten'}
          <br />
          {'Irgendwann hielten wir kurz an und sagten leise,'}
          <br />
          {'Dass wir uns unglaublich dankbar sind für diese lange Reise'}
        </p>
      </Song>
    </>
  )
}
