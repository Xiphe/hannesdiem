import { isCmxDocument, type CmxDocument } from '@cmx-tools/contracts'
import type { Identity, ImageSource, MediaImage } from '@hannesdiem/content-components'
import { notFoundEntry, pagePath } from './page-routing.ts'

export interface ContentRoute {
  path: string
  document: string
  title: string
  kind: string
  description?: string
  image?: ImageSource
  ogImage?: MediaImage
  theme?: string
  releaseDate?: string
  creationDate?: string
  noindex?: boolean
  nofollow?: boolean
  ogTitle?: string
  ogType?: string
  ogImageTitle?: string
  ogSubtitle?: string
  ogTextColor?: 'light' | 'dark'
  shareImage?: boolean
  updatedAt?: string
  musicians?: string[]
  songs?: string[]
  authors?: (Identity & { ogProfile?: string })[]
  profile?: { firstName: string; lastName: string }
  sourceId?: string
}

export type { MediaImage, PaletteColor } from '@hannesdiem/content-components'

export const siteEntry = '_site'
export const redirectsEntry = '_redirects'

export interface ContentRedirect {
  path: string
  to: string
  status: 307 | 308
  preserveSearch?: boolean
}

export interface NavigationLink {
  name: string
  href: string
}
export interface SocialLink {
  title: string
  href: string
  name: string
}
export interface SiteMetadata {
  version: 2
  media: Record<string, MediaImage>
  navigation: {
    sections: { name: string; items: NavigationLink[] }[]
    legal: { name: string; items: NavigationLink[] }
    social: SocialLink[]
    listen: SocialLink[]
  }
}
export type PublishedDocuments = Record<string, CmxDocument>

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
function safeUrl(value: unknown): value is string {
  if (typeof value !== 'string' || !value || value.trim() !== value) return false
  try {
    const url = new URL(value, 'https://hannesdiem.de')
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}
function contentPath(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\/(?!\/)[^?#]*$/.test(value) &&
    new URL(value, 'https://hannesdiem.de').pathname === value &&
    !/^(?:\/_|\/m(?:\/|$)|\/login(?:\/|$)|\/health$|\/sitemap\.xml$|\/robots\.txt$|\/assets(?:\/|$)|\/font(?:\/|$)|\/media(?:\/|$))/.test(
      value,
    ) &&
    !(value.length > 1 && value.endsWith('/'))
  )
}
function image(value: unknown): value is MediaImage {
  return (
    record(value) &&
    safeUrl(value.src) &&
    typeof value.width === 'number' &&
    value.width > 0 &&
    typeof value.height === 'number' &&
    value.height > 0 &&
    (value.srcSet === undefined ||
      (typeof value.srcSet === 'string' &&
        value.srcSet.split(',').every((part) => safeUrl(part.trim().split(/\s+/)[0]))))
  )
}

export function readSite(document: CmxDocument | undefined): SiteMetadata {
  const site = document?.content.site
  if (
    !record(site) ||
    site.version !== 2 ||
    'routes' in site ||
    'shareImages' in site ||
    'redirects' in site ||
    !record(site.media) ||
    !Object.values(site.media).every(image) ||
    !record(site.navigation)
  )
    throw new Error('Invalid site metadata')
  const navigation = site.navigation
  const links = (value: unknown, label: 'name' | 'title') =>
    Array.isArray(value) &&
    value.every(
      (item) =>
        record(item) &&
        typeof item[label] === 'string' &&
        safeUrl(item.href) &&
        (label !== 'title' || typeof item.name === 'string'),
    )
  if (
    !Array.isArray(navigation.sections) ||
    !navigation.sections.every(
      (section) =>
        record(section) && typeof section.name === 'string' && links(section.items, 'name'),
    ) ||
    !record(navigation.legal) ||
    typeof navigation.legal.name !== 'string' ||
    !links(navigation.legal.items, 'name') ||
    !links(navigation.social, 'title') ||
    !links(navigation.listen, 'title')
  )
    throw new Error('Invalid navigation metadata')
  return site as unknown as SiteMetadata
}

export interface PublicationIndex {
  site: SiteMetadata
  routes: ContentRoute[]
  notFound: string
  redirects: ContentRedirect[]
}

function validateRoutes({ routes, site, redirects }: PublicationIndex) {
  const paths = new Set<string>()
  for (const route of routes) {
    if (
      !record(route) ||
      !contentPath(route.path) ||
      paths.has(route.path) ||
      typeof route.document !== 'string' ||
      route.document === siteEntry ||
      typeof route.title !== 'string' ||
      typeof route.kind !== 'string' ||
      (route.image !== undefined &&
        (typeof route.image === 'string'
          ? !Object.hasOwn(site.media, route.image)
          : !image(route.image))) ||
      (route.ogImage !== undefined && !image(route.ogImage))
    )
      throw new Error('Invalid or duplicate content route')
    paths.add(route.path)
  }
  if (!Array.isArray(redirects)) throw new Error('Invalid redirects')
  for (const redirect of redirects) {
    if (
      !record(redirect) ||
      !contentPath(redirect.path) ||
      paths.has(redirect.path) ||
      !safeUrl(redirect.to) ||
      typeof redirect.status !== 'number' ||
      ![307, 308].includes(redirect.status) ||
      (redirect.preserveSearch !== undefined && typeof redirect.preserveSearch !== 'boolean')
    )
      throw new Error('Invalid or duplicate redirect')
    paths.add(redirect.path)
  }
}

// Read v1 during the rollout: the website deploys before the v2 content publication.
function legacyPublication(documents: PublishedDocuments): PublicationIndex {
  const legacy = documents[siteEntry].content.site as Record<string, unknown>
  const { routes, shareImages, redirects, ...globals } = legacy
  if (!Array.isArray(routes) || !record(shareImages) || !Object.values(shareImages).every(image))
    throw new Error('Invalid legacy site metadata')
  const site = readSite({
    ...documents[siteEntry],
    content: { site: { ...globals, version: 2 } },
  })
  return {
    site,
    routes: routes.map((route) => ({ ...route, ogImage: shareImages[route.path] })),
    notFound: '404',
    redirects: redirects as ContentRedirect[],
  }
}

// Validate the complete collection before publishing and before accepting it.
export function validatePublication(documents: PublishedDocuments): PublicationIndex {
  const rawSite = documents[siteEntry]?.content.site
  const publication: PublicationIndex =
    record(rawSite) && rawSite.version === 1
      ? legacyPublication(documents)
      : {
          site: readSite(documents[siteEntry]),
          notFound: notFoundEntry,
          redirects: documents[redirectsEntry]?.content.redirects as ContentRedirect[],
          routes: Object.entries(documents).flatMap(([entry, document]) => {
            const path = pagePath(entry)
            if (path === undefined) return []
            if (!isCmxDocument(document)) throw new Error(`Invalid CMX page: ${entry}`)
            const metadata = document.content.metadata ?? {}
            if (!record(metadata) || 'path' in metadata || 'document' in metadata)
              throw new Error(`Invalid page metadata: ${entry}`)
            return [
              {
                kind: 'page',
                title: document.content.title,
                ...metadata,
                path,
                document: entry,
              } as ContentRoute,
            ]
          }),
        }
  validateRoutes(publication)
  for (const key of [publication.notFound, ...publication.routes.map((route) => route.document)]) {
    const document = documents[key]
    if (
      !isCmxDocument(document) ||
      typeof document.content.title !== 'string' ||
      !Object.hasOwn(document.content, 'default')
    )
      throw new Error(`Missing or invalid page: ${key}`)
  }
  return publication
}
