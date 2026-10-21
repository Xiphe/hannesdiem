import { isCmxDocument, type CmxDocument } from '@cmx-tools/contracts'
import type { ContentRoute } from './content-route.ts'
import type { MediaImage } from './media.ts'

export const siteEntry = '_site'
export const publicationPath = '/_cmx/publication'
export const contentCacheTag = 'content'

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
  version: 1
  routes: ContentRoute[]
  media: Record<string, MediaImage>
  shareImages: Record<string, MediaImage>
  redirects: { path: string; to: string; status: 307 | 308; preserveSearch?: boolean }[]
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
    site.version !== 1 ||
    !Array.isArray(site.routes) ||
    !record(site.media) ||
    !Object.values(site.media).every(image) ||
    !record(site.shareImages) ||
    !Object.values(site.shareImages).every(image) ||
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
  const paths = new Set<string>()
  for (const route of site.routes) {
    if (
      !record(route) ||
      !contentPath(route.path) ||
      paths.has(route.path) ||
      typeof route.document !== 'string' ||
      route.document === siteEntry ||
      typeof route.title !== 'string' ||
      typeof route.kind !== 'string' ||
      (route.image !== undefined &&
        (typeof route.image !== 'string' || !Object.hasOwn(site.media, route.image)))
    ) {
      throw new Error('Invalid or duplicate content route')
    }
    paths.add(route.path)
  }
  if (!Array.isArray(site.redirects)) throw new Error('Invalid redirects')
  for (const redirect of site.redirects) {
    if (
      !record(redirect) ||
      !contentPath(redirect.path) ||
      paths.has(redirect.path) ||
      !safeUrl(redirect.to) ||
      typeof redirect.status !== 'number' ||
      ![307, 308].includes(redirect.status) ||
      (redirect.preserveSearch !== undefined && typeof redirect.preserveSearch !== 'boolean')
    ) {
      throw new Error('Invalid or duplicate redirect')
    }
    paths.add(redirect.path)
  }
  return site as unknown as SiteMetadata
}

// Run against the complete candidate collection inside the storage transaction.
export function validatePublication(documents: PublishedDocuments): SiteMetadata {
  const site = readSite(documents[siteEntry])
  for (const key of ['404', ...site.routes.map((route) => route.document)]) {
    const document = documents[key]
    if (
      !isCmxDocument(document) ||
      typeof document.content.title !== 'string' ||
      !Object.hasOwn(document.content, 'default')
    )
      throw new Error(`Missing or invalid page: ${key}`)
  }
  return site
}
