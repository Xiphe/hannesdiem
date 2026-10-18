import { Song } from '@hannesdiem/content-components'
import { songs } from '../../../songs.ts'

const { slug, ...song } = songs.dasVersprechenReprise

export const title = song.title

export default function Content() {
  return (
    <>
      <Song {...song}>
        <p>
          {'Nach vielen Jahren'}
          <br />
          {'Will ich nun ein Versprechen brechen,'}
          <br />
          {'Das ich einst geschworen zu halten,'}
          <br />
          {"Weit hinaus bis über'n Rand"}
        </p>
        <p>
          {"Denn ich hab' zuletzt erkannt,"}
          <br />
          {'Dass Angst und Tod noch an mir nagen'}
          <br />
          {'Und wie Fieber aus mir sprechen,'}
          <br />
          {'Obgleich ich nicht mehr verbannt'}
        </p>
        <p>
          {'Aus meinen Augen fließen keine Blumen mehr'}
          <br />
          {'Und wir haben oft schon andere geküsst'}
          <br />
          {"Die Last, die ich für uns getragen hab', wird mir zu schwer"}
          <br />
          {"Ich halt' sie nicht mehr fest und erkenne das, was blüht"}
        </p>
        <p>
          <strong>{'Und alles geht weiter, wir waren viel zu lang gefangen in uns selbst'}</strong>
          <br />
          <strong>
            {'Ein Geschenk, das keiner nutzt, braucht auch kein Platz in meiner Welt'}
          </strong>
          <br />
          <strong>{'Und viel leichter ist mein Herz, wenn ich loslasse, was mich quält'}</strong>
          <br />
          <strong>{'Ein Versprechen gilt vergessen, wenn niemand mehr darauf zählt'}</strong>
        </p>
      </Song>
    </>
  )
}
