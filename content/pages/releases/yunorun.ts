import type { ReleaseMetadata } from '../../types.ts'
import { people } from '../../people.ts'
import { songs } from '../../songs.ts'

export const release = {
  title: 'Y U NO RUN?',
  cover: 'hannes_diem_yunorun.jpg',
  releaseDate: '2023-09-22T12:00:00+00:00',
  hideReleaseDay: true,
  genres: ['Industrial', 'EBM', 'Electro'],
  languages: ['English'],
  tracks: [
    { title: 'Y U NO RUN?', duration: 323, song: { slug: songs.yunorun.slug } },
    { title: 'Y U NO RUN?', addition: '- Instrumental', duration: 323 },
  ],
  shops: {
    awa: 'https://s.awa.fm/album/ee59d3120aff3d0e4f71',
    qobuz: 'https://open.qobuz.com/album/rxakr0icosv1b',
    deezer: 'https://www.deezer.com/album/477996575',
    pandora: 'https://www.pandora.com/artist/hannes-diem/y-u-no-run/AL9V67pb7X2KcJ4',
    spotify: 'https://open.spotify.com/album/14t6dx7ZvRGjKucQwJftrM',
    applemusic: 'https://geo.music.apple.com/album/y-u-no-run-single/1703273342?app=music',
    amazonmusic: 'https://music.amazon.de/albums/B0CG24X1LZ',
    youtubemusic: 'https://music.youtube.com/channel/MPREb_TpleMTdz5FA',
  },
  contributors: [
    { ...people.carlAlbrecht, roles: ['Programming', 'Mixing', 'Mastering'] },
    {
      ...people.hannesDiem,
      roles: ['Composition', 'Lyricist', 'Vocals', 'Piano', 'Programming', 'Mixing'],
    },
  ],
} satisfies ReleaseMetadata
