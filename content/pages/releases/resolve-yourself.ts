import type { ReleaseMetadata } from '../../types.ts'
import { people } from '../../people.ts'
import { songs } from '../../songs.ts'

export const release = {
  title: 'Resolve Yourself',
  subtitle: 'with Iuli Banu',
  cover: 'hannes_diem_resolve_yourself.jpg',
  releaseDate: '2023-11-25T12:00:00+00:00',
  genres: ['Funk', 'Disco', 'Electro', 'Pop'],
  languages: ['English'],
  tracks: [
    {
      title: songs.resolveYourself.title,
      duration: 335,
      song: { slug: songs.resolveYourself.slug },
    },
    { title: songs.resolveYourself.title, addition: '- Instrumental', duration: 335 },
  ],
  shops: {
    qobuz: 'https://open.qobuz.com/album/qd2r173t9288b',
    tidal: 'https://tidal.com/album/326275254',
    deezer: 'https://www.deezer.com/album/508138171',
    spotify: 'https://open.spotify.com/album/1JHlS2iQP5EU8UPAMOCA8q',
    applemusic: 'https://music.apple.com/album/resolve-yourself-single/1715203861',
    soundcloud: 'https://soundcloud.com/hannesdiem/resolveyourself',
    amazonmusic: 'https://music.amazon.com/albums/B0CMDHH872',
  },
  contributors: [
    { ...people.iuliBanu, roles: ['Spoken Word'] },
    {
      ...people.carlAlbrecht,
      roles: ['Drums', 'Electric Guitar', 'Bass', 'Programming', 'Mixing', 'Mastering'],
    },
    { ...people.leonWeickert, roles: ['Cover Photography'] },
    { ...people.lindaLane, roles: ['Cover Photography'] },
    { ...people.khamkeoVilaysing, roles: ['Cover Photography'] },
    { ...people.lanceAnderson, roles: ['Cover Photography'] },
    {
      ...people.hannesDiem,
      roles: [
        'Composition',
        'Lyricist',
        'Vocals',
        'E-Piano',
        'Hammond Organ',
        'Percussion',
        'Programming',
        'Mixing',
        'Graphic Design',
      ],
    },
  ],
} satisfies ReleaseMetadata
