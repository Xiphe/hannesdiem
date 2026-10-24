import { songMetadata } from '../../metadata.ts'
import type { PageMetadata } from '../../types.ts'

import { Song } from '@hannesdiem/content-components'
import { people } from '../../people.ts'
import type { SongDefinition } from '../../types.ts'

export const song = {
  slug: 'song/zeig-mir-die-welt',
  title: 'Zeig mir die Welt',
  creationDate: '2014-03-04T12:00:00+00:00',
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
          {'Bin seit Tagen schon'}
          <br />
          {'Blind gewandert und'}
          <br />
          {"Kann die Sterne kaum seh'n"}
          <br />
          {'All die Fragen dort'}
          <br />
          {'Sind so anders dort'}
          <br />
          {"Wo die Träume verblüh'n"}
        </p>
        <p>
          <strong>{'Zeig mir die Welt'}</strong>
          <br />
          {"Ihre Berge und See'n"}
          <br />
          {'Zeig mir die Welt'}
          <br />
          {'Zeig mir ihr schönstes Gesicht'}
          <br />
          {'Zeig mir die Welt'}
          <br />
          {'Die alles gibt, was sie verspricht'}
          <br />
          {'Und ich will mit dir leben'}
          <br />
          {'Solang sie noch hält'}
        </p>
        <p>
          {"Zeig mir dein' Gott und"}
          <br />
          {'Zeig deine Seele'}
          <br />
          {"Zeig dein' Weg, lass mich ein"}
          <br />
          {'Zeig deine Worte und'}
          <br />
          {'Zeig deine Kehle'}
          <br />
          {"Zeig dein Flüstern, dein Schrei'n"}
        </p>
        <p>
          {"Zeig mir dein' Kopfsprung und"}
          <br />
          {'Zeig deine Eiszeit'}
          <br />
          {"Zeig dein Jammern, dein Grau'n"}
          <br />
          {'Zeig deine Hoffnung und'}
          <br />
          {'Zeig deine Freiheit'}
          <br />
          {"Oh zeig mir all dein Vertrau'n"}
        </p>
        <p>
          <strong>{'Zeig mir die Welt'}</strong>
          <br />
          {'Ihre Stürme und Beben'}
          <br />
          {'Zeig mir die Welt'}
          <br />
          {'Zeig mir ihr dunkles Gesicht'}
          <br />
          {'Zeig mir die Welt'}
          <br />
          {'Die alles gibt, was sie verspricht'}
          <br />
          {'Und ich will mit dir leben'}
          <br />
          {'Solang sie noch hält'}
        </p>
        <p>
          <strong>{'Zeig mir die Welt'}</strong>
          <br />
          {'Ihre Mauern und Türme'}
          <br />
          {'Zeig mir die Welt'}
          <br />
          {'Zeig mir ihr Land und ihr Licht'}
          <br />
          {'Zeig mir die Welt'}
          <br />
          {"Die trotz ihrer dunklen Geschicht'"}
          <br />
          {'Und trotz all ihrer Stürme'}
          <br />
          {'Nicht in sich zerfällt'}
        </p>
      </Song>
    </>
  )
}
