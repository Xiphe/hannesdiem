import type { PageMetadata } from '../../types.ts'

import { Song } from '@hannesdiem/content-components'
import { people } from '../../people.ts'
import type { SongDefinition } from '../../types.ts'

export const metadata = {
  kind: 'song',
  ogType: 'music.song',
  updatedAt: '2025-02-27T15:25:37.535+00:00',
  sourceId: 'b77a2ae5-0ebe-4b57-8f93-da8ba3ba004a',
} satisfies PageMetadata

export const song = {
  slug: 'song/bruder',
  title: 'Bruder',
  creationDate: '2009-02-04T12:00:00+00:00',
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
          {'Einen Weg zu vergeben'}
          <br />
          {'Bin ich überflogen'}
          <br />
          {'Um zu sehen was der Wind mir wohl sagt'}
        </p>
        <p>
          {'Gewaschen im Regen'}
          <br />
          {'Verblüht wie die Rosen'}
          <br />
          {'Um zu hören was mein Kind mich wohl fragt'}
        </p>
        <p>
          {'Gefallen in Weisheit'}
          <br />
          {'Habe ich es mir erträumt'}
          <br />
          {'In dieser Eiszeit'}
        </p>
        <p>
          <strong>{'Hilf mir, mein Freund'}</strong>
          <br />
          {'Hilf mir zu schreien'}
          <br />
          {'Hilf mir zu sehen und zu weinen'}
          <br />
          {'Hilf mir, mein Freund'}
          <br />
          {'Hilf mir zu teilen'}
          <br />
          {'Hilf mir zu stehen und zu heilen'}
          <br />
          {'Hilf mir zu sein'}
          <br />
          {'Und den Schmerz mit meinem Schicksal zu einen'}
        </p>
        <p>
          {'Ich hab mir selbst aufgegeben'}
          <br />
          {'Das Leid zu erstreben'}
          <br />
          {'Um zu fühlen welche Schmerzen dort wohnen'}
          <br />
          {'Die Lügen zu leben'}
          <br />
          {'Ich höre sie noch Reden'}
          <br />
          {'Und die toten mit Ehre belohnen'}
        </p>
        <p>
          {'Einen Weg zu begreifen'}
          <br />
          {'Habe ich wohl versäumt'}
          <br />
          {'Gebe mir ein Zeichen'}
        </p>
        <p>
          <strong>{'Hilf mir, mein Freund'}</strong>
          <br />
          {'Hilf mir zu schreien'}
          <br />
          {'Hilf mir zu sehen und zu weinen'}
          <br />
          {'Hilf mir, mein Freund'}
          <br />
          {'Hilf mir zu teilen'}
          <br />
          {'Hilf mir zu stehen und zu heilen'}
        </p>
        <p>
          {'Hilf mir den Rücken zu kehren'}
          <br />
          {'Und den Himmel zu sehen'}
          <br />
          {'Und zu beten für alle die Leben'}
          <br />
          {'Und die Hoffnung zuletzt zu verlieren'}
          <br />
          {'Und die Hoffnung zuletzt auf zu Geben'}
        </p>
        <p>
          <strong>{'Hilf mir, mein Freund'}</strong>
          <br />
          {'Hilf mir zu schreien'}
          <br />
          {'Hilf mir zu sehen und zu weinen'}
          <br />
          {'Hilf mir, mein Freund'}
          <br />
          {'Hilf mir zu teilen'}
          <br />
          {'Hilf mir zu stehen und zu heilen'}
        </p>
      </Song>
    </>
  )
}
