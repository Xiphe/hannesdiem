import type { PageMetadata } from '../../types.ts'

import { Song } from '@hannesdiem/content-components'
import { people } from '../../people.ts'
import type { SongDefinition } from '../../types.ts'

export const metadata = {
  kind: 'song',
  ogType: 'music.song',
  updatedAt: '2025-02-27T15:45:49.095+00:00',
  sourceId: '8c9ff36b-fb1f-4b1c-9383-931dccd9bfc4',
} satisfies PageMetadata

export const song = {
  slug: 'song/pidder-lueng',
  title: 'Pidder Lüng',
  creationDate: '2010-02-05T12:00:00+00:00',
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
          {'Ich bin als Mensch gebohren'}
          <br />
          {'Und hab als Tier gelebt'}
          <br />
          {'Hab meine Lust verloren'}
          <br />
          {'Die Lippen sind verklebt'}
        </p>
        <p>
          {'Eure List ist die Steuer'}
          <br />
          {'Auf Papier steht der Sieg'}
          <br />
          {'Gegen Feigheit hilft Feuer'}
          <br />
          {'Und gegen Freiheit Krieg'}
        </p>
        <p>
          {'Darum tragt ihr mich besser zu Grabe'}
          <br />
          {'Bevor ich meinen Stolz hier verliere'}
          <br />
          {'Denn ich weiß, was ihr wollt'}
          <br />
          {"Und ich weiß, was ich sollt'"}
          <br />
          {'Doch ich bin lieber Tod als euch Sklave'}
        </p>
        <p>
          {'Ihr habt es nie begriffen'}
          <br />
          {'Dringt ein in unsere Welt'}
          <br />
          {'Hab meine Axt geschliffen'}
          <br />
          {'Neben die Tür gestellt'}
        </p>
        <p>
          {'Werde mich nicht kampflos ergeben'}
          <br />
          {'Wenn ihr mich hohlen wollt'}
          <br />
          {'Ihr kriegt vielleicht mein Leben'}
          <br />
          {'Doch sicher nicht mein Gold'}
        </p>
        <p>
          {'Wie kann es sein, dass ihr so blind, so arrogant'}
          <br />
          {'In meine Suppe spuckt?'}
          <br />
          {'In der ich euch ertränke!'}
          <br />
          {'Der Tod mein Preis, der Stolz mein Lohn'}
          <br />
          {'Keine Kette dieser Welt'}
          <br />
          {'Fasst meinen Hals'}
          <br />
          {'Meine Gelenke'}
        </p>
        <p>
          {'Und so tragt ihr mich lachend zu Grabe'}
          <br />
          {'Und wähnt euch als Sieger, ihr Narren'}
          <br />
          {'Mein Wort das verbleibt'}
          <br />
          {'In den Wogen der Zeit'}
          <br />
          {'Wir sind lieber Tod, als euch Sklave'}
        </p>
        <p>
          {'Kein Gott stellte mich jeh in Frage'}
          <br />
          {'Kein Bettler und auch kein Prophet'}
          <br />
          {'Mein Wort, dass besteht'}
          <br />
          {'Noch wenn alles vergeht'}
          <br />
          {'Wir sind lieber Tod, als euch Sklave'}
        </p>
      </Song>
    </>
  )
}
