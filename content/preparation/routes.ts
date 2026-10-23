import { isCmxDocument } from '@cmx-tools/contracts'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { people } from '../people.ts'
import type { ContentPublication, ContentRoute, ReleaseMetadata, SongDefinition } from '../types.ts'

const routes: ContentRoute[] = []
const { content } = JSON.parse(await readFile('.cmx/documents/_routes.json', 'utf8'))
const publications = content.routes as ContentPublication[]
for (const publication of publications) {
  const document = JSON.parse(await readFile(`.cmx/documents/${publication.document}.json`, 'utf8'))
  if (!isCmxDocument(document) || typeof document.content.title !== 'string') {
    throw new Error(`Invalid CMX page: ${publication.document}`)
  }
  let metadata: Partial<ContentRoute> = {}
  if (publication.kind === 'song') {
    const song = document.content.song as SongDefinition
    const authors = song.authors ?? []
    metadata = {
      title: song.title,
      description: `A text written by ${authors.map((author) => author.name).join(', ')}`,
      ogTitle: song.title,
      ogImageTitle: song.title,
      creationDate: song.creationDate,
      authors: authors.map((author) =>
        author.link === people.hannesDiem.link
          ? { ...author, ogProfile: 'https://hannesdiem.de/about' }
          : author,
      ),
    }
  } else if (publication.kind === 'release') {
    const release = document.content.release as ReleaseMetadata
    metadata = {
      title: release.title,
      ogTitle: release.title,
      image: release.cover,
      releaseDate: release.releaseDate,
      songs: release.tracks.flatMap((track) =>
        track.song ? ['https://hannesdiem.de/' + track.song.slug] : [],
      ),
    }
  }
  routes.push({ title: document.content.title, ...metadata, ...publication })
}
await mkdir('.generated', { recursive: true })
await writeFile('.generated/routes.json', JSON.stringify(routes, null, 2) + '\n')
