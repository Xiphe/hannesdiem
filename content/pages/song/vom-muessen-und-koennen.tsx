import type { PageMetadata } from '../../types.ts'

import { Song } from '@hannesdiem/content-components'
import { people } from '../../people.ts'
import type { SongDefinition } from '../../types.ts'

export const metadata = {
  kind: 'song',
  ogType: 'music.song',
  updatedAt: '2025-02-27T15:59:07.38+00:00',
  sourceId: '127eacec-2ed6-4dbe-8aae-aa8fc7cac1b5',
} satisfies PageMetadata

export const song = {
  slug: 'song/vom-muessen-und-koennen',
  title: 'Vom Müssen und Können',
  subtitle: 'für meine geliebten Eltern',
  creationDate: '2024-02-01T12:00:00+00:00',
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
          {'Ich kann fliehen, ich kann kämpfen, um zu leben'}
          <br />
          {'Ich kann... eingefroren hier stehen'}
          <br />
          {'Ich kann eins von eins abziehen und trotzdem was ergeben'}
          <br />
          {'Ich kann Licht in Dunkelheit sehen'}
        </p>
        <p>
          {'Ich kann lügen, ich kann leben, ich kann lieben'}
          <br />
          {'Ich kann fesseln, ich kann frei sein, gerade stehen und mich verbiegen'}
          <br />
          {'Ich kann Räume sehen und Formen, bin verbannt und auserkoren'}
          <br />
          {'Ich kann verzichten und doch nicht widerstehen'}
        </p>
        <p>
          <strong>{'Und ihr, ihr konntet scheinbar nicht mehr zueinander finden'}</strong>
          <br />
          <strong>{'Den Palast nicht aufrecht halten, den ihr für uns gebaut'}</strong>
          <br />
          <strong>{'Konntet euch und eure Kinder nicht mehr retten vor den Trümmern'}</strong>
          <br />
          <strong>
            {
              'Und so musste ich schnell alles können. Schnell alles können, was ihr euch nicht getraut.'
            }
          </strong>
        </p>
        <p>
          {'Ich kann mich vergessen, beugen und tragen'}
          <br />
          {'Und mich ergeben, um den Frieden zu wahren'}
          <br />
          {'Ich kann gefährlich sein und zahm, ich kann reich sein und arm'}
          <br />
          {'Ich kann verletzen, nur aus Liebe und Scham'}
        </p>
        <p>
          {"Heut' kann ich Auto fahren, Buchhaltung und Yoga"}
          <br />
          {'Ich kann Verträge unterschreiben, Hemden tragen – auch in Rosa'}
          <br />
          {'Ich kann kochen ohne Fleisch, staubsaugen und wischen zugleich'}
          <br />
          {'Doch einen Konflikt zu sehen, fällt mir echt nicht leicht'}
        </p>
        <p>
          <strong>{'Denn ihr, ihr konntet scheinbar nicht mehr zueinander finden'}</strong>
          <br />
          <strong>{'Den Palast nicht aufrecht halten, den ihr für uns gebaut'}</strong>
          <br />
          <strong>{'Konntet euch und eure Kinder nicht mehr retten vor den Trümmern'}</strong>
          <br />
          <strong>{'Und so musste ich ganz plötzlich selber finden, bauen und kümmern'}</strong>
        </p>
        <p>
          {'Musste retten lernen, Hoffnung geben, trösten und ertragen'}
          <br />
          {'Und ich musste mir versprechen, nie wie ihr so zu versagen'}
          <br />
          {'Und besser sein und mich nicht winden,'}
          <br />
          {'Ehrlich sein und Wege finden,'}
          <br />
          {'Das fortsetzen, was wir schätzen,'}
          <br />
          {'Schmerz ertragen, ohne klagen,'}
          <br />
          {'Freundlich sein mit jedem Laut,'}
          <br />
          {'Schlucken, was sich angestaut,'}
          <br />
          {'Und alles können, was ihr euch nicht getraut.'}
        </p>
        <p>{' '}</p>
        <p>
          {"Und heut' können wir vertrauen"}
          <br />
          {'Wir können lieben und verzeihen'}
          <br />
          {'Wir können neue Schlösser bauen'}
          <br />
          {'Und auch diese stürzen ein'}
        </p>
        <p>
          {'Wir können aufhören zu müssen'}
          <br />
          {'Wir können alles verstehen'}
          <br />
          {'Wir können Licht in Dunkelheit sehen'}
        </p>
      </Song>
    </>
  )
}
