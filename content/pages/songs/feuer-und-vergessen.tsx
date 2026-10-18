import { Song } from '@hannesdiem/content-components'
import { people } from '../../people.ts'
import type { SongDefinition } from '../../types.ts'

export const song = {
  slug: 'song/feuer-und-vergessen',
  title: 'Feuer und Vergessen',
  creationDate: '2020-04-08T12:00:00+00:00',
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
          {'Oh wir sind Pyromanen, haben die Lügen im Spiel erkannt'}
          <br />
          {'Werden die Fügung wahren, besser hell verglüht als nie gebrannt'}
          <br />
          {"Legen wir nachts in Schutt, was einst 'nen schönen Gedanken verbindet"}
          <br />
          {'Die Welt ist lang kaputt und wir von grünen Flammen erblindet'}
        </p>
        <p>
          {'Und dann ist auch schon alles ganz schnell vorbei'}
          <br />
          {'Nach einem Kuss und einem Fick wird eins und eins aus zwei'}
          <br />
          {'Dort wo Vulkane beben, liegen wir verkatert am Strand'}
          <br />
          {'Und haben gerade eben sieben Missetaten begangen'}
        </p>
        <p>
          {'Denken mit Staunen an den Glauben und mal wieder an die Müden'}
          <br />
          {'Schicken tausend schwarze Tauben für den Frieden Richtung Süden'}
          <br />
          {'Nur einmal können wir diese Welt beim Untergang sehen'}
          <br />
          {'Versteinert bleiben wir beim Feuerwerk noch stundenlang stehen'}
        </p>
        <p>
          <strong>{'Ich nenne das Feuer und Vergessen'}</strong>
          <br />
          <strong>{'Mit allem Glück der Welt gebrannt, doch von Ungeheuern zerfressen'}</strong>
          <br />
          <strong>{'Feuer und Vergessen'}</strong>
        </p>
        <p>
          {'Oh wir sind Kannibalen, leben von der Hand im Mund'}
          <br />
          {'Erlegen zwanzig Mal den Geist, den wir erfanden'}
          <br />
          {'Und lassen uns vergolden, was in Bronze schon die Kunst in allem ertränkte'}
          <br />
          {'Ernähren uns von dem Holz, das uns die Luft zum Atmen schenkt'}
        </p>
        <p>
          {'Denn bald ist auch schon alles ganz schnell vorbei'}
          <br />
          {'Nach einem Klick und einem Schuss wird null und eins aus zwei'}
          <br />
          {'Dort wo Soldaten gehen, fliegen keine Adler entlang'}
          <br />
          {'Wir haben gerade eben sieben Missetaten begangen'}
        </p>
        <p>
          {'Vergessen heute schon das Morgen in Gedanken an die Ehre'}
          <br />
          {'Tragen stolz auch falsche Orden und verwandeln uns in Erde'}
          <br />
          {'Verzeihen uns selbst, denn wir sind nur aus Fleisch und Zweifel'}
          <br />
          {'Hey, wir tragen im Verhältnis viel zu viel der gleichen Scheiße'}
        </p>
        <p>
          <strong>{'Das ist Feuer und Vergessen'}</strong>
          <br />
          <strong>{'Mit allem Glück der Welt gebrannt, doch von Ungeheuern zerfressen'}</strong>
          <br />
          <strong>{'Feuer und Vergessen'}</strong>
          <br />
          <strong>{'Die Wahrheit nur im Geld erkannt und uns dann in Steuern bemessen'}</strong>
          <br />
          <strong>{'Feuer und Vergessen'}</strong>
        </p>
        <p>
          {'Oh wir sind Lichtgestalten, werfen weite Schatten übers Land'}
          <br />
          {"Halten für richtungsweisend, was uns're Ahnen einst erfanden"}
          <br />
          {'Schaffen alles! Wir treiben im Stand, schweigen uns an,'}
          <br />
          {'Haben den Reigen verbrannt in der eigenen Hand'}
        </p>
        <p>
          {'Verneigen uns dann vor Kraft und Mut in gemalten Siegen'}
          <br />
          {'Erschaffen Mut mit Gewalt und Kriegen'}
          <br />
          {'Doch am Ende suchen wir bloß Halt und Frieden'}
          <br />
          {"Trauen der Welt nicht, ob der Tragweite von uns'ren eignen Lügen"}
        </p>
        <p>
          <strong>{'Feuer und Vergessen'}</strong>
          <br />
          <strong>{'Mit allem Glück der Welt gebrannt, doch von Ungeheuern zerfressen'}</strong>
          <br />
          <strong>{'Feuer und Vergessen'}</strong>
          <br />
          <strong>
            {'Was die Wahrheit unsrer Eltern war und tragen uns erneut ins Verbrechen'}
          </strong>
          <br />
          <strong>{'Feuer und Vergessen'}</strong>
        </p>
        <p>
          {'Oh gehen wir als Zeichen von hier'}
          <br />
          {'Um einsam zu frieren?'}
          <br />
          {'Oder bleiben wir dort, wo die Tränen widerspiegeln,'}
          <br />
          {'Dass die Zeit uns gehört'}
          <br />
          {'Und erzählen von Liebe.'}
        </p>
      </Song>
    </>
  )
}
