import { songMetadata } from '../../metadata.ts'
import type { PageMetadata } from '../../types.ts'

import { Song } from '@hannesdiem/content-components'
import { people } from '../../people.ts'
import type { SongDefinition } from '../../types.ts'

export const song = {
  slug: 'song/das-versprechen',
  title: 'Das Versprechen',
  creationDate: '2014-07-04T12:00:00+00:00',
  hideCreationDay: true,
  authors: [people.hannesDiem, people.christinaDuewel],
} satisfies SongDefinition

const { slug, ...lyrics } = song

export const metadata = songMetadata(song) satisfies PageMetadata

export const title = song.title

export default function Content() {
  return (
    <>
      <Song {...lyrics}>
        <p>
          {'Ein bisschen weiter'}
          <br />
          {"Wir geh'n vorüber"}
          <br />
          {'An den Wegen, die den Liebenden gemacht'}
          <br />
          {"Hab' dich geborgen"}
          <br />
          {"Doch uns're Lasten wiegen"}
          <br />
          {"Viel zu schwer, und ich hab' oft daran gedacht"}
        </p>
        <p>
          {'Aus meinen Augen fließen Rosen'}
          <br />
          {'Seit du mich damals geküsst'}
          <br />
          {"Und so üb' ich mich in Frohsinn"}
          <br />
          {"Und halt' dich bei mir fest, bis du dort verblühst"}
        </p>
        <p>
          <strong>{'Ich kann im Leben und im Tod nicht von dir lassen'}</strong>
          <br />
          <strong>{'Doch aus deiner Welt bin ich schon lang verbannt'}</strong>
          <br />
          <strong>{"Und wenn im Zeichen dieses Wegs auch uns're roten Münder blassen"}</strong>
          <br />
          <strong>{'Bin ich doch auf dich gebrannt und trage mein Versprechen'}</strong>
          <br />
          <strong>{'Bis über den Rand'}</strong>
        </p>
        <p>
          {'Ein bisschen weiter'}
          <br />
          {"Wir geh'n im Regen"}
          <br />
          {'Einen Pfad entlang, der lange schon verwischt'}
          <br />
          {'Wir sind gestorben'}
          <br />
          {'Doch unsre Herzen leben'}
          <br />
          {'Einen Traum, der täglich mehr erlischt'}
        </p>
        <p>
          {'Aus meinen Augen fließen Rosen'}
          <br />
          {'Seit du mich damals geküsst'}
          <br />
          {'Und die Stürme in mir tosen'}
          <br />
          {"Ich halt' dich bei mir fest, bis du dort verblühst"}
        </p>
        <p>
          <strong>{'Ich kann im Leben und im Tod nicht von dir lassen'}</strong>
          <br />
          <strong>{'Doch aus deiner Welt bin ich schon lang verbannt'}</strong>
          <br />
          <strong>{"Und wenn im Zeichen dieses Wegs auch uns're roten Münder blassen"}</strong>
          <br />
          <strong>{'Bin ich doch auf dich gebrannt und trage mein Versprechen'}</strong>
          <br />
          <strong>{'Bis über den Rand'}</strong>
        </p>
        <p>
          {"Und was ich dir heute zeig'"}
          <br />
          {"Das mal' ich auf deinen Leib"}
          <br />
          {"Und was ich vergess', macht uns nicht blind"}
          <br />
          {'Es zeichnet die Worte in den Wind'}
          <br />
          {'Und wenn uns kein Traum mehr bleibt'}
          <br />
          {'Verloren im Fluss der Zeit'}
          <br />
          {'Bleibt dein Bild in mir, so wie du bist'}
          <br />
          {'Seitdem du mich damals geküsst'}
        </p>
        <p>
          <strong>{"Ich wollt' im Leben nicht von deiner Seite lassen"}</strong>
          <br />
          <strong>{'Doch aus deiner Welt bin ich schon lang verbannt'}</strong>
          <br />
          <strong>{"Und wenn im Zeichen dieses Wegs auch uns're roten Münder blassen"}</strong>
          <br />
          <strong>{"Halt' ich dich fest in meiner Hand"}</strong>
          <br />
          <strong>{'Und jede Stunde glüht wie heißer Sand'}</strong>
          <br />
          <strong>{'Doch ist mein Schiff erst neu bemannt'}</strong>
          <br />
          <strong>{'Dann trägt mich dieser Wind weit übers Land'}</strong>
          <br />
          <strong>{'Denn ich bin fest auf dich gebrannt und trage mein Versprechen'}</strong>
          <br />
          <strong>{'Bis über den Rand'}</strong>
        </p>
      </Song>
    </>
  )
}
