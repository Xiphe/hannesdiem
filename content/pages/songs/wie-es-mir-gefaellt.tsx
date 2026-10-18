import { Song } from '@hannesdiem/content-components'
import { people } from '../../people.ts'
import type { SongDefinition } from '../../types.ts'

export const song = {
  slug: 'song/wie-es-mir-gefaellt',
  title: 'Wie Es Mir Gefällt',
  subtitle: 'für July',
  creationDate: '2009-03-10T12:00:00+00:00',
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
          {'Ich sitze hier'}
          <br />
          {'Und schlinge meine Glieder'}
          <br />
          {'Um den Rest dieser sterbenden Welt'}
          <br />
          {'Halte mich fest'}
          <br />
          {'Denn ich falle immer wieder'}
        </p>
        <p>{'Doch ich singe meine Lieder, wie es mir gefällt'}</p>
        <p>
          {'Ich singe Eins für die Tiere'}
          <br />
          {'Die Wächter der Pforte'}
          <br />
          {'Eins für die Sterne dort am Himmelszelt'}
          <br />
          {'Eins für jeden Baum'}
          <br />
          {'Jeden Strauch jeder sorte'}
        </p>
        <p>
          {'Ich sage meine Worte, wie es mir gefällt'}
          <br />
          {'Und ich singe meine Lieder, wie es mir gefällt'}
        </p>
        <p>
          {'Ich singe Eins für das Licht'}
          <br />
          {'Und Eins für den Regenbogen'}
          <br />
          {'Eins für die Dunkelheit'}
          <br />
          {'Eins für Dich'}
          <br />
          {'Eins für jeden, der mitfühlt dort oben'}
          <br />
          {'Eins für den Lauf der Zeit'}
        </p>
        <p>{'Denn ich Lebe'}</p>
        <p>
          {'Viel zu oft muss ich sehen'}
          <br />
          {'Sind uns Hände gebunden'}
          <br />
          {'Zu oft dorrt das Beet'}
          <br />
          {'Dass wir gerade frisch bestellt'}
          <br />
          {'Zu oft reißt die Menschheit'}
          <br />
          {'Uns klaffende Wunden'}
        </p>
        <p>
          {'Ich lebe meine Stunden, wie es mir gefällt'}
          <br />
          {'Und Ich sage meine Worte, wie es mir gefällt'}
          <br />
          {'Und ich singe meine Lieder, wie es mir gefällt'}
        </p>
        <p>
          {'Ich singe Eins für das Licht'}
          <br />
          {'Und Eins für den Regenbogen'}
          <br />
          {'Eins für die Dunkelheit'}
          <br />
          {'Eins für Dich'}
          <br />
          {'Eins für jeden, der mitfühlt dort oben'}
          <br />
          {'Eins für den Lauf der Zeit'}
        </p>
        <p>
          {'Denn ich Lebe'}
          <br />
          {'Ich lebe so gerne'}
          <br />
          {'Ich leben mein Leben, wie es mir gefällt'}
        </p>
        <p>
          {'Und ich will kein Palast'}
          <br />
          {'Keine Türme und Fähnchen'}
          <br />
          {'Ich will keinen Vertrag'}
          <br />
          {'Und ich will auch kein Geld'}
          <br />
          {'Ich will nur einen Platz'}
          <br />
          {'In einem friedlichen Städchen'}
        </p>
        <p>
          {'Dort lieb ich mein Mädchen weil es mir gefällt'}
          <br />
          {'Ich lebe meine Stunden, wie es mir gefällt'}
          <br />
          {'Und Ich sage meine Worte, wie es mir gefällt'}
          <br />
          {'Und ich singe meine Lieder, wie es mir gefällt'}
        </p>
        <p>
          {'Ich singe Eins für das Licht'}
          <br />
          {'Und Eins für den Regenbogen'}
          <br />
          {'Eins für die Dunkelheit'}
          <br />
          {'Eins für Dich'}
          <br />
          {'Eins für jeden, der mitfühlt dort oben'}
          <br />
          {'Eins für den Lauf der Zeit'}
        </p>
        <p>
          {'Denn ich Lebe'}
          <br />
          {'Ich lebe so gerne'}
        </p>
        <p>
          {'Ich lebe für das Licht'}
          <br />
          {'Ich lebe für den Regenbogen'}
          <br />
          {'Lebe für die Dunkelheit'}
          <br />
          {'Lebe für Dich'}
          <br />
          {'Lebe für jeden, der mitfühlt dort oben Lebe für den Lauf der Zeit'}
        </p>
        <p>
          {'Ich lebe für das Licht'}
          <br />
          {'Ich lebe für den Regenbogen'}
          <br />
          {'Lebe für die Dunkelheit'}
          <br />
          {'Lebe für Dich'}
          <br />
          {'Lebe für jeden, der mitfühlt dort oben Lebe für die Ewigkeit'}
        </p>
        <p>
          {'Und ich liebe mein Mädchen weil es mir gefällt'}
          <br />
          {'Und Ich lebe meine Stunden, wie es mir gefällt'}
          <br />
          {'Und Ich sage meine Worte, wie es mir gefällt'}
          <br />
          {'Und ich singe meine Lieder, wie es mir gefällt'}
          <br />
          {'Und ich liebe nur Dich, weil du mir gefällst'}
        </p>
      </Song>
    </>
  )
}
