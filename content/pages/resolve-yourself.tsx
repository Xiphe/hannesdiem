import { Release } from '@hannesdiem/content-components'

export const title = 'Resolve Yourself'

export default function Content() {
  return (
    <>
      <Release
        title={'Resolve Yourself'}
        subtitle={'with Iuli Banu'}
        cover={'hannes_diem_resolve_yourself.jpg'}
        releaseDate={'2023-11-25T12:00:00+00:00'}
        genres={['Funk', 'Disco', 'Electro', 'Pop']}
        languages={['English']}
        tracks={[
          { title: 'Resolve Yourself', duration: 335, song: { slug: 'song/resolve-yourself' } },
          { title: 'Resolve Yourself', addition: '- Instrumental', duration: 335 },
        ]}
        shops={{
          qobuz: 'https://open.qobuz.com/album/qd2r173t9288b',
          tidal: 'https://tidal.com/album/326275254',
          deezer: 'https://www.deezer.com/album/508138171',
          spotify: 'https://open.spotify.com/album/1JHlS2iQP5EU8UPAMOCA8q',
          applemusic: 'https://music.apple.com/album/resolve-yourself-single/1715203861',
          soundcloud: 'https://soundcloud.com/hannesdiem/resolveyourself',
          amazonmusic: 'https://music.amazon.com/albums/B0CMDHH872',
        }}
        contributors={[
          { name: 'Iuli Banu', link: 'https://iuliversum.com/', roles: ['Spoken Word'] },
          {
            name: 'Carl Albrecht',
            link: 'https://www.musicmadememillionaire.de/',
            roles: ['Drums', 'Electric Guitar', 'Bass', 'Programming', 'Mixing', 'Mastering'],
          },
          { name: 'Leon Weickert', link: 'https://devert.net/', roles: ['Cover Photography'] },
          { name: 'Linda Lane', link: 'https://wonderlane.com/', roles: ['Cover Photography'] },
          {
            name: 'Khamkéo Vilaysing',
            link: 'https://www.kham-keo.com/',
            roles: ['Cover Photography'],
          },
          {
            name: 'Lance Anderson',
            link: 'https://www.lanceanderson.net/',
            roles: ['Cover Photography'],
          },
          {
            name: 'Hannes Diem',
            link: 'https://hannesdiem.de',
            description: '',
            roles: [
              'Composition',
              'Lyricist',
              'Vocals',
              ' E-Piano',
              'Hammond Organ',
              'Percussion',
              'Programming',
              'Mixing',
              'Graphic Design',
            ],
          },
        ]}
      >
        <h2>{'An Unexpected Journey'}</h2>
        <p>
          {
            'It\'s so fascinating how "Resolve Yourself" seemed to have found its own way through me. The chorus came to life '
          }
          <a href={'https://www.youtube.com/watch?v=mNlwbS732rM'}>
            {'during an improvisational live-stream'}
          </a>
          {', almost as if my subconscious had a message it was itching to share.'}
        </p>
        <p>
          {
            'The vivid imagery in the song is deeply influenced by a serene walk I took in a forest in Tarifa, Spain '
          }
          <em>{'(on the right side of the cover)'}</em>
          {' — a trip that nourished my emotional reservoirs for weeks on end.'}
        </p>
        <p>
          {
            "From there, the song's narrative evolved into a journey going inward, diving into a myriad of landscapes — starting with the clearing that inspired it all, moving through an ethereal underwater realm, and finally expanding into the endless possibilities of deep space."
          }
        </p>
        <p>
          {
            'Each setting in the song serves as a metaphorical space to explore within oneself, inviting the listener to take their own inward journey.'
          }
        </p>
        <h3>{'Inner Work'}</h3>
        <p>
          {
            'For me, this track is an invitation to blend two worlds that I hold dear: the realm of music and the ongoing journey of self-exploration.'
          }
        </p>
        <p>
          {
            "What fascinates me is how the song naturally emerged as a space where danceable grooves and introspection could coexist so comfortably. When the meditative voice-overs kick in, it's like receiving a subtle nudge to go deeper while still riding the uplifting waves of funk and disco."
          }
        </p>
        <p>
          {
            "It's a reflection of my belief that the process of understanding oneself doesn't always have to be heavy or tedious — it can be joyful, rhythmic, and incredibly freeing."
          }
        </p>
        <h3>{'A Voice That Resonated'}</h3>
        <p>
          {
            'That said, my past few years have been a rollercoaster of emotional and mental challenges. Finding the right help seemed like an insurmountable obstacle, with therapists being almost impossible to reach.'
          }
        </p>
        <p>
          {'When I finally connected with my emotional coach, '}
          <a href={'https://iuliversum.com/'}>{'Iuli Banu'}</a>
          {
            ", it felt like I had discovered a lifeline. Her guidance provided me with the emotional resources I needed to grow and heal. It's an experience that continues to encourage me to truly dissolve in myself in order to resolve myself."
          }
        </p>
        <p>
          {
            "Incorporating her wasn't part of the initial plan, but once the idea emerged, it felt incredibly fitting. Now her words are an essential part of this song, inviting listeners to engage with their own emotional landscapes while grooving to the music."
          }
          <br />
          {
            'Hearing Iulis voice on the track, I feel a sense of validation — that my healing journey is going into a direction worth sharing.'
          }
        </p>
        <h3>{'The Musical Soul'}</h3>
        <p>
          {'A special shout-out must go to my Partner, '}
          <a href={'https://www.musicmadememillionaire.de/'}>{'CArl'}</a>
          {
            ', who did more than just perfect the technical aspects of the song. He played most of the live instruments, and each time he sent me an update of his work, my smile just got wider.'
          }
        </p>
        <p>
          {
            'His expert touch truly brought the funk to life in "Resolve Yourself," making the track more groovy and danceable. CArl\'s role was instrumental, quite literally, in ensuring the song came together as the lively, uplifting experience it has become.'
          }
        </p>
      </Release>
    </>
  )
}
