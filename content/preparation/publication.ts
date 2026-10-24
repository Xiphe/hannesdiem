import { CMX_DOCUMENT_SCHEMA, CMX_DOCUMENT_VERSION, type CmxDocument } from '@cmx-tools/contracts'
import { readFile, writeFile } from 'node:fs/promises'
import { navigation } from '../navigation.ts'
import { redirects } from '../redirects.ts'
import {
  siteEntry,
  redirectsEntry,
  validatePublication,
  type PublishedDocuments,
  type SiteMetadata,
} from '../../contracts/content.ts'
import { notFoundEntry } from '../../contracts/page-routing.ts'

const read = async (file: string) => JSON.parse(await readFile(file, 'utf8'))
const routes: import('../types.ts').ContentRoute[] = await read('.generated/routes.json')
const shareImages = await read('.generated/og.json')
const documents: PublishedDocuments = Object.fromEntries(
  await Promise.all(
    [notFoundEntry, ...routes.map((route) => route.document)].map(async (key) => {
      const document = await read(`.cmx/documents/${key}.json`)
      const route = routes.find((route) => route.document === key)
      if (route && shareImages[route.path])
        document.content.metadata.ogImage = shareImages[route.path]
      return [key, document]
    }),
  ),
)
if (Object.hasOwn(documents, siteEntry)) throw new Error('Reserved CMX entry: ' + siteEntry)
documents[siteEntry] = {
  $schema: CMX_DOCUMENT_SCHEMA,
  cmxVersion: CMX_DOCUMENT_VERSION,
  interface: { imports: {}, exports: { site: {} } },
  content: {
    site: {
      version: 2,
      media: {},
      navigation: navigation(routes),
    } satisfies SiteMetadata,
  },
} satisfies CmxDocument
documents[redirectsEntry] = {
  $schema: CMX_DOCUMENT_SCHEMA,
  cmxVersion: CMX_DOCUMENT_VERSION,
  interface: { imports: {}, exports: { redirects: {} } },
  content: {
    redirects: [...redirects].map(([path, destination]) => ({
      path,
      ...destination,
      ...(path === '/' ? { preserveSearch: true } : {}),
    })),
  },
} satisfies CmxDocument
validatePublication(documents)
await writeFile('.generated/publication.json', JSON.stringify(documents) + '\n')
console.log(`Prepared ${Object.keys(documents).length} CMX documents for publication.`)
