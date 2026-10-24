import { songMetadata } from '../../metadata.ts'
import type { PageMetadata } from '../../types.ts'

import { Song } from '@hannesdiem/content-components'
import { people } from '../../people.ts'
import type { SongDefinition } from '../../types.ts'

export const song = {
  slug: 'song/irgendwann',
  title: 'Irgendwann',
  creationDate: '2015-03-03T12:00:00+00:00',
  authors: [people.hannesDiem],
} satisfies SongDefinition

const { slug, ...lyrics } = song

export const metadata = songMetadata(song) satisfies PageMetadata

export const title = song.title

export default function Content() {
  return (
    <>
      <Song {...lyrics}>
        <p>
          {"Hey irgendwann steh ich auf und sag, was mir in' Kopf kommt"}
          <br />
          {'Irgendwann, verlasst euch drauf, erzeugen wir ne riesige Rückkopplung'}
          <br />
          {'Irgendwann sag ich was, womit man mich zitieren kann'}
          <br />
          {'Wir könnten so viel sein, wenn wir was tun, bis wir krepieren, Mann'}
        </p>
        <p>
          {'Irgendwann kämpfe ich mit Herzblut gegen blinde Wut'}
          <br />
          {'Irgendwann zeig ich all das Gute, was dort in mir ruht'}
          <br />
          {'Irgendwann stehen wir gemeinsam irgendwo'}
          <br />
          {'Erzählen von Liebe und von Frieden und Vertrauen, stell dir das vor'}
        </p>
        <p>
          <strong>{'Doch irgendwann ist mir egal, ich will was ändern'}</strong>
          <br />
          <strong>{"Irgendwann könnt auch heute sein, vielleicht war's gestern"}</strong>
          <br />
          <strong>{'Ich guck schon viel zu lang verträumt auf den Kalender'}</strong>
          <br />
          <strong>{'Die Welt ist rund, das Leben kurz und wenn nicht jetzt, wann dann?'}</strong>
        </p>
        <p>
          {'Irgendwann sehen wir uns wieder und schütteln nur den Kopf'}
          <br />
          {'Darüber, was damals passiert war'}
          <br />
          {'Die Gier in uns schien fast unkontrollierbar'}
          <br />
          {'Und irgendwann können wir das alles mit Humor sehen'}
          <br />
          {'Irgendwann stellt sich raus, die Hoffnung war noch nie verloren'}
        </p>
        <p>
          {'Irgendwann trennen uns nur noch Flüsse oder Ozeane'}
          <br />
          {'Doch das ist kein Problem, weil echt genügend Boote da sind'}
          <br />
          {'Irgendwann sehen wir uns an, von Glück gezeichnet'}
          <br />
          {'Und erkennen unter tausenden Facetten, dass wir gleich sind'}
        </p>
        <p>
          <strong>{'Doch irgendwann ist mir egal, ich will was ändern'}</strong>
          <br />
          <strong>{"Irgendwann könnt auch heute sein, vielleicht war's gestern"}</strong>
          <br />
          <strong>{'Ich starr schon viel zu lang verwirrt auf den Kalender'}</strong>
          <br />
          <strong>{'Die Welt ist rund, das Leben kurz und wenn nicht jetzt...'}</strong>
        </p>
        <p>
          {"Dann geh ich heut' wenigstens raus und erlebe diesen Augenblick"}
          <br />
          {'Und tanke Kraft und Liebe, für den riesen Zaubertrick'}
          <br />
          {"Egal, ob's an Motivation oder am Glauben liegt"}
          <br />
          {'Will keiner von denen sein, der aus Angst an seinem Traum erstickt'}
        </p>
        <p>
          {'Denn wenn du magst, ich hab das Ding noch lang nicht aufgegeben'}
          <br />
          {'Mit dem Ziel vor Augen und Ideen für zwanzigtausend Leben'}
          <br />
          {'Hab ich von Anfang an nur Liebe und Vertrauen gesehen'}
          <br />
          {'Steht mit mir auf, das Leben ruft, es will sich laut bewegen'}
        </p>
        <p>
          <strong>{'Und irgendwann ist scheißegal, ich will was ändern'}</strong>
          <br />
          <strong>{"Irgendwann könnt auch heute sein, vielleicht war's gestern"}</strong>
          <br />
          <strong>{'Ich mach es jetzt sofort und zerreiße den Kalender'}</strong>
          <br />
          <strong>{'Die Welt ist rund, das Leben kurz und wenn die See uns trägt'}</strong>
          <br />
          <strong>{'Entdecken wir im Sturm irgendwann Küsten fremder Länder'}</strong>
          <br />
          <strong>{"Den Blick nach vorn, irgendwo zwischen Renn' und Schlendern"}</strong>
          <br />
          <strong>{'Lieber im Morgen stranden als im Gestern kentern, denn'}</strong>
          <br />
          <strong>{'Die Welt ist rund, das Leben kurz und wenn nicht jetzt wann sonst?'}</strong>
        </p>
      </Song>
    </>
  )
}
