import { isCmxDocument, type CmxDocument } from '@cmx-tools/contracts'
import { cmx } from '@cmx-tools/remix'
import { environment } from '../.cmx/environment.ts'
import { documents } from '../.generated/content.ts'
import routeData from '../.generated/routes.json' with { type: 'json' }
import type { ContentRoute } from '../content/types.ts'
import { getMedia } from './media.ts'
import { beachTheme, defaultTheme, paletteToTheme, type Theme } from './theme.ts'

export type { ContentRoute } from '../content/types.ts'

export const contentRoutes = routeData as ContentRoute[]
const pages = new Map(contentRoutes.map((route) => [route.path, route]))
export interface ContentPage {
  document: CmxDocument
  status: 200 | 404
  key: string
  route?: ContentRoute
}
export type ContentLoader = (request: Request) => Promise<ContentPage>
export const loadContent: ContentLoader = async (request) => {
  const route = pages.get(new URL(request.url).pathname)
  const key = route?.document ?? '404'
  const document = documents[key as keyof typeof documents]
  if (!isCmxDocument(document)) throw new Error(`Invalid CMX document: ${key}`)
  return { document, status: route ? 200 : 404, key, route }
}
export function renderContent(document: CmxDocument) {
  const page = cmx(document, environment)
  if (typeof page.title !== 'string') throw new Error('CMX page title must be a string')
  return { title: page.title, body: page.default }
}
export function contentTheme(route?: ContentRoute): Theme {
  if (route?.theme === 'beach') return beachTheme
  if (route?.theme === 'electrocute') return defaultTheme
  const image = route?.image ? getMedia(route.image) : undefined
  if (image?.palette?.length) return paletteToTheme(image.palette)
  return route?.path.startsWith('/one-week-album') ? beachTheme : defaultTheme
}
export type PageContent = ReturnType<typeof renderContent>
