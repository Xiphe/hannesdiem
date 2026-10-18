import { Release } from '@hannesdiem/content-components'

export const title = 'unbeschrieben'

export default function Content() {
  return (
    <>
      <Release
        title={'unbeschrieben'}
        artist={'Kaleidos Chaos'}
        cover={'unbeschrieben-cover.jpg'}
        releaseDate={'2016-01-31T23:00:00+00:00'}
        genres={['Rock', 'Metal', 'Alternative']}
        languages={['German']}
        tracks={[
          { title: 'Zeig mir die Welt', duration: 322, song: { slug: 'song/zeig-mir-die-welt' } },
          { title: 'Absinth', duration: 330, song: { slug: 'song/absinth' } },
          { title: 'Bruder', duration: 374, song: { slug: 'song/bruder' } },
          { title: 'Alles Brennt', duration: 283, song: { slug: 'song/alles-brennt' } },
          { title: 'Das Versprechen', duration: 358, song: { slug: 'song/das-versprechen' } },
        ]}
        shops={{
          tidal: 'https://tidal.com/browse/album/60644415',
          deezer: 'https://www.deezer.com/en/album/20950141',
          spotify: 'https://open.spotify.com/album/3yqCGP8cb552TTjbvFcR7X',
          applemusic: 'https://music.apple.com/de/album/unbeschrieben-ep/1074281622',
          amazonmusic: 'https://www.amazon.com/music/player/albums/B01AKD8A8A',
          youtubemusic:
            'https://music.youtube.com/playlist?list=OLAK5uy_km4lcudmp6wIIaL5UB4q3tqr_NrR7KIoQ',
        }}
        contributors={[
          {
            name: 'André von Malotki',
            roles: ['Electric Guitar', 'Acoustic Guitar', 'Composition', 'Producer'],
          },
          {
            name: 'Christina Düwel',
            roles: [
              'Vocals',
              'Percussion',
              'Composition',
              'Lyricist',
              'Producer',
              'Graphic Design',
            ],
          },
          { name: 'David Schwetmann', roles: ['Drums', 'Composition', 'Producer'] },
          { name: ' Johanna Lissowsky', roles: ['Violin', 'Composition', 'Producer'] },
          { name: 'Tim Neils', roles: ['Bass', 'Composition', 'Producer'] },
          {
            name: 'Hannes Diem',
            link: 'https://hannesdiem.de',
            roles: [
              'Vocals',
              'Piano',
              'Organ',
              'Composition',
              'Lyricist',
              'Producer',
              'Graphic Design',
            ],
          },
          { name: 'Alex Henke', link: 'https://skill-music.de/', roles: ['Mixing', 'Arrangement'] },
          { name: 'Olman Viper', link: 'https://www.hertzwerk.de/', roles: ['Mastering'] },
          { name: 'Leon Christen', link: '', roles: ['Programming'] },
          { name: 'Meike Schlier', roles: ['Photography'] },
          {
            name: 'Federkiel Fotografie',
            link: 'https://www.facebook.com/FederkielFotografie',
            roles: ['Photography'],
          },
        ]}
      >
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
