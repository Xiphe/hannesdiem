import { songMetadata } from '../../../metadata.ts'
import type { PageMetadata } from '../../../types.ts'

import { Song } from '@hannesdiem/content-components'
import { people } from '../../../people.ts'
import type { SongDefinition } from '../../../types.ts'

export const song = {
  slug: 'song/das-versprechen/reprise',
  title: 'Das Versprechen - Reprise',
  subtitle: '',
  creationDate: '2024-07-01T12:00:00+00:00',
  hideCreationDay: true,
  authors: [people.hannesDiem],
} satisfies SongDefinition

const { slug, ...lyrics } = song

export const metadata = songMetadata(song, {
  kind: 'song',
  ogType: 'music.song',
  updatedAt: '2025-02-27T15:59:57.19+00:00',
  sourceId: '41a4c03a-8d79-4167-a3b9-dcf8a87d3a27',
}) satisfies PageMetadata

export const title = song.title

export default function Content() {
  return (
    <>
      <Song {...lyrics}>
        <p>
          {'Nach vielen Jahren'}
          <br />
          {'Will ich nun ein Versprechen brechen,'}
          <br />
          {'Das ich einst geschworen zu halten,'}
          <br />
          {"Weit hinaus bis über'n Rand"}
        </p>
        <p>
          {"Denn ich hab' zuletzt erkannt,"}
          <br />
          {'Dass Angst und Tod noch an mir nagen'}
          <br />
          {'Und wie Fieber aus mir sprechen,'}
          <br />
          {'Obgleich ich nicht mehr verbannt'}
        </p>
        <p>
          {'Aus meinen Augen fließen keine Blumen mehr'}
          <br />
          {'Und wir haben oft schon andere geküsst'}
          <br />
          {"Die Last, die ich für uns getragen hab', wird mir zu schwer"}
          <br />
          {"Ich halt' sie nicht mehr fest und erkenne das, was blüht"}
        </p>
        <p>
          <strong>{'Und alles geht weiter, wir waren viel zu lang gefangen in uns selbst'}</strong>
          <br />
          <strong>
            {'Ein Geschenk, das keiner nutzt, braucht auch kein Platz in meiner Welt'}
          </strong>
          <br />
          <strong>{'Und viel leichter ist mein Herz, wenn ich loslasse, was mich quält'}</strong>
          <br />
          <strong>{'Ein Versprechen gilt vergessen, wenn niemand mehr darauf zählt'}</strong>
        </p>
      </Song>
    </>
  )
}
