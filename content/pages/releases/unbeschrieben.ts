import type { ReleaseMetadata } from '../../types.ts'
import { people } from '../../people.ts'
import { songs } from '../../songs.ts'

export const release = {
  title: 'unbeschrieben',
  artist: 'Kaleidos Chaos',
  cover: 'unbeschrieben-cover.jpg',
  releaseDate: '2016-01-31T23:00:00+00:00',
  genres: ['Rock', 'Metal', 'Alternative'],
  languages: ['German'],
  tracks: [
    { title: songs.zeigMirDieWelt.title, duration: 322, song: { slug: songs.zeigMirDieWelt.slug } },
    { title: songs.absinth.title, duration: 330, song: { slug: songs.absinth.slug } },
    { title: songs.bruder.title, duration: 374, song: { slug: songs.bruder.slug } },
    { title: songs.allesBrennt.title, duration: 283, song: { slug: songs.allesBrennt.slug } },
    { title: songs.dasVersprechen.title, duration: 358, song: { slug: songs.dasVersprechen.slug } },
  ],
  shops: {
    tidal: 'https://tidal.com/browse/album/60644415',
    deezer: 'https://www.deezer.com/en/album/20950141',
    spotify: 'https://open.spotify.com/album/3yqCGP8cb552TTjbvFcR7X',
    applemusic: 'https://music.apple.com/de/album/unbeschrieben-ep/1074281622',
    amazonmusic: 'https://www.amazon.com/music/player/albums/B01AKD8A8A',
    youtubemusic:
      'https://music.youtube.com/playlist?list=OLAK5uy_km4lcudmp6wIIaL5UB4q3tqr_NrR7KIoQ',
  },
  contributors: [
    {
      ...people.andreVonMalotki,
      roles: ['Electric Guitar', 'Acoustic Guitar', 'Composition', 'Producer'],
    },
    {
      ...people.christinaDuewel,
      roles: ['Vocals', 'Percussion', 'Composition', 'Lyricist', 'Producer', 'Graphic Design'],
    },
    { ...people.davidSchwetmann, roles: ['Drums', 'Composition', 'Producer'] },
    { ...people.johannaLissowsky, roles: ['Violin', 'Composition', 'Producer'] },
    { ...people.timNeils, roles: ['Bass', 'Composition', 'Producer'] },
    {
      ...people.hannesDiem,
      roles: ['Vocals', 'Piano', 'Organ', 'Composition', 'Lyricist', 'Producer', 'Graphic Design'],
    },
    { ...people.alexHenke, roles: ['Mixing', 'Arrangement'] },
    { ...people.olmanViper, roles: ['Mastering'] },
    { ...people.leonChristen, roles: ['Programming'] },
    { ...people.meikeSchlier, roles: ['Photography'] },
    { ...people.federkielFotografie, roles: ['Photography'] },
  ],
} satisfies ReleaseMetadata
