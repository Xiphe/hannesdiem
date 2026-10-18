import { Song } from '@hannesdiem/content-components'
import { songs } from '../../songs.ts'

const { slug, ...song } = songs.leuchtturm

export const title = song.title

export default function Content() {
  return (
    <>
      <Song {...song}>
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
