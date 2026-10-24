import { songMetadata } from '../../metadata.ts'
import type { PageMetadata } from '../../types.ts'

import { Song } from '@hannesdiem/content-components'
import { people } from '../../people.ts'
import type { SongDefinition } from '../../types.ts'

export const song = {
  slug: 'song/die-muehle',
  title: 'Die Mühle',
  creationDate: '2009-02-11T12:00:00+00:00',
  hideCreationDay: true,
  authors: [people.christinaDuewel, people.hannesDiem],
} satisfies SongDefinition

const { slug, ...lyrics } = song

export const metadata = songMetadata(song, {
  kind: 'song',
  ogType: 'music.song',
  updatedAt: '2025-02-27T15:34:27.422+00:00',
  sourceId: 'ea9ef5e1-cb79-4d39-9ed1-c4a81364abd7',
}) satisfies PageMetadata

export const title = song.title

export default function Content() {
  return (
    <>
      <Song {...lyrics}>
        <p>
          {'Ein Zeichen von mir'}
          <br />
          {'In Liebe erbracht'}
          <br />
          {'Gelegt auf einen silbernen Faden'}
          <br />
          {'Dort vor deiner Tür'}
          <br />
          {'So habe ich es mir gedacht'}
          <br />
          {'Wird es tobende Wellen bald schlagen'}
        </p>
        <p>
          {'Doch die Zeit, die verstreicht'}
          <br />
          {'Und das Wasser verfließt'}
          <br />
          {'Ich bin bereit in die Flammen zu springen'}
          <br />
          {'Doch denn lass ich es sein'}
          <br />
          {'Wenn der Kreis sich nicht schließt'}
          <br />
          {'Will ich dir keine Zeichen mehr bringen'}
        </p>
        <p>
          <strong>{'Und so ließ ich mich leiten'}</strong>
          <br />
          {'Von Feuer und Eis'}
          <br />
          {'Denn dort, fern aller Zeiten'}
          <br />
          {'Auf Schicksals geheiß'}
          <br />
          {'Gibt es nur Eines, dass ich fühle'}
          <br />
          {'Nur Eines, dass ich weiß'}
          <br />
          {'Wir drehen wie die Mühle'}
          <br />
          {'Uns stetig im Kreis'}
          <br />
          {'Wir drehen wie die Mühle im Kreis'}
        </p>
        <p>
          {'Gefühlt, wie getan'}
          <br />
          {'Ein Zeichen in ehren'}
          <br />
          {'Gebettet auf goldenen Waagen'}
          <br />
          {'Bin zur Hölle gefahren'}
          <br />
          {'Um es dir zu gewähren'}
          <br />
          {'Dass es Licht bringt in düsteren Tagen'}
        </p>
        <p>
          {'Doch die Zeit, die verstreicht'}
          <br />
          {'Und kein glimmen erscheint'}
          <br />
          {'Will mich selbst in den Fluten ertränken'}
          <br />
          {'Doch dann lass ich es sein'}
          <br />
          {'Wenn der Kreis sich nicht eint'}
          <br />
          {'Will ich dir keine Zeichen mehr schenken'}
        </p>
        <p>
          <strong>{'Und so ließ ich mich leiten'}</strong>
          <br />
          {'Von Feuer und Eis'}
          <br />
          {'Denn dort, fern aller Zeiten'}
          <br />
          {'Auf Schicksals geheiß'}
          <br />
          {'Gibt es nur Eines, dass ich fühle'}
          <br />
          {'Nur Eines, dass ich weiß'}
          <br />
          {'Wir drehen wie die Mühle'}
          <br />
          {'Uns stetig im Kreis'}
          <br />
          {'Wir drehen wie die Mühle im Kreis'}
        </p>
        <p>
          {'Keine Pforte, kein Weg und kein Schrein'}
          <br />
          {'Keine Stunde will ich bei dir sein'}
          <br />
          {'Keine Tage mehr zählen'}
          <br />
          {'Keine Fäden, kein Bild, keine Waage'}
          <br />
          {'Keine Tränen mehr weinen'}
          <br />
          {'Keine Wahl bleibt mir, wenn ich das Ende sehe'}
          <br />
          {'Keine andere Tat, die noch verbleibt'}
          <br />
          {"Ich werde ganz leis'"}
          <br />
          {'Und greife im nu'}
          <br />
          {'Zum Dolch und steche zu'}
          <br />
          {'Endlich schließt sich der Kreis'}
        </p>
        <p>
          <strong>{'So ließ ich mich leiten'}</strong>
          <br />
          {'Von Feuer und Eis'}
          <br />
          {'Denn dort, fern aller Zeiten'}
          <br />
          {'Auf Schicksals geheiß'}
          <br />
          {'Gibt es nur Eines, dass ich fühle'}
          <br />
          {'Nur Eines, dass ich weiß'}
          <br />
          {'Wir drehen wie die Mühle'}
          <br />
          {'Uns stetig im Kreis'}
        </p>
      </Song>
    </>
  )
}
