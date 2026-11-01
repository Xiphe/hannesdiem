import { isCmxDocument, type CmxDocument } from '@cmx-tools/contracts'
import {
  validatePublication,
  type ContentRoute,
  type SiteMetadata,
  type PublishedDocuments,
  type PublicationIndex,
  type ContentRedirect,
} from '../../../contracts/content.ts'

export interface ContentPage {
  document: CmxDocument
  status: 200 | 404
  key: string
  route?: ContentRoute
  site: SiteMetadata
  routes: ContentRoute[]
  redirects: ContentRedirect[]
  contentHash: string
}
export type ContentLoader = (request: Request) => Promise<ContentPage>

export function contentPage(
  path: string,
  publication: PublicationIndex,
  getDocument: (key: string) => CmxDocument | undefined,
  contentHash: string,
): ContentPage {
  const { site, routes, redirects } = publication
  const route = routes.find((route) => route.path === path)
  const key = route?.document ?? publication.notFound
  const document = getDocument(key)
  if (!isCmxDocument(document)) throw new Error(`Invalid CMX document: ${key}`)
  return { document, status: route ? 200 : 404, key, route, site, routes, redirects, contentHash }
}
export function createContentSource(
  documents: PublishedDocuments,
  revision = 'local',
): ContentLoader {
  const snapshot = structuredClone(documents)
  const publication = validatePublication(snapshot)
  return async (request) =>
    contentPage(new URL(request.url).pathname, publication, (key) => snapshot[key], revision)
}
