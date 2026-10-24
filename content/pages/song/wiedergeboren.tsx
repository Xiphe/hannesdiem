import type { PageMetadata } from '../../types.ts'

import { Song } from '@hannesdiem/content-components'
import { people } from '../../people.ts'
import type { SongDefinition } from '../../types.ts'

export const metadata = {
  kind: 'song',
  ogType: 'music.song',
  updatedAt: '2025-02-27T15:57:03.942+00:00',
  sourceId: '71461a84-f584-43f8-bab7-76e811e1748f',
} satisfies PageMetadata

export const song = {
  slug: 'song/wiedergeboren',
  title: 'Wiedergeboren',
  creationDate: '2014-02-04T12:00:00+00:00',
  hideCreationDay: true,
  authors: [people.hannesDiem],
} satisfies SongDefinition

const { slug, ...lyrics } = song

export const title = song.title

export default function Content() {
  return (
    <>
      <Song {...lyrics}>
        <p>{'Annscheinend werd ich schon wieder...'}</p>
        <p>
          {'Wiedergeboren, wieder verloren, wieder verlassen, wieder'}
          <br />
          {'Ein Schritt nach vorn, ein Schritt durch windige Gassen,'}
          <br />
          {'Ein Schritt hinaus aufs Meer, in einen anderen Hafen'}
          <br />
          {'In eine andere Stadt, mit einem anderen Namen'}
        </p>
        <p>
          {'Ich werd wiedergeboren, wieder erfroren, wieder verflogen, wieder'}
          <br />
          {'Ein Schritt nach vorn, wieder ein bisschen gelogen, wieder'}
          <br />
          {'Ein bisschen so, als sei es gestern gewesen,'}
          <br />
          {'Als ich nicht wiederkam, als ich mich festgelegen'}
        </p>
        <p>
          <strong>{'Ich will sehn, ich will sein, ich will leben'}</strong>
          <br />
          <strong>{"Ich will fühl'n, ich will wandern, ich will neben dich"}</strong>
          <br />
          <strong>{'Ich will lieben und atmen und beben'}</strong>
          <br />
          <strong>{'Ich will ein Stück von meinem Herz dir geben'}</strong>
        </p>
        <p>
          {'Ich werd wiedergeboren, wieder der Norm, wieder gestrandet, wieder'}
          <br />
          {'Ein Schritt nach vorn, wieder woanders gelandet, wieder'}
          <br />
          {'Ein weiter Weg, ein weites Land, ein weiter Blick,'}
          <br />
          {'Ein weiter Horizont und nichts hält meinen Geist zurück'}
        </p>
        <p>
          {'Ich werd wiedergeboren, wieder geflohen, wieder vergessen, wieder'}
          <br />
          {'Ein Schritt nach vorn, wieder ein Stückchen vermessen, wieder'}
          <br />
          {'Mal wieder aufhören, über Pläne zu reden'}
          <br />
          {'Wieder aufstehen, um dem Leben seinen Segen zu geben'}
        </p>
        <p>
          {'Und eine ganze Welt liegt hinter mir'}
          <br />
          {'Mit jedem Tag und jedem Wort und jedem Blick, nur keinen Schritt zurück'}
          <br />
          {'Und auch wenn alles seinen Sinn verliert'}
          <br />
          {'Hast du mich vielleicht kurz gesehen, eine Hand frei und nimmst mich mit zum Glück'}
        </p>
        <p>
          <strong>{'Lass mich sehn, lass mich sein, lass mich leben'}</strong>
          <br />
          <strong>{"Lass mich fühl'n, lass mich wandern, lass mich neben dich"}</strong>
          <br />
          <strong>{'Lass mich lieben und atmen und beben'}</strong>
          <br />
          <strong>{'Lass mich ein Stück von meinem Herz dir geben'}</strong>
        </p>
      </Song>
    </>
  )
}
