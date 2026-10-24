import { people } from './people.ts'
import { description } from './site.ts'
import type { PageMetadata, ReleaseMetadata, SongDefinition } from './types.ts'

export function releaseMetadata(
  release: ReleaseMetadata,
  overrides: Partial<PageMetadata> = {},
): PageMetadata {
  return {
    kind: 'release',
    ogType: 'music.album',
    title: release.title,
    description,
    musicians: [`${people.hannesDiem.link}/about`],
    image: release.cover,
    releaseDate: release.releaseDate,
    songs: release.tracks.flatMap((track) =>
      track.song ? ['https://hannesdiem.de/' + track.song.slug] : [],
    ),
    ...overrides,
  }
}

export function songMetadata(
  song: SongDefinition,
  overrides: Partial<PageMetadata> = {},
): PageMetadata {
  const authors = song.authors ?? []
  return {
    kind: 'song',
    ogType: 'music.song',
    title: song.title,
    description: `A text written by ${authors.map((author) => author.name).join(', ')}`,
    creationDate: song.creationDate,
    authors: authors.map((author) =>
      author.link === people.hannesDiem.link
        ? { ...author, ogProfile: 'https://hannesdiem.de/about' }
        : author,
    ),
    ...overrides,
  }
}
