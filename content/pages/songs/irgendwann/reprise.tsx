import { Song } from '@hannesdiem/content-components'
import { songs } from '../../../songs.ts'

const { slug, ...song } = songs.irgendwannReprise

export const title = song.title

export default function Content() {
  return (
    <>
      <Song {...song}>
        <p>
          {'Und irgendwann sahen wir uns wieder'}
          <br />
          {'Irgendwann kam unser Glück zurück'}
          <br />
          {'Irgendwann hat die Sache sich entspannt'}
          <br />
          {'Und wir gingen Stück für Stück  '}
        </p>
        <p>
          {'Und auch wenn einige der großen Fragen'}
          <br />
          {"Heut' noch auf 'ne Antwort warten"}
          <br />
          {"Gab's irgendwann den Punkt, an dem wir uns vertragen haben"}
        </p>
        <p>
          {'Irgendwann bliebst du mir und ich bei dir im Guten'}
          <br />
          {'Irgendwann konnten wir verzeihen und aufhören zu vermuten'}
          <br />
          {'Irgendwann hielten wir kurz an und sagten leise,'}
          <br />
          {'Dass wir uns unglaublich dankbar sind für diese lange Reise'}
        </p>
      </Song>
    </>
  )
}
