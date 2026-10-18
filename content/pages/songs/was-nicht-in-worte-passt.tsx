import { Song } from '@hannesdiem/content-components'
import { songs } from '../../songs.ts'

const { slug, ...song } = songs.wasNichtInWortePasst

export const title = song.title

export default function Content() {
  return (
    <>
      <Song {...song}>
        <p>
          {'Zwischen Milliarden von Farben'}
          <br />
          {'Stehen zwei Wagen'}
          <br />
          {'ist die Welt sehr fern'}
          <br />
          {'Die Nacht wird zu Jahren,'}
          <br />
          {'um so viel zu erfahren'}
          <br />
          {"und so viel zu verlern'"}
        </p>
        <p>
          <strong>{'Was Augen nicht zu sehen vermögen mahlt die Fantasie'}</strong>
          <br />
          <strong>{'Und das was nicht in Worte passt sagt diese Melodie'}</strong>
        </p>
        <p>
          {'Zwischen Millionen von Leben'}
          <br />
          {'Treffen sich ein paar Seelen'}
          <br />
          {'Unter dem gleichen Stern'}
          <br />
          {'Um sich selbst zu verstehen'}
          <br />
          {'Darin Hoffnung zu sehen'}
          <br />
          {'Um eine Welt zu erklären'}
        </p>
        <p>
          <strong>{'Was Augen nicht zu sehen vermögen mahlt die Fantasie'}</strong>
          <br />
          <strong>{'Und das was nicht in Worte passt sagt diese Melodie'}</strong>
        </p>
        <p>
          {'Dann nach tausenden Meilen'}
          <br />
          {'Spiegelt sich in den Zeilen'}
          <br />
          {'Was im Herz sich erkennt'}
          <br />
          {'Um alte Wunden zu heilen'}
          <br />
          {'Und im Traum zu verweilen'}
          <br />
          {'Gestärkt und ungehemmt'}
        </p>
        <p>
          <strong>{'Was Augen nicht zu sehen vermögen mahlt die Fantasie'}</strong>
          <br />
          <strong>{'Und das was nicht in Worte passt sagt diese Melodie'}</strong>
        </p>
      </Song>
    </>
  )
}
