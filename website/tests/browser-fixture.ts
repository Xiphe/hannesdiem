import type { CmxNode } from '@cmx-tools/contracts'
import type { MediaImage, SiteMetadata } from '../../contracts/content.ts'
import { documents as minimal } from './host-fixture.ts'

// CMS-shaped input owned by the website tests; no authored content or build output.
export const image: MediaImage = {
  src: '/fixture-media/cover.svg',
  width: 640,
  height: 640,
  alt: 'Synthetic cover',
}
export const imageSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640"><rect width="640" height="640" fill="#5874a8"/></svg>'
const component = (
  name: string,
  props: Record<string, unknown>,
  children?: CmxNode[],
): CmxNode => ({
  type: 'component',
  from: '@hannesdiem/content-components',
  import: name,
  props,
  children,
})
const text = (tag: string, value: string): CmxNode => ({ type: 'element', tag, children: [value] })
const song = { slug: 'song/fixture-song', title: 'Fixture song' }
const shops = {
  amazonmusic: 'https://example.org/amazon',
  soundcloud: 'https://example.org/soundcloud',
}
const release = (title: string, count: number) =>
  component('Release', {
    title,
    cover: image,
    releaseDate: '2020-01-01',
    shops,
    tracks: Array.from({ length: count }, (_, index) => ({
      song,
      title: `Fixture track ${index + 1}`,
      duration: 120,
    })),
  })
const pages: Record<string, { kind: string; title: string; body: CmxNode }> = {
  'fixture-invitations': {
    kind: 'temple',
    title: 'Fixture invitations',
    body: component('PoemCanvas', {}, [
      component('InvitationGrid', {}, [
        component(
          'InvitationCard',
          {
            id: 'fixture-invitation',
            title: 'Fixture invitation',
            action: { label: 'Open fixture details', target: 'fixture-invitation-details' },
          },
          [text('p', 'Static invitation description.')],
        ),
        component(
          'InvitationDetails',
          {
            id: 'fixture-invitation-details',
            title: 'Fixture details',
          },
          [
            text('p', 'Static dialog explanation.'),
            {
              type: 'element',
              tag: 'a',
              props: { href: '/fixture' },
              children: ['Return to fixture'],
            },
          ],
        ),
      ]),
    ]),
  },
  'fixture-release': {
    kind: 'release',
    title: 'Fixture release',
    body: release('Fixture release', 4),
  },
  'fixture-long-release': {
    kind: 'release',
    title: 'Long fixture release',
    body: release('Long fixture release', 16),
  },
  'fixture-single': {
    kind: 'release',
    title: 'Fixture single',
    body: release('Fixture single', 1),
  },
  'fixture-ep': { kind: 'release', title: 'Fixture EP', body: release('Fixture EP', 2) },
  'song/fixture-song': {
    kind: 'song',
    title: song.title,
    body: component(
      'Song',
      {
        title: song.title,
        authors: [{ name: 'Fixture author' }],
      },
      [text('p', 'Synthetic lyrics for the browser fixture.')],
    ),
  },
  'fixture-portraits': {
    kind: 'page',
    title: 'Fixture portraits',
    body: component('Page', {}, [
      text('h1', 'Fixture portraits'),
      component('TextBlock', { title: 'Fixture portrait card', portrait: image }, [
        text('p', 'Synthetic card text.'),
      ]),
    ]),
  },
  'fixture-links': {
    kind: 'page',
    title: 'Fixture links',
    body: component('LinkTree', {
      portrait: image,
      links: [],
      otherLinks: [],
      music: [{ title: 'Amazon Music', href: shops.amazonmusic, icon: 'AmazonMusic' }],
    }),
  },
}
export const documents = structuredClone(minimal)
export const site = documents._site.content.site as SiteMetadata
documents._redirects.content.redirects = [
  { path: '/', to: '/fixture-links', status: 307, preserveSearch: true },
  { path: '/fixture-alias', to: '/fixture-release', status: 308 },
]
site.navigation = {
  sections: [
    {
      name: 'Fixture',
      items: [
        { name: 'Fixture', href: '/fixture' },
        ...Object.entries(pages).map(([key, page]) => ({ name: page.title, href: '/' + key })),
      ],
    },
  ],
  legal: { name: 'Fixture legal', items: [{ name: 'Fixture legal', href: '/fixture' }] },
  social: [{ title: 'Twitch', name: 'Twitch', href: 'https://example.org/twitch' }],
  listen: [
    { title: 'Spotify', name: 'Spotify', href: 'https://example.org/spotify' },
    { title: 'Amazon Music', name: 'AmazonMusic', href: shops.amazonmusic },
    { title: 'SoundCloud', name: 'SoundCloud', href: shops.soundcloud },
  ],
}
for (const [key, page] of Object.entries(pages)) {
  documents[key] = {
    ...structuredClone(minimal.fixture),
    content: {
      title: page.title,
      default: page.body,
      metadata: { kind: page.kind, ...(page.kind === 'release' ? { image } : {}) },
    },
  }
}
