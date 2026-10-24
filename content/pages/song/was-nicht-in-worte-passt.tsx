import type { PageMetadata } from '../../types.ts'

import { Song } from '@hannesdiem/content-components'
import { people } from '../../people.ts'
import type { SongDefinition } from '../../types.ts'

export const metadata = {
  kind: 'song',
  ogType: 'music.song',
  updatedAt: '2025-02-27T15:53:00.804+00:00',
  sourceId: '3d84d40e-c075-4fd3-bb2a-b2863c6d320f',
} satisfies PageMetadata

export const song = {
  slug: 'song/was-nicht-in-worte-passt',
  title: 'Was Nicht In Worte Passt',
  subtitle: 'Für alle magischen Begegnungen',
  creationDate: '2024-09-06T12:00:00+00:00',
  hideCreationDay: true,
  authors: [people.hannesDiem],
} satisfies SongDefinition

const { slug, ...lyrics } = song

export const title = song.title

export default function Content() {
  return (
    <>
      <Song {...lyrics}>
        <p>
          {'Zwischen Milliarden von Farben'}
          <br />
          {'Stehen zwei Wagen'}
          <br />
          {'ist die Welt sehr fern'}
          <br />
          {'Die Nacht wird zu Jahren,'}
          <br />
          {'um so viel zu erfahren'}
          <br />
          {"und so viel zu verlern'"}
        </p>
        <p>
          <strong>{'Was Augen nicht zu sehen vermögen mahlt die Fantasie'}</strong>
          <br />
          <strong>{'Und das was nicht in Worte passt sagt diese Melodie'}</strong>
        </p>
        <p>
          {'Zwischen Millionen von Leben'}
          <br />
          {'Treffen sich ein paar Seelen'}
          <br />
          {'Unter dem gleichen Stern'}
          <br />
          {'Um sich selbst zu verstehen'}
          <br />
          {'Darin Hoffnung zu sehen'}
          <br />
          {'Um eine Welt zu erklären'}
        </p>
        <p>
          <strong>{'Was Augen nicht zu sehen vermögen mahlt die Fantasie'}</strong>
          <br />
          <strong>{'Und das was nicht in Worte passt sagt diese Melodie'}</strong>
        </p>
        <p>
          {'Dann nach tausenden Meilen'}
          <br />
          {'Spiegelt sich in den Zeilen'}
          <br />
          {'Was im Herz sich erkennt'}
          <br />
          {'Um alte Wunden zu heilen'}
          <br />
          {'Und im Traum zu verweilen'}
          <br />
          {'Gestärkt und ungehemmt'}
        </p>
        <p>
          <strong>{'Was Augen nicht zu sehen vermögen mahlt die Fantasie'}</strong>
          <br />
          <strong>{'Und das was nicht in Worte passt sagt diese Melodie'}</strong>
        </p>
      </Song>
    </>
  )
}
