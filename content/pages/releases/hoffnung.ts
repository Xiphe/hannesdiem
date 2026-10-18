import type { ReleaseMetadata } from '../../types.ts'
import { people } from '../../people.ts'
import { songs } from '../../songs.ts'

export const release = {
  title: 'Hoffnung',
  artist: '',
  cover: 'hannes_diem_hoffnung.jpg',
  releaseDate: '2025-02-28T23:00:00+00:00',
  genres: ['Singer Songwriter'],
  languages: ['German'],
  tracks: [
    { title: 'Gedankengaenge', duration: 165, song: { slug: songs.gedankengaenge.slug } },
    { title: songs.irgendwann.title, duration: 190, song: { slug: songs.irgendwann.slug } },
    {
      title: 'Was Nicht In Worte Passt I',
      duration: 43,
      song: { slug: songs.wasNichtInWortePasst.slug },
    },
    {
      title: 'Vom Müssen Und Können',
      duration: 253,
      song: { slug: songs.vomMuessenUndKoennen.slug },
    },
    { title: songs.meer.title, duration: 280, song: { slug: songs.meer.slug } },
    {
      title: 'Was Nicht In Worte Passt II',
      duration: 49,
      song: { slug: songs.wasNichtInWortePasst.slug },
    },
    { title: songs.leuchtturm.title, duration: 286, song: { slug: songs.leuchtturm.slug } },
    { title: songs.wiedergeboren.title, duration: 154, song: { slug: songs.wiedergeboren.slug } },
    {
      title: 'Was Nicht In Worte Passt III',
      duration: 49,
      song: { slug: songs.wasNichtInWortePasst.slug },
    },
    { title: songs.dieGanzeZeit.title, duration: 187, song: { slug: songs.dieGanzeZeit.slug } },
    { title: 'Stille', duration: 10 },
    { title: 'Feuer Und Vergessen', duration: 228, song: { slug: songs.feuerUndVergessen.slug } },
    {
      title: 'Irgendwann',
      addition: '- Reprise',
      duration: 89,
      song: { slug: songs.irgendwannReprise.slug },
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
