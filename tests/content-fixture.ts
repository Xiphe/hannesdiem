import { readFile } from 'node:fs/promises'
import { contentPage, type ContentLoader } from '../app/content.ts'
import { validatePublication, type PublishedDocuments } from '../app/publication.ts'

export const documents: PublishedDocuments = JSON.parse(
  await readFile('.generated/publication.json', 'utf8'),
)
export const site = validatePublication(documents)
export const contentRoutes = site.routes
export const legacyRedirects = new Map(
  site.redirects.map(({ path, ...redirect }) => [path, redirect]),
)
export const loadContent: ContentLoader = async (request) =>
  contentPage(new URL(request.url).pathname, site, (key) => documents[key], 'fixture')
