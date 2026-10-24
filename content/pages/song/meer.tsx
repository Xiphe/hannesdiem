import { songMetadata } from '../../metadata.ts'
import type { PageMetadata } from '../../types.ts'

import { Song } from '@hannesdiem/content-components'
import { people } from '../../people.ts'
import type { SongDefinition } from '../../types.ts'

export const song = {
  slug: 'song/meer',
  title: 'Meer',
  subtitle: 'für Roxy',
  creationDate: '2016-08-04T12:00:00+00:00',
  hideCreationDay: true,
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
          {'Mehr Zeit, mehr Reim, mehr Raum und mehr Weit'}
          <br />
          {'Mehr von dem Richtigen machen und mehr mit den Richtigen lachen'}
          <br />
          {'Mehr Crowdsurfen, mehr von dem, was sinnlos scheint,'}
          <br />
          {'Mehr laut hören, was die Beine und den Sinn befreit'}
          <br />
          {'Mehr mit dem Traum flirten, der uns schon seit Kindeszeit'}
          <br />
          {'In dem Vertrauen stört, dass alles, wie es ist, so bleibt'}
        </p>
        <p>
          {'Mehr anders, mehr einfach, mehr klar und mehr gemeinsam'}
          <br />
          {'Mehr von dem Licht, das so unwirklich wirkt'}
          <br />
          {'Mehr wandern, mehr scheiß-drauf, mehr wahr und mehr Erscheinungen'}
          <br />
          {'Mehr von dem Wesen, das im Sturm dich verführt'}
          <br />
          {'Mehr von dem Ganzen und mehr Verzeihen, mehr an den richtigen Punkten verweilen'}
          <br />
          {'Denn ich will mehr mit euch tanzen und mehr mit euch teilen'}
          <br />
          {'Ich will das alles nie mehr allein, nein'}
        </p>
        <p>
          <strong>{'Ich will mehr, mehr Liebe, mehr Angst, Meer und Sand'}</strong>
          <br />
          <strong>{'Die Welt ist leicht und mein Herz schwer entbrannt'}</strong>
          <br />
          <strong>{'Denn im Fliegen erkannten wir uns'}</strong>
          <br />
          <strong>{'Und zwischen Weiß und Schwarz liegt bunt'}</strong>
          <br />
          <strong>{'Beschreiben wir uns, verwirren wir die Welt'}</strong>
          <br />
          <strong>{'Als seien wir im Grund ein Gespinst unsrer selbst'}</strong>
          <br />
          <strong>{'Dort wo du das Meer bist, bin ich die Sterne'}</strong>
          <br />
          <strong>{'Ich will bloß mehr Meer, so gerne'}</strong>
        </p>
        <p>
          {'Und noch ein bisschen mehr Hype und mehr Sein,'}
          <br />
          {'Mehr Traum und mehr Wein, oh'}
          <br />
          {'Ich hab keine Zeit, um schwer zu sein,'}
          <br />
          {'Im Kerzenschein meines Herzens Schmerz zu teilen, nein'}
          <br />
          {'Ich will mehr nichts, damit man sich dazwischen verliert,'}
          <br />
          {'Mehr schmissige Lieder und mich von Küssen ernähren'}
          <br />
          {'Mehr Positives und mehr Glück,'}
          <br />
          {'Mehr Freiheit, mehr Vertrauen, mehr verrückt'}
        </p>
        <p>
          {'Ja, ich will mehr Menschen, mehr Meer Menschen'}
          <br />
          {'Mehr Meer Menschen mögen, ein Meer von weniger Verklemmten'}
          <br />
          {'Mehr, die ohne lang zu zögern noch ihr letztes Hemd verschenken'}
          <br />
          {'Mit Verstand gegen Grenzen und in Gänze für Erkenntnis kämpfen'}
          <br />
          {'Oder für ein kleines Geständnis'}
        </p>
        <p>
          <strong>{'Und noch mehr, mehr Liebe, mehr Angst, Meer und Sand'}</strong>
          <br />
          <strong>{'Die Welt ist leicht und mein Herz schwer entbrannt'}</strong>
          <br />
          <strong>{'Denn im Fliegen erkannten wir uns'}</strong>
          <br />
          <strong>{'Und zwischen Weiß und Schwarz liegt bunt'}</strong>
          <br />
          <strong>{'Beschreiben wir uns, verwirren wir die Welt'}</strong>
          <br />
          <strong>{'Als seien wir im Grund ein Gespinst unsrer selbst'}</strong>
          <br />
          <strong>{'Dort wo du das Meer bist, bin ich die Sterne'}</strong>
          <br />
          <strong>{'Ich will bloß mehr Meer, so gerne'}</strong>
        </p>
        <p>
          {'Oh, ich will einfach nur der Kälte widerstehen'}
          <br />
          {'Ich will Feuer machen und dann im Zelt mit dir leben'}
          <br />
          {'Einfach einmal nur den Weltfrieden sehen'}
          <br />
          {'Ich will singen, tanzen gehen und vergeben'}
          <br />
          {'Und dann legen wir uns nebeneinander'}
          <br />
          {'Und leben jeden Tag, als wär es ein andrer'}
          <br />
          {"Wollen Meer, doch brauchen nicht mal 'n Anker"}
          <br />
          {'Einfach nur mehr Seen sichten und anfangen'}
        </p>
        <p>
          <strong>{'Und noch mehr, mehr Liebe, mehr Angst, Meer und Sand'}</strong>
          <br />
          <strong>{'Die Welt ist leicht und mein Herz schwer entbrannt'}</strong>
          <br />
          <strong>{'Denn im Frieden erkannten wir uns'}</strong>
          <br />
          <strong>{'Und zwischen Weiß und Schwarz liegt bunt'}</strong>
          <br />
          <strong>{'Wir neigen zur Kunst und verwirren uns selbst'}</strong>
          <br />
          <strong>{'Als seien wir im Grund ein Gespinst dieser Welt'}</strong>
          <br />
          <strong>{'Dort wo du das Meer bist, bin ich die Sterne'}</strong>
          <br />
          <strong>{'Ich will bloß mehr Meer, so gerne'}</strong>
        </p>
      </Song>
    </>
  )
}
