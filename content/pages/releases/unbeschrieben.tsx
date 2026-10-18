import { Release } from '@hannesdiem/content-components'
import type { ReleaseMetadata } from '../../types.ts'
import { people } from '../../people.ts'
import { song as zeigMirDieWelt } from '../songs/zeig-mir-die-welt.tsx'
import { song as absinth } from '../songs/absinth.tsx'
import { song as bruder } from '../songs/bruder.tsx'
import { song as allesBrennt } from '../songs/alles-brennt.tsx'
import { song as dasVersprechen } from '../songs/das-versprechen.tsx'

export const release = {
  title: 'unbeschrieben',
  artist: 'Kaleidos Chaos',
  cover: 'unbeschrieben-cover.jpg',
  releaseDate: '2016-01-31T23:00:00+00:00',
  genres: ['Rock', 'Metal', 'Alternative'],
  languages: ['German'],
  tracks: [
    { duration: 322, song: zeigMirDieWelt },
    { duration: 330, song: absinth },
    { duration: 374, song: bruder },
    { duration: 283, song: allesBrennt },
    { duration: 358, song: dasVersprechen },
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

export const title = release.title

export default function Content() {
  return (
    <>
      <Release {...release}>
        <p>
          {
            'Ein Erstlingswerk. Ein Blatt Papier mit vielen Abdrücken und nur einigen Strichen. Ein Wesen, das bisher nicht gesehen, gehört und verstanden ist. Ein Gedanke, der vielleicht niemals gedacht wird.'
          }
        </p>
        <p>
          {
            'Die Band Kaleidos Chaos hat sich leider während der Produktion dieses Albums getrennt. Wir sind dennoch unsagbar stolz und glücklich, diese Lieder verewigt zu haben und hoffen, dass sie euch genau so sehr gefallen wie uns.'
          }
        </p>
        <p>
          <strong>{'Danke für die wunderbare Zeit!'}</strong>
        </p>
      </Release>
    </>
  )
}
