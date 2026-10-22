import type { CmxDocument, CmxNode } from '@cmx-tools/contracts'
import { cmx } from '@cmx-tools/remix'
import { environment } from '../../.cmx/environment.ts'
import type { ContentRoute, SiteMetadata } from '../../contracts/content.ts'
import { getMedia } from '../media.ts'
import { beachTheme, defaultTheme, paletteToTheme, type Theme } from '../theme.ts'

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
