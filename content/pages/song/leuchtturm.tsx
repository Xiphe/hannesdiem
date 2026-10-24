import type { PageMetadata } from '../../types.ts'

import { Song } from '@hannesdiem/content-components'
import { people } from '../../people.ts'
import type { SongDefinition } from '../../types.ts'

export const metadata = {
  kind: 'song',
  ogType: 'music.song',
  updatedAt: '2025-02-27T15:43:46.109+00:00',
  sourceId: '3043c485-a913-412f-939c-617be608a87c',
} satisfies PageMetadata

export const song = {
  slug: 'song/leuchtturm',
  title: 'Leuchtturm',
  subtitle: 'für Roxy',
  creationDate: '2023-04-11T12:00:00+00:00',
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
          {'Als schwarze Wolken aufgezogen,'}
          <br />
          {'In meinem Kopf, an diesem Ort'}
          <br />
          {'Ist eine Welt verloren gegangen'}
          <br />
          {'Und ich erinnere mich so gut,'}
          <br />
          {'Es ist fast so, als sei sie dort'}
          <br />
          {'Und ich komme einfach nur nicht an'}
        </p>
        <p>
          {'Und als die Nebel dichter wurden'}
          <br />
          {"Hab' ich den Blick nach vorn verlernt"}
          <br />
          {"Und jeder Schritt wurd' vorsichtig"}
          <br />
          {'Denn hier sind Klippen, keine Frage'}
          <br />
          {"Ich hab' den Boden selbst entfernt"}
          <br />
          {'Und mein Gepäck hat viel Gewicht'}
        </p>
        <p>
          <strong>{'Die Wolken sind schwarz, die Nebel sind dicht'}</strong>
          <br />
          <strong>{'Der Regen schreibt Verse von Schmerz und Verzicht'}</strong>
          <br />
          <strong>{'Die Kälte gefriert mir mein Herz, bis es bricht'}</strong>
          <br />
          <strong>{'Und in der Ferne scheint ein Licht'}</strong>
          <br />
          <strong>{"Ich freu' mich unendlich auf dich"}</strong>
        </p>
        <p>
          {'Als der Regen stärker wurde,'}
          <br />
          {'Wollte ich dich nicht mit nass machen'}
          <br />
          {'Auch wenn du sagst, es macht dir nichts'}
          <br />
          {"Und ich suche immer noch 'nen Schirm"}
          <br />
          {'Den ich für dich halten kann'}
          <br />
          {'Und der dir steht und der dich schützt'}
        </p>
        <p>
          <strong>{'Die Wolken sind schwarz, die Nebel sind dicht'}</strong>
          <br />
          <strong>{'Der Regen schreibt Verse von Schmerz und Verzicht'}</strong>
          <br />
          <strong>{'Die Kälte gefriert mir mein Herz, bis es bricht'}</strong>
          <br />
          <strong>{'Und in der Ferne scheint ein Licht'}</strong>
          <br />
          <strong>{"Ich freu' mich unendlich auf dich"}</strong>
        </p>
        <p>
          {"Als du gingst, wurd' es kalt"}
          <br />
          {'Mein ganzes Dach ist eingeschneit'}
          <br />
          {"Hab' den Kamin nicht angezündet"}
          <br />
          {'In alle Decken eingehüllt,'}
          <br />
          {'Die mir noch blieben, saß ich da'}
          <br />
          {"Und hab' den Sommer herbeigewünscht"}
        </p>
        <p>
          <strong>{"Die Wolken warn' schwarz, die Nebel warn' dicht"}</strong>
          <br />
          <strong>{'Der Regen schrieb Verse von Schmerz und Verzicht'}</strong>
          <br />
          <strong>{'Die Kälte gefror mir mein Herz, ...'}</strong>
          <br />
          <strong>{'Und in der Ferne scheint ein Licht'}</strong>
          <br />
          <strong>{"Ich freu' mich unendlich auf dich"}</strong>
        </p>
      </Song>
    </>
  )
}
