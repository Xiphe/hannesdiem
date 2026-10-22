import { readFile } from 'node:fs/promises'
import { createContentSource } from '../../website/app/document-host/index.ts'
import { validatePublication, type PublishedDocuments } from '../../contracts/content.ts'

export const documents: PublishedDocuments = JSON.parse(
  await readFile('.generated/publication.json', 'utf8'),
)
export const site = validatePublication(documents)
export const contentRoutes = site.routes
export const legacyRedirects = new Map(
  site.redirects.map(({ path, ...redirect }) => [path, redirect]),
)
export const loadContent = createContentSource(documents, 'fixture')
