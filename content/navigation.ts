import type { SiteMetadata } from '../contracts/content.ts'

export const socialLinks = [
  { title: 'Twitch', href: 'https://www.twitch.tv/hannes_diem', name: 'twitch' },
  { title: 'YouTube', href: 'https://www.youtube.com/@hannes_diem', name: 'youtube' },
  { title: 'Instagram', href: 'https://www.instagram.com/hannes.diem/', name: 'instagram' },
  { title: 'TikTok', href: 'https://www.tiktok.com/@hannes.diem', name: 'tiktok' },
]
export const listenLinks = [
  {
    title: 'Spotify',
    href: 'https://open.spotify.com/artist/2eaXfpAkFuTlmu5IsLhxMl',
    name: 'spotify',
  },
  {
    title: 'Apple Music',
    href: 'https://music.apple.com/us/artist/hannes-diem/377388675',
    name: 'applemusic',
  },
  { title: 'Deezer', href: 'https://www.deezer.com/us/artist/533043', name: 'deezer' },
  { title: 'Amazon Music', href: 'https://www.amazon.com/s?k=Hannes+Diem', name: 'amazonmusic' },
  { title: 'Tidal', href: 'https://tidal.com/browse/artist/3711015', name: 'tidal' },
  { title: 'SoundCloud', href: 'https://soundcloud.com/hannesdiem', name: 'soundcloud' },
]
export const navigation = {
  sections: [
    { name: 'Work', collection: 'release', items: [] },
    {
      name: 'One Week Album',
      items: [
        { name: 'About', href: '/one-week-album' },
        { name: 'California 2024 Recap', href: '/one-week-album/california-2024' },
        { name: 'Løkken 2024 Recap', href: '/one-week-album/lokken-2024' },
      ],
    },
  ],
  legal: {
    name: 'Legal',
    items: [
      { name: 'Imprint', href: '/imprint' },
      { name: 'Privacy', href: '/privacy' },
    ],
  },
  social: socialLinks,
  listen: listenLinks,
} satisfies SiteMetadata['navigation']
