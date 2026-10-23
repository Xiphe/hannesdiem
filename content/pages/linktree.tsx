import portrait from '../media/portrait.png'
import { LinkTree } from '@hannesdiem/content-components'

export const title = 'Hannes Diem'

export default function Content() {
  return (
    <>
      <LinkTree
        portrait={portrait}
        links={[
          {
            title: 'Twitch',
            href: 'https://www.twitch.tv/hannes_diem',
            description: 'join me transforming emotions to sounds, usually Thursdays',
            icon: 'Twitch',
          },
          {
            title: 'YouTube',
            href: 'https://www.youtube.com/@hannes_diem',
            description: 'get some danceable emotions on demand',
            icon: 'YouTube',
          },
          {
            title: 'Instagram',
            href: 'https://www.instagram.com/hannes.diem/',
            description: 'shiny feelings for shiny people',
            icon: 'Instagram',
          },
          {
            title: 'TikTok',
            href: 'https://www.tiktok.com/@hannes.diem',
            description: "let's duet!",
            icon: 'TikTok',
          },
        ]}
        music={[
          {
            title: 'Spotify',
            href: 'https://open.spotify.com/artist/2eaXfpAkFuTlmu5IsLhxMl',
            icon: 'Spotify',
          },
          {
            title: 'Apple Music',
            href: 'https://music.apple.com/us/artist/hannes-diem/377388675',
            icon: 'AppleMusic',
          },
          {
            title: 'Amazon Music',
            href: 'https://www.amazon.com/s?k=Hannes+Diem',
            icon: 'AmazonMusic',
          },
          { title: 'Deezer', href: 'https://www.deezer.com/us/artist/533043', icon: 'Deezer' },
          { title: 'Tidal', href: 'https://tidal.com/browse/artist/3711015', icon: 'Tidal' },
          { title: 'SoundCloud', href: 'https://soundcloud.com/hannesdiem', icon: 'SoundCloud' },
        ]}
        otherLinks={[
          {
            title: 'susy.world',
            href: 'https://instagram.com/susy.world',
            description: 'vanlifing around europe',
            icon: 'Instagram',
          },
          {
            title: 'Xiphe',
            href: 'https://xiphe.net',
            description: 'improving the "web" | "team" | "process" | "world"',
            icon: 'Globe',
          },
        ]}
      >
        <strong>{"Hi I'm Hannes, so good to see you here 💙"}</strong>
        <span>
          {'Please be kindly invited to connect with me and find more content on these platforms:'}
        </span>
      </LinkTree>
    </>
  )
}
