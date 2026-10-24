import { songMetadata } from '../../metadata.ts'
import type { PageMetadata } from '../../types.ts'

import { Song } from '@hannesdiem/content-components'
import { people } from '../../people.ts'
import type { SongDefinition } from '../../types.ts'

export const song = {
  slug: 'song/gedankengaenge',
  title: 'Gedankengänge',
  creationDate: '2024-09-02T12:00:00+00:00',
  hideCreationDay: true,
  authors: [people.hannesDiem],
} satisfies SongDefinition

const { slug, ...lyrics } = song

export const metadata = songMetadata(song, {
  kind: 'song',
  ogType: 'music.song',
  updatedAt: '2025-02-27T15:37:49.831+00:00',
  sourceId: '4ee8263a-2053-4b56-9c01-a398e9229287',
}) satisfies PageMetadata

export const title = song.title

export default function Content() {
  return (
    <>
      <Song {...lyrics}>
        <p>
          {"Ich kann das nicht, will das nicht, werd' das nicht hinkriegen"}
          <br />
          {"Und es liegt an mir! Ich hab' einfach kein Talent, muss mich fügen"}
          <br />
          {'Die anderen sind eh besser, ich bin da zu empfindsam'}
          <br />
          {'Und das Gefühl wird immer bleiben, denn es war schon immer da'}
        </p>
        <p>
          {'Ich bin dreckig, die Fantasien so komisch, das ist peinlich'}
          <br />
          {"Darum verstecke ich mich gerne hinter Großen, und dort bleib' ich"}
          <br />
          {'Ich bin h-hektisch, weiß, dass es mit mir nicht immer leicht ist'}
          <br />
          {'Ich bin kleinlich, zickig, ängstlich und zu streng'}
        </p>
        <p>
          <strong>{'Und je öfter ich auf diesen Pfaden gehe'}</strong>
          <br />
          <strong>{"Umso breiter wird das Pflaster, und es macht mir kaum noch Müh'n"}</strong>
          <br />
          <strong>{'So werden langsam Straßen aus den Wegen'}</strong>
          <br />
          <strong>{"Bis Asphalt liegt, wo einst bunte Blumen blühn'"}</strong>
          <br />
          <strong>{"Bis Asphalt liegt, wo einst bunte Blumen blühn'"}</strong>
        </p>
        <p>
          {"Hey, ich kann das! Werd' das schaffen! Und wenn nicht, dann daran wachsen"}
          <br />
          {"Für mich ist das ein Klacks, denn ich hab' Kraft, Geduld und Wert"}
          <br />
          {'Ich bin schön genug und mache das mit Löwenmut'}
          <br />
          {"Trag' in mir einen König, eine Königin, ein Affen und ein Pferd"}
        </p>
        <p>
          {'Und ich vertraue auf mich, mein hohes Selbst und meine Liebe'}
          <br />
          {'Und ich glaube an das Gute in den Schatten und der Tiefe'}
          <br />
          {"Ich bin stolz auf mich, mein Wesen kann ich gut im Spiegel seh'n"}
          <br />
          {'Denn ich bin richtig und perfekt und für jeden ein Geschenk'}
        </p>
        <p>
          <strong>{'Denn ich weiß, aus diesen Pfaden werden Wege'}</strong>
          <br />
          <strong>{"Und ein Weg wird gern benutzt, wenn an ihm bunte Blumen blüh'n"}</strong>
          <br />
          <strong>{'Und eine Allee wird schön, wenn ich sie pflege'}</strong>
          <br />
          <strong>{'Und Asphalt, der nicht befahren wird, wird wieder grün'}</strong>
          <br />
          <strong>{'Und Asphalt, der nicht befahren wird, wird wieder grün'}</strong>
        </p>
        <p>
          {"Aber du musst, du sollst, du brauchst, du wirst sonst, glaub' mir,"}
          <br />
          {'Mach das, du bist sonst aaaah, und hast du schon? wann? wann? wann?'}
        </p>
        <p>
          {'Manchmal ist mir alles zu laut'}
          <br />
          {'Denn es gibt so viele Straßen, die sind von anderen gebaut'}
          <br />
          {'Und das ist zwar stabil und vertraut'}
          <br />
          {'Aber so sehr gewohnt, dass fast alles sich staut'}
          <br />
          {'Doch es gibt auch querfeldein den Blick in die Ferne'}
          <br />
          {"Es braucht bloß einen Schritt und einen Schritt, und ich lauf'"}
          <br />
          {
            'Links und rechts, bis ich das Geradeausgehen verlerne Denn ein Pfad voller Kurven führt zwar nicht nach vorn'
          }
          <br />
          {'Aber doch auf den Gipfel hinauf'}
        </p>
      </Song>
    </>
  )
}
