import hannesDiemHoffnung from '../../media/hannes_diem_hoffnung.jpg'
import { Release } from '@hannesdiem/content-components'
import type { ReleaseMetadata } from '../../types.ts'
import { people } from '../../people.ts'
import { song as gedankengaenge } from '../songs/gedankengaenge.tsx'
import { song as irgendwann } from '../songs/irgendwann.tsx'
import { song as wasNichtInWortePasst } from '../songs/was-nicht-in-worte-passt.tsx'
import { song as vomMuessenUndKoennen } from '../songs/vom-muessen-und-koennen.tsx'
import { song as meer } from '../songs/meer.tsx'
import { song as leuchtturm } from '../songs/leuchtturm.tsx'
import { song as wiedergeboren } from '../songs/wiedergeboren.tsx'
import { song as dieGanzeZeit } from '../songs/die-ganze-zeit.tsx'
import { song as feuerUndVergessen } from '../songs/feuer-und-vergessen.tsx'
import { song as irgendwannReprise } from '../songs/irgendwann/reprise.tsx'

export const release = {
  title: 'Hoffnung',
  artist: '',
  cover: hannesDiemHoffnung,
  releaseDate: '2025-02-28T23:00:00+00:00',
  genres: ['Singer Songwriter'],
  languages: ['German'],
  tracks: [
    { title: 'Gedankengaenge', duration: 165, song: gedankengaenge },
    { duration: 190, song: irgendwann },
    {
      title: 'Was Nicht In Worte Passt I',
      duration: 43,
      song: wasNichtInWortePasst,
    },
    {
      title: 'Vom Müssen Und Können',
      duration: 253,
      song: vomMuessenUndKoennen,
    },
    { duration: 280, song: meer },
    {
      title: 'Was Nicht In Worte Passt II',
      duration: 49,
      song: wasNichtInWortePasst,
    },
    { duration: 286, song: leuchtturm },
    { duration: 154, song: wiedergeboren },
    {
      title: 'Was Nicht In Worte Passt III',
      duration: 49,
      song: wasNichtInWortePasst,
    },
    { duration: 187, song: dieGanzeZeit },
    { title: 'Stille', duration: 10 },
    { title: 'Feuer Und Vergessen', duration: 228, song: feuerUndVergessen },
    {
      title: 'Irgendwann',
      addition: '- Reprise',
      duration: 89,
      song: irgendwannReprise,
    },
  ],
  shops: {
    awa: 'https://s.awa.fm/album/1c1bdd7da4c370383377',
    tidal: 'https://tidal.com/browse/album/419208976',
    deezer: 'https://www.deezer.com/en/album/716237601',
    pandora: 'https://www.pandora.com/artist/hannes-diem/hoffnung/ALzpZ759v5fVZtk',
    spotify: 'https://open.spotify.com/album/0Nk7ncSMtVNDwnwFWMlPRn',
    applemusic: 'https://music.apple.com/de/album/hoffnung/1797551343',
    amazonmusic: 'https://www.amazon.com/music/player/albums/B0DXVRQ5Y7',
    youtubemusic:
      'https://music.youtube.com/playlist?list=OLAK5uy_lUxs-Ud5vwxo08f5Pj3F1nwWarPu6w1qU',
  },
  contributors: [
    { ...people.stefanHeitmann, roles: ['Mastering'] },
    { ...people.leonWeickert, roles: ['Cover Photography'] },
    {
      ...people.hannesDiem,
      roles: ['Acoustic Guitar', 'Vocals', 'Composition', 'Lyricist', 'Mixing'],
    },
  ],
} satisfies ReleaseMetadata

export const title = release.title

export default function Content() {
  return (
    <>
      <Release {...release}>
        <p>
          {
            'Ich habe schon verzweifelt gehofft – ein Gefühl, wenn alles dunkel ist, wenn alles unterzugehen scheint.'
          }
          <br />
          {
            'Im Strudel nach unten sieht diese Hoffnung kein Licht – sie ist bloß zu störrisch um aufzugeben.'
          }
        </p>
        <p>
          {'Ich habe auch verblendet gehofft.'}
          <br />
          {'"Vielleicht könnte es ja dieses Mal klappen.”'}
          <br />
          {
            'Obwohl ich nichts geändert habe, könnten die Sterne ja endlich richtig stehen für mich.'
          }
          <br />
          {'Diese Hoffnung bewegt sich nicht. Sie glaubt. Sie braucht. Aber sie gibt nicht.'}
        </p>
        <p>
          {'Die Hoffnung, die ich hier meine, hat Gewissheit.'}
          <br />
          {
            'Sie trägt ein “Ja!” in sich und gleichzeitig die Wahrheit, dass Tränen geweint werden, Wut geschrien wird und Angst erschüttert.'
          }
          <br />
          {
            'Genau wie Freude gefühlt wird wie dieser silber-bunt glitzernde Film von Kribbeln zwischen den Oberarmen und dem Rauschen der Wellen.'
          }
        </p>
        <p>
          {'Diese Hoffnung sieht.'}
          <br />
          {'Sie begründet sich selbst.'}
          <br />
          {'Sie erschafft, tanzt und spielt.'}
          <br />
          {'Sie bricht auf, sie bricht um.'}
          <br />
          {'Sie hat Geduld, verwandelt sich, treibt an und rührt auf.'}
          <br />
          {'Sie erträgt, gewährt, verzeiht, verbindet und vertraut.'}
        </p>
        <p>
          <br />
        </p>
        <p>{'Sie liebt.'}</p>
      </Release>
    </>
  )
}
