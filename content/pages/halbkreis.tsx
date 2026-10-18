import { Release } from '@hannesdiem/content-components'

export const title = 'Halbkreis'

export default function Content() {
  return (
    <>
      <Release
        title={'Halbkreis'}
        cover={'hannes_diem_halbkreis.jpg'}
        releaseDate={'2010-08-01T12:00:00+00:00'}
        hideReleaseDay={true}
        genres={['Gothic', 'Rock', 'Pop']}
        languages={['German']}
        tracks={[
          { title: 'Alles Brennt', duration: 229, song: { slug: 'song/alles-brennt' } },
          {
            title: 'Bruder',
            addition: '(Hilf mir mein Freund)',
            duration: 250,
            song: { slug: 'song/bruder' },
          },
          {
            title: 'Die Mühle',
            addition: '(feat. Christina Düwel)',
            duration: 317,
            song: { slug: 'song/die-muehle' },
          },
          { title: 'Pidder Lüng', duration: 219, song: { slug: 'song/pidder-lueng' } },
          {
            title: 'Wie es mir Gefällt',
            duration: 365,
            song: { slug: 'song/wie-es-mir-gefaellt' },
          },
        ]}
        shops={{
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
        }}
        contributors={[
          { name: 'Christina Düwel', roles: ['Vocals', 'Lyricist'] },
          { name: 'Axel Feige', link: 'http://axelfeige.com/', roles: ['Bass'] },
          { name: 'André von Malotki', roles: ['Acoustic Guitar'] },
          { name: 'Alex Henke', link: 'https://skill-music.de/', roles: ['Electric Guitar'] },
          {
            name: 'Jan-Eric Kohrs',
            link: 'https://www.luna-studios.de/',
            roles: ['Producer', 'Programming', 'Keyboards', 'Mixing', 'Arrangement'],
          },
          {
            name: 'Carl Albrecht',
            link: 'https://www.musicmadememillionaire.de/',
            roles: ['Mastering'],
          },
          { name: 'Peter Bischoff', link: 'https://www.bearsongpublishing.de/', roles: ['Label'] },
          {
            name: 'Hannes Diem',
            link: 'https://hannesdiem.de',
            roles: ['Lyricist', 'Composition', 'Vocals', 'Piano', 'Drums', 'Mixing', 'Programming'],
          },
        ]}
      >
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
