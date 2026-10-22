import { isCmxDocument, type CmxDocument } from '@cmx-tools/contracts'
import {
  validatePublication,
  type ContentRoute,
  type SiteMetadata,
  type PublishedDocuments,
} from '../../contracts/content.ts'

export interface ContentPage {
  document: CmxDocument
  status: 200 | 404
  key: string
  route?: ContentRoute
  site: SiteMetadata
  contentHash: string
}
export type ContentLoader = (request: Request) => Promise<ContentPage>

export function contentPage(
  path: string,
  site: SiteMetadata,
  getDocument: (key: string) => CmxDocument | undefined,
  contentHash: string,
): ContentPage {
  const route = site.routes.find((route) => route.path === path)
  const key = route?.document ?? '404'
  const document = getDocument(key)
  if (!isCmxDocument(document)) throw new Error(`Invalid CMX document: ${key}`)
  return { document, status: route ? 200 : 404, key, route, site, contentHash }
}
export function createContentSource(
  documents: PublishedDocuments,
  revision = 'local',
): ContentLoader {
  const snapshot = structuredClone(documents)
  const site = validatePublication(snapshot)
  return async (request) =>
    contentPage(new URL(request.url).pathname, site, (key) => snapshot[key], revision)
}
