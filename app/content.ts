import { isCmxDocument, type CmxDocument, type CmxNode } from '@cmx-tools/contracts'
import { cmx } from '@cmx-tools/remix'
import { environment } from '../.cmx/environment.ts'
import type { ContentRoute } from '../content/types.ts'
import type { SiteMetadata } from './publication.ts'
import { getMedia } from './media.ts'
import { beachTheme, defaultTheme, paletteToTheme, type Theme } from './theme.ts'

export type { ContentRoute } from '../content/types.ts'

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
export function renderContent(document: CmxDocument) {
  const page = cmx<{ title: CmxNode; default: CmxNode }>(document, environment)
  if (typeof page.title !== 'string') throw new Error('CMX page title must be a string')
  return { title: page.title, body: page.default }
}
export function contentTheme(site: SiteMetadata, route?: ContentRoute): Theme {
  if (route?.theme === 'beach') return beachTheme
  if (route?.theme === 'electrocute') return defaultTheme
  const image = route?.image ? getMedia(site.media, route.image) : undefined
  if (image?.palette?.length) return paletteToTheme(image.palette)
  return route?.path.startsWith('/one-week-album') ? beachTheme : defaultTheme
}
export type PageContent = ReturnType<typeof renderContent>
