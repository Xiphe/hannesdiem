import { isCmxDocument } from '@cmx-tools/contracts'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { people } from '../people.ts'
import type { PageMetadata, ContentRoute, ReleaseMetadata, SongDefinition } from '../types.ts'

const routes: ContentRoute[] = []
const pages: { document: string; path: string }[] = JSON.parse(
  await readFile('.generated/pages.json', 'utf8'),
)
for (const page of pages) {
  const file = `.cmx/documents/${page.document}.json`
  const document = JSON.parse(await readFile(file, 'utf8'))
  if (!isCmxDocument(document) || typeof document.content.title !== 'string') {
    throw new Error(`Invalid CMX page: ${page.document}`)
  }
  const publication = (document.content.metadata ?? { kind: 'page' }) as PageMetadata
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
  const resolved = { title: document.content.title, ...metadata, ...publication }
  document.content.metadata = resolved
  await writeFile(file, JSON.stringify(document) + '\n')
  routes.push({ ...resolved, path: page.path, document: page.document })
}
await mkdir('.generated', { recursive: true })
await writeFile('.generated/routes.json', JSON.stringify(routes, null, 2) + '\n')
