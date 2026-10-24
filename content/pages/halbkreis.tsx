import type { PageMetadata } from '../types.ts'

import hannesDiemHalbkreis from '../media/hannes_diem_halbkreis.jpg'
import { Release } from '@hannesdiem/content-components'
import type { ReleaseMetadata } from '../types.ts'
import { people } from '../people.ts'
import { song as allesBrennt } from './song/alles-brennt.tsx'
import { song as bruder } from './song/bruder.tsx'
import { song as dieMuehle } from './song/die-muehle.tsx'
import { song as pidderLueng } from './song/pidder-lueng.tsx'
import { song as wieEsMirGefaellt } from './song/wie-es-mir-gefaellt.tsx'

export const metadata = {
  kind: 'release',
  description: '...about Music, Life, and Everything',
  ogType: 'music.album',
  updatedAt: '2025-02-28T11:05:34.098+00:00',
  sourceId: '1ebc587e-31a3-489a-aac4-e48c8927d18e',
  musicians: ['https://hannesdiem.de/about'],
} satisfies PageMetadata

export const release = {
  title: 'Halbkreis',
  cover: hannesDiemHalbkreis,
  releaseDate: '2010-08-01T12:00:00+00:00',
  hideReleaseDay: true,
  genres: ['Gothic', 'Rock', 'Pop'],
  languages: ['German'],
  tracks: [
    { duration: 229, song: allesBrennt },
    {
      addition: '(Hilf mir mein Freund)',
      duration: 250,
      song: bruder,
    },
    {
      addition: '(feat. Christina Düwel)',
      duration: 317,
      song: dieMuehle,
    },
    { duration: 219, song: pidderLueng },
    { title: 'Wie es mir Gefällt', duration: 365, song: wieEsMirGefaellt },
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

export const title = release.title

export default function Content() {
  return (
    <>
      <Release {...release}>
        <h3>{'My debut EP'}</h3>
        <p>
          {
            'In many ways the cornerstone for my work today. One year later this project has become the band "Kaleidos Chaos" and we played the tracks until we split up in summer 2014. During the studio work with Jan I have not only had a whole lot of fun but also learned a lot 💜'
          }
        </p>
      </Release>
    </>
  )
}
