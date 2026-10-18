import type { ReleaseMetadata } from '../../types.ts'
import { people } from '../../people.ts'
import { songs } from '../../songs.ts'

export const release = {
  title: 'Halbkreis',
  cover: 'hannes_diem_halbkreis.jpg',
  releaseDate: '2010-08-01T12:00:00+00:00',
  hideReleaseDay: true,
  genres: ['Gothic', 'Rock', 'Pop'],
  languages: ['German'],
  tracks: [
    { title: songs.allesBrennt.title, duration: 229, song: { slug: songs.allesBrennt.slug } },
    {
      title: songs.bruder.title,
      addition: '(Hilf mir mein Freund)',
      duration: 250,
      song: { slug: songs.bruder.slug },
    },
    {
      title: songs.dieMuehle.title,
      addition: '(feat. Christina Düwel)',
      duration: 317,
      song: { slug: songs.dieMuehle.slug },
    },
    { title: songs.pidderLueng.title, duration: 219, song: { slug: songs.pidderLueng.slug } },
    { title: 'Wie es mir Gefällt', duration: 365, song: { slug: songs.wieEsMirGefaellt.slug } },
  ],
  shops: {
    awa: 'https://s.awa.fm/album/bd25e2cb9d989b8f6d35',
    qobuz: 'https://open.qobuz.com/album/bfom4akyiktqb',
    tidal: 'https://www.tidal.com/album/288761084',
    deezer: 'https://www.deezer.com/album/429098327',
    anghami: 'https://play.anghami.com/album/1038212362',
    pandora: 'https://www.pandora.com/artist/hannes-diem/halbkreis/ALwpVnhhqwkbmvP',
    spotify: 'https://open.spotify.com/album/2nN3R1FfMPEJejLUlvx3rm',
    applemusic: 'https://geo.music.apple.com/album/halbkreis-ep/1682033714?app=music',
    amazonmusic: 'https://music.amazon.de/albums/B0C28MJSZJ',
    youtubemusic: 'https://music.youtube.com/channel/MPREb_9mn2Xuk7ISn',
  },
  contributors: [
    { ...people.christinaDuewel, roles: ['Vocals', 'Lyricist'] },
    { ...people.axelFeige, roles: ['Bass'] },
    { ...people.andreVonMalotki, roles: ['Acoustic Guitar'] },
    { ...people.alexHenke, roles: ['Electric Guitar'] },
    {
      ...people.janEricKohrs,
      roles: ['Producer', 'Programming', 'Keyboards', 'Mixing', 'Arrangement'],
    },
    { ...people.carlAlbrecht, roles: ['Mastering'] },
    { ...people.peterBischoff, roles: ['Label'] },
    {
      ...people.hannesDiem,
      roles: ['Lyricist', 'Composition', 'Vocals', 'Piano', 'Drums', 'Mixing', 'Programming'],
    },
  ],
} satisfies ReleaseMetadata
